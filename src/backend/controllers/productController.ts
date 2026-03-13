import db from '../models/db.js';

export const getProducts = async (req: any, res: any) => {
  const products = await db.prepare("SELECT * FROM products").all();
  const productsWithImages = await Promise.all(products.map(async (p: any) => ({
    ...p,
    images: (await db.prepare('SELECT imageUrl FROM product_images WHERE productId = ?').all(p.id)).map((img: any) => img.imageUrl)
  })));
  res.json(productsWithImages);
};

export const createProduct = async (req: any, res: any) => {
  const { name, price, costPrice, discountPrice, categoryId, image, images, videoUrl, description, stock } = req.body;
  try {
    let productId;
    await db.transaction(async () => {
      const info = await db.prepare('INSERT INTO products (name, price, costPrice, discountPrice, categoryId, image, videoUrl, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        name, price, costPrice || 0, discountPrice || null, categoryId || null, image || null, videoUrl || null, description || null, stock || 0
      );
      productId = info.lastInsertRowid;

      if (images && Array.isArray(images)) {
        for (const img of images) {
          await db.prepare('INSERT INTO product_images (productId, imageUrl) VALUES (?, ?)').run(productId, img);
        }
      } else if (image) {
        await db.prepare('INSERT INTO product_images (productId, imageUrl) VALUES (?, ?)').run(productId, image);
      }
    });
    res.json({ id: productId });
  } catch (e) {
    res.status(500).json({ error: (e as any).message });
  }
};

export const updateProduct = async (req: any, res: any) => {
  const { images, ...rest } = req.body;
  const keys = Object.keys(rest);
  const values = Object.values(rest);

  try {
    await db.transaction(async () => {
      if (keys.length > 0) {
        // Remove potentially problematic symbols from keys for safety in local SQLite
        const setString = keys.map((k) => `${k} = ?`).join(", ");
        const query = `UPDATE products SET ${setString} WHERE id = ?`;
        await db.prepare(query).run(...values, req.params.id);
      }

      if (images && Array.isArray(images)) {
        await db.prepare('DELETE FROM product_images WHERE productId = ?').run(req.params.id);
        for (const img of images) {
          await db.prepare('INSERT INTO product_images (productId, imageUrl) VALUES (?, ?)').run(req.params.id, img);
        }
      }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: (e as any).message });
  }
};

export const deleteProduct = async (req: any, res: any) => {
  await db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ success: true });
};
