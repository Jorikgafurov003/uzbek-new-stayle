const API_URL = ''; // Same origin

export class ApiService {
    static get token() {
        return localStorage.getItem('token');
    }

    static async request(endpoint: string, options: any = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
            ...options.headers
        };

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API Request failed');
        }

        return response.json();
    }

    static get(endpoint: string) {
        return this.request(endpoint, { method: 'GET' });
    }

    static post(endpoint: string, data: any) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static put(endpoint: string, data: any) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static delete(endpoint: string) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}
