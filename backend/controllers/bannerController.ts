import db from "../database/database.js";

export const getAllBanners = async (req: any, res: any) => {
    try {
        const banners = db.prepare("SELECT * FROM banners WHERE active = 1").all();
        res.json(banners);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const createBanner = async (req: any, res: any) => {
    const { title, image, link } = req.body;
    try {
        const result = db.prepare(`
            INSERT INTO banners (title, image, link) 
            VALUES (?, ?, ?)
        `).run(title || null, image, link || null);
        res.json({ id: result.lastInsertRowid });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

export const deleteBanner = async (req: any, res: any) => {
    try {
        db.prepare("DELETE FROM banners WHERE id = ?").run(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
