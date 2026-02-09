// src/services/auth.ts
import api from "./axios";

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'operador' | 'contablista';
}

export const authService = {
    async getMe(): Promise<User> {
        const response = await api.get('/api/me');
        return response.data.user; // Acessa diretamente o user da resposta
    },

    async updateUltimoLogin(userId: string): Promise<void> {
        await api.post(`/api/users/${userId}/ultimo-login`);
    }
};