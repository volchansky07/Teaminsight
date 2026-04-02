'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';

export default function ForceChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (newPassword.trim() !== confirmPassword.trim()) {
      setError('Новый пароль и подтверждение не совпадают');
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/auth/change-password', {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });

      const accessToken = response.data.accessToken;
      const refreshToken = response.data.refreshToken;
      const user = response.data.user;

      localStorage.setItem('token', accessToken);

      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      if (user.systemRole === 'SUPER_ADMIN') {
        router.replace('/admin/dashboard');
        return;
      }

      router.replace('/projects');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Не удалось изменить пароль',
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
            <h1 className="text-4xl font-bold tracking-tight">
              Смена пароля
            </h1>
            <p className="text-neutral-400 mt-3">
              Для продолжения работы необходимо установить новый постоянный
              пароль.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Текущий временный пароль
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Введите временный пароль"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Новый пароль
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Введите новый пароль"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Подтверждение пароля
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите новый пароль"
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
              {loading ? 'Сохранение...' : 'Сменить пароль'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}