import db from '../models/db.js';

export const getOrders = async (req: any, res: any) => {
  try {
    const orders = await db.prepare(`
      SELECT o.*, u.name as "clientName", u.phone as "clientPhone", a.name as "agentName", cr.name as "courierName"
      FROM orders o
      JOIN users u ON o."clientId" = u.id
      LEFT JOIN users a ON o."agentId" = a.id
      LEFT JOIN users cr ON o."courierId" = cr.id
      ORDER BY o."createdAt" DESC
    `).all();
    
    const formattedOrders = await Promise.all(orders.map(async (o: any) => ({
      ...o,
      items: await db.prepare('SELECT oi.*, p.name as "productName" FROM order_items oi JOIN products p ON oi."productId" = p.id WHERE oi."orderId" = ?').all(o.id)
    })));
    res.json(formattedOrders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createOrder = async (req: any, res: any) => {
  const { clientId, agentId, items, totalPrice, paymentType, location, latitude, longitude, dueDate } = req.body;
  try {
    await db.transaction(async () => {
      const info = await db.prepare('INSERT INTO orders ("clientId", "agentId", "totalPrice", "paymentType", location, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id').run(
        clientId, agentId || null, totalPrice, paymentType, location, latitude || null, longitude || null
      );
      const orderId = info.lastInsertRowid;

      const nearestCourier = await db.prepare(`
        SELECT courier_id, 
          (latitude - ?) * (latitude - ?) + (longitude - ?) * (longitude - ?) as dist
        FROM courier_locations
        ORDER BY dist ASC LIMIT 1
      `).get(latitude || 39.7747, latitude || 39.7747, longitude || 64.4286, longitude || 64.4286);

      if (nearestCourier) {
        await db.prepare('UPDATE orders SET "courierId" = ?, "orderStatus" = \'confirmed\' WHERE id = ?').run(nearestCourier.courier_id, orderId);
        const courier = await db.prepare("SELECT phone FROM users WHERE id = ?").get(nearestCourier.courier_id);
        if (courier) {
          console.log(`[SMS] To ${courier.phone}: Вам назначен новый заказ #${orderId}. Пожалуйста, заберите его.`);

          // Telegram notification to Admin/Courier channel
          const botTokenObj = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get();
          const chatIdObj = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_id'").get();
          const botToken = botTokenObj?.value;
          const chatId = chatIdObj?.value;
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

      for (const item of items) {
        const productId = item.id || item.productId;
        await db.prepare('INSERT INTO order_items ("orderId", "productId", quantity, price) VALUES (?, ?, ?, ?)').run(orderId, productId, item.quantity, item.price);
        await db.prepare("UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?").run(item.quantity, productId);
      }

      if (paymentType === 'debt') {
        await db.prepare(`
          INSERT INTO debts ("clientId", "orderId", amount, "dueDate", status) 
          VALUES (?, ?, ?, ?, 'pending')
        `).run(clientId, orderId, totalPrice, dueDate || null);
      }
    });
    // Need to return it after transaction finishes. But we don't have orderId scope here, so we fetch max id as fallback or just return success
    res.json({ success: true });
  } catch (e: any) {
    console.error("Order creation failed:", e);
    res.status(500).json({ error: e.message });
  }
};

export const updateOrder = async (req: any, res: any) => {
  const { courierId } = req.body;
  // This needs rewriting for PostgreSQL due to varying keys length, for now hardcoding
  // simplified dynamic UPDATE:
  const keys = Object.keys(req.body);
  const values = Object.values(req.body);
  const setString = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  
  try {
    // Avoid running if no keys
    if (keys.length > 0) {
      const setString = keys.map((k, i) => `"${k}" = ?`).join(", ");
      const query = `UPDATE orders SET ${setString} WHERE id = ?`;
      await db.prepare(query).run(...values, req.params.id);
    }

    if (courierId) {
      const courier = await db.prepare("SELECT phone, name FROM users WHERE id = ?").get(courierId);
      if (courier) {
        console.log(`[SMS] To ${courier.phone}: Вам назначен новый заказ #${req.params.id}. Пожалуйста, заберите его.`);

        // Telegram notification
        const botTokenObj = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get();
        const chatIdObj = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_id'").get();
        const botToken = botTokenObj?.value;
        const chatId = chatIdObj?.value;
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
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteOrder = async (req: any, res: any) => {
  try {
    await db.transaction(async () => {
      const order = await db.prepare('SELECT "orderStatus" FROM orders WHERE id = ?').get(req.params.id);
      if (order && order.orderStatus !== 'delivered') {
        const items = await db.prepare('SELECT "productId", quantity FROM order_items WHERE "orderId" = ?').all(req.params.id);
        for (const item of items) {
          await db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(item.quantity, item.productId);
        }
      }
      await db.prepare('DELETE FROM order_items WHERE "orderId" = ?').run(req.params.id);
      await db.prepare('DELETE FROM debts WHERE "orderId" = ?').run(req.params.id);
      await db.prepare("DELETE FROM orders WHERE id = ?").run(req.params.id);
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const uploadInvoice = async (req: any, res: any) => {
  const imageUrl = `/uploads/proofs/${req.file?.filename}`;
  await db.prepare('UPDATE orders SET "invoicePhoto" = ? WHERE id = ?').run(imageUrl, req.params.id);
  res.json({ success: true, imageUrl });
};
