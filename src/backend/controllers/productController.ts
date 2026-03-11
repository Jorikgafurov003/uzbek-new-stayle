import db from '../models/db.js';

export const getProducts = (req, res) => {
  const products = db.prepare("SELECT * FROM products").all();
  const productsWithImages = products.map((p: any) => ({
    ...p,
    images: db.prepare("SELECT imageUrl FROM product_images WHERE productId = ?").all(p.id).map((img: any) => img.imageUrl)
  }));
  res.json(productsWithImages);
};

export const createProduct = (req, res) => {
  const { name, price, costPrice, discountPrice, categoryId, image, images, videoUrl, description, stock } = req.body;
  try {
    const result = db.transaction(() => {
      const info = db.prepare("INSERT INTO products (name, price, costPrice, discountPrice, categoryId, image, videoUrl, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        name, price, costPrice || 0, discountPrice || null, categoryId || null, image || null, videoUrl || null, description || null, stock || 0
      );
      const productId = info.lastInsertRowid;

      if (images && Array.isArray(images)) {
        const stmt = db.prepare("INSERT INTO product_images (productId, imageUrl) VALUES (?, ?)");
        images.forEach(img => stmt.run(productId, img));
      } else if (image) {
        db.prepare("INSERT INTO product_images (productId, imageUrl) VALUES (?, ?)").run(productId, image);
      }

      return productId;
    })();
    res.json({ id: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const updateProduct = (req, res) => {
  const { images, ...rest } = req.body;
  const updates = Object.entries(rest).map(([k, v]) => `${k} = ?`).join(", ");
  try {
    db.transaction(() => {
      if (updates) {
        db.prepare(`UPDATE products SET ${updates} WHERE id = ?`).run(...Object.values(rest), req.params.id);
      }

      if (images && Array.isArray(images)) {
        db.prepare("DELETE FROM product_images WHERE productId = ?").run(req.params.id);
        const stmt = db.prepare("INSERT INTO product_images (productId, imageUrl) VALUES (?, ?)");
        images.forEach(img => stmt.run(req.params.id, img));
      }
    })();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteProduct = (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ success: true });
};
