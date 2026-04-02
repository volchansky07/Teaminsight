'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);

      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');

      const res = await api.post('/auth/login', {
        email: email.trim(),
        password: password.trim(),
      });

      const accessToken = res.data.accessToken as string | undefined;
      const refreshToken = res.data.refreshToken as string | undefined;
      const user = res.data.user;

      if (!accessToken || !user) {
        throw new Error('Invalid login response');
      }

      localStorage.setItem('token', accessToken);

      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      if (user.mustChangePassword) {
        router.push('/force-change-password');
        return;
      }

      if (user.systemRole === 'SUPER_ADMIN') {
        router.push('/admin/dashboard');
        return;
      }

      router.push('/projects');
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Неверный email или пароль',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
          <div className="mb-8">
            <p className="text-neutral-500 text-sm uppercase tracking-[0.2em] mb-3">
              TeamInsight
            </p>
            <h1 className="text-4xl font-bold tracking-tight">С возвращением!</h1>
            <p className="text-neutral-400 mt-3">
              Войдите, чтобы управлять проектами, задачами и аналитикой.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Введите email"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black px-5 py-3 rounded-2xl font-medium hover:bg-neutral-200 transition disabled:opacity-60"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}