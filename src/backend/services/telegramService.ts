import fetch from 'node-fetch';
import Database from 'better-sqlite3';

export class TelegramService {
    constructor(private db: Database.Database) { }

    async sendAd(message: string, photoUrl?: string) {
        const token = this.getSetting('telegram_bot_token');
        const chatId = this.getSetting('telegram_chat_id');

        if (!token || !chatId) {
            throw new Error('Telegram bot token or chat ID not configured');
        }

        const baseUrl = `https://api.telegram.org/bot${token}`;

        try {
            if (photoUrl) {
                // If it's a local path, we might need to handle it differently, 
                // but for now assuming it's a URL or accessible path
                const response = await fetch(`${baseUrl}/sendPhoto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        photo: photoUrl,
                        caption: message,
                        parse_mode: 'HTML'
                    })
                });
                return await response.json();
            } else {
                const response = await fetch(`${baseUrl}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'HTML'
                    })
                });
                return await response.json();
            }
        } catch (error) {
            console.error('Telegram send failed:', error);
            throw error;
        }
    }

    private getSetting(key: string): string | null {
        const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
        return row ? row.value : null;
    }
}
