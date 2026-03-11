import db from '../models/db.js';

export const getOrders = (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, u.name as clientName, u.phone as clientPhone, a.name as agentName, cr.name as courierName
    FROM orders o
    JOIN users u ON o.clientId = u.id
    LEFT JOIN users a ON o.agentId = a.id
    LEFT JOIN users cr ON o.courierId = cr.id
    ORDER BY o.createdAt DESC
  `).all();
  res.json(orders.map((o: any) => ({
    ...o,
    items: db.prepare("SELECT oi.*, p.name as productName FROM order_items oi JOIN products p ON oi.productId = p.id WHERE oi.orderId = ?").all(o.id)
  })));
};

export const createOrder = (req, res) => {
  const { clientId, agentId, items, totalPrice, paymentType, location, latitude, longitude } = req.body;
  try {
    db.transaction(() => {
      const info = db.prepare("INSERT INTO orders (clientId, agentId, totalPrice, paymentType, location, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        clientId, agentId || null, totalPrice, paymentType, location, latitude || null, longitude || null
      );
      const orderId = info.lastInsertRowid;

      const nearestCourier = db.prepare(`
        SELECT courier_id, 
          (latitude - ?) * (latitude - ?) + (longitude - ?) * (longitude - ?) as dist
        FROM courier_locations
        ORDER BY dist ASC LIMIT 1
      `).get(latitude || 39.7747, latitude || 39.7747, longitude || 64.4286, longitude || 64.4286);

      if (nearestCourier) {
        db.prepare("UPDATE orders SET courierId = ?, orderStatus = 'confirmed' WHERE id = ?").run(nearestCourier.courier_id, orderId);
        const courier = db.prepare("SELECT phone FROM users WHERE id = ?").get(nearestCourier.courier_id);
        if (courier) {
          console.log(`[SMS] To ${courier.phone}: Вам назначен новый заказ #${orderId}. Пожалуйста, заберите его.`);

          // Telegram notification to Admin/Courier channel
          const botToken = db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get()?.value;
          const chatId = db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_id'").get()?.value;
          if (botToken && chatId) {
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🚀 <b>Новый заказ #${orderId} автоматически назначен</b>\nКурьер: ${courier.phone}\nСумма: ${totalPrice.toLocaleString()} сум`,
                parse_mode: 'HTML'
              })
            }).catch(e => console.error("Telegram notification failed:", e));
          }
        }
      }

      items.forEach((item: any) => {
        const productId = item.id || item.productId;
        db.prepare("INSERT INTO order_items (orderId, productId, quantity, price) VALUES (?, ?, ?, ?)").run(orderId, productId, item.quantity, item.price);
        db.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?").run(item.quantity, productId);
      });

      res.json({ id: orderId });
    })();
  } catch (e) {
    console.error("Order creation failed:", e);
    res.status(500).json({ error: e.message });
  }
};

export const updateOrder = (req, res) => {
  const { courierId } = req.body;
  const updates = Object.entries(req.body).map(([k, v]) => `${k} = ?`).join(", ");
  try {
    db.prepare(`UPDATE orders SET ${updates} WHERE id = ?`).run(...Object.values(req.body), req.params.id);

    if (courierId) {
      const courier = db.prepare("SELECT phone, name FROM users WHERE id = ?").get(courierId);
      if (courier) {
        console.log(`[SMS] To ${courier.phone}: Вам назначен новый заказ #${req.params.id}. Пожалуйста, заберите его.`);

        // Telegram notification
        const botToken = db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get()?.value;
        const chatId = db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_id'").get()?.value;
        if (botToken && chatId) {
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🚚 <b>Заказ #${req.params.id} назначен вручную</b>\nКурьер: ${courier.name} (${courier.phone})`,
              parse_mode: 'HTML'
            })
          }).catch(e => console.error("Telegram notification failed:", e));
        }
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteOrder = (req, res) => {
  try {
    db.transaction(() => {
      const order = db.prepare("SELECT orderStatus FROM orders WHERE id = ?").get(req.params.id);
      if (order && order.orderStatus !== 'delivered') {
        const items = db.prepare("SELECT productId, quantity FROM order_items WHERE orderId = ?").all(req.params.id);
        items.forEach((item: any) => {
          db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(item.quantity, item.productId);
        });
      }
      db.prepare("DELETE FROM order_items WHERE orderId = ?").run(req.params.id);
      db.prepare("DELETE FROM debts WHERE orderId = ?").run(req.params.id);
      db.prepare("DELETE FROM orders WHERE id = ?").run(req.params.id);
    })();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const uploadInvoice = (req, res) => {
  const imageUrl = `/uploads/proofs/${req.file?.filename}`;
  db.prepare("UPDATE orders SET invoicePhoto = ? WHERE id = ?").run(imageUrl, req.params.id);
  res.json({ success: true, imageUrl });
};
