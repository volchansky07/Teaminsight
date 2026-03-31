'use client';

import { useState } from 'react';
import api from '@/services/api';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateOrganizationModal({
  isOpen,
  onClose,
  onCreated,
}: CreateOrganizationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      await api.post('/admin/organizations', {
        name,
        description,
      });

      setName('');
      setDescription('');
      onCreated();
      onClose();
    } catch (error) {
      console.error('Ошибка создания организации:', error);
      alert('Не удалось создать организацию.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#141414] p-6 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white">Создать организацию</h2>
          <p className="mt-2 text-sm text-white/55">
            Добавьте новую организацию для дальнейшего управления пользователями и проектами.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-white/50">Название</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
              placeholder="Например, ООО Альфа"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/50">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25 resize-none"
              placeholder="Краткое описание организации"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-white px-5 py-3 font-medium text-black transition hover:bg-neutral-200 disabled:opacity-60"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}