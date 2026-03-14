import db from '../models/db.js';
import { catchAsync } from '../utils/catchAsync.js';

export const getOrders = catchAsync(async (req: any, res: any) => {
  const { agentId } = req.query;
  let query = `
    SELECT o.*, u.name as clientName, u.phone as clientPhone, a.name as agentName, cr.name as courierName
    FROM orders o
    JOIN users u ON o.clientId = u.id
    LEFT JOIN users a ON o.agentId = a.id
    LEFT JOIN users cr ON o.courierId = cr.id
  `;
  let params: any[] = [];
  
  if (agentId) {
    query += " WHERE o.agentId = ?";
    params.push(agentId);
  }
  
  query += " ORDER BY o.createdAt DESC";
  
  const orders = await db.prepare(query).all(...params);
  
  const formattedOrders = await Promise.all(orders.map(async (o: any) => ({
    ...o,
    items: await db.prepare('SELECT oi.*, p.name as productName FROM order_items oi JOIN products p ON oi.productId = p.id WHERE oi.orderId = ?').all(o.id)
  })));
  res.json(formattedOrders);
});

export const createOrder = catchAsync(async (req: any, res: any) => {
  const { clientId, agentId, items, totalPrice, paymentType, location, latitude, longitude, dueDate } = req.body;
  await db.transaction(async () => {
    const info = await db.prepare('INSERT INTO orders (clientId, agentId, totalPrice, paymentType, location, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      clientId, agentId || null, totalPrice, paymentType, location, latitude || null, longitude || null
    );
    const orderId = info.lastInsertRowid;

    const nearestCourier = (await db.prepare(`
      SELECT courier_id, 
        (latitude - ?) * (latitude - ?) + (longitude - ?) * (longitude - ?) as dist
      FROM courier_locations
      ORDER BY dist ASC LIMIT 1
    `).get(latitude || 39.7747, latitude || 39.7747, longitude || 64.4286, longitude || 64.4286)) as any;

    if (nearestCourier && nearestCourier.courier_id) {
      await db.prepare('UPDATE orders SET courierId = ?, orderStatus = \'confirmed\' WHERE id = ?').run(nearestCourier.courier_id, orderId);
      const courier = await db.prepare("SELECT phone FROM users WHERE id = ?").get(nearestCourier.courier_id) as any;
      if (courier) {
        console.log(`[SMS] To ${courier.phone}: Вам назначен новый заказ #${orderId}. Пожалуйста, заберите его.`);

        // Telegram notification to Admin/Courier channel
        const botTokenObj = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get() as any;
        const chatIdObj = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_id'").get() as any;
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
      await db.prepare('INSERT INTO order_items (orderId, productId, quantity, price) VALUES (?, ?, ?, ?)').run(orderId, productId, item.quantity, item.price);
      await db.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?").run(item.quantity, productId);
    }

    if (paymentType === 'debt') {
      await db.prepare(`
        INSERT INTO debts (clientId, orderId, amount, dueDate, status) 
        VALUES (?, ?, ?, ?, 'pending')
      `).run(clientId, orderId, totalPrice, dueDate || null);
    }
  });
  res.json({ success: true, orderId: (res as any).orderId }); // orderId was missing in original res
});

export const updateOrder = catchAsync(async (req: any, res: any) => {
  const { courierId } = req.body;
  const data = { ...req.body };
  delete data.id; // Ensure we don't try to update the ID
  
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  if (keys.length > 0) {
    const setString = keys.map((k) => `${k} = ?`).join(", ");
    const query = `UPDATE orders SET ${setString} WHERE id = ?`;
    await db.prepare(query).run(...values, req.params.id);
  }

  if (courierId) {
    const courier = await db.prepare("SELECT phone, name FROM users WHERE id = ?").get(courierId) as any;
    if (courier) {
      console.log(`[SMS] To ${courier.phone}: Вам назначен новый заказ #${req.params.id}. Пожалуйста, заберите его.`);

      // Telegram notification
      const botTokenObj = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get() as any;
      const chatIdObj = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_id'").get() as any;
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
});

export const deleteOrder = catchAsync(async (req: any, res: any) => {
  await db.transaction(async () => {
    const order = await db.prepare('SELECT orderStatus FROM orders WHERE id = ?').get(req.params.id) as any;
    if (order && order.orderStatus !== 'delivered') {
      const items = await db.prepare('SELECT productId, quantity FROM order_items WHERE orderId = ?').all(req.params.id);
      for (const item of items as any) {
        await db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(item.quantity, item.productId);
      }
    }
    await db.prepare('DELETE FROM reviews WHERE orderId = ?').run(req.params.id);
    await db.prepare('DELETE FROM order_items WHERE orderId = ?').run(req.params.id);
    await db.prepare('DELETE FROM debts WHERE orderId = ?').run(req.params.id);
    await db.prepare("DELETE FROM orders WHERE id = ?").run(req.params.id);
  });
  res.json({ success: true });
});

export const uploadInvoice = catchAsync(async (req: any, res: any) => {
  const imageUrl = `/uploads/proofs/${req.file?.filename}`;
  await db.prepare('UPDATE orders SET invoicePhoto = ? WHERE id = ?').run(imageUrl, req.params.id);
  res.json({ success: true, imageUrl });
});
