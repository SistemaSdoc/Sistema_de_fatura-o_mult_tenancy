// app/landlord/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from "@/services/axios";// instância axios com withCredentials

export default function LandlordRegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            // Obter CSRF (se necessário)
            await api.get('/sanctum/csrf-cookie');
            const response = await api.post('/api/landlord/register', form);
            setSuccess('Registo efetuado com sucesso! Redirecionando...');
            setTimeout(() => {
                router.push('/landlord/login');
            }, 2000);
        } catch (err: any) {
            const message = err.response?.data?.message || 'Erro ao registar';
            const errors = err.response?.data?.errors;
            if (errors) {
                const firstError = (Object.values(errors)[0] as string[])?.[0];
                setError(firstError || message);
            } else {
                setError(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow-md">
                <h1 className="text-2xl font-bold text-center text-gray-800">Registo Super Admin</h1>
                {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">{success}</div>}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nome</label>
                    <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="mt-1 w-full rounded-md border border-gray-300 p-2"
                        required
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className="mt-1 w-full rounded-md border border-gray-300 p-2"
                        required
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        className="mt-1 w-full rounded-md border border-gray-300 p-2"
                        required
                        disabled={isLoading}
                        minLength={8}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Confirmar Password</label>
                    <input
                        type="password"
                        name="password_confirmation"
                        value={form.password_confirmation}
                        onChange={handleChange}
                        className="mt-1 w-full rounded-md border border-gray-300 p-2"
                        required
                        disabled={isLoading}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-md bg-green-600 py-2 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                    {isLoading ? 'A registar...' : 'Registar'}
                </button>
                <p className="text-center text-sm text-gray-600">
                    Já tem conta?{' '}
                    <Link href="/landlord/login" className="text-blue-600 hover:underline">
                        Faça login
                    </Link>
                </p>
            </form>
        </div>
    );
}