'use client';

interface Props {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmActionModal({
  isOpen,
  title,
  description,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  if (!isOpen) return null;

  const confirmClass =
    confirmVariant === 'danger'
      ? 'border-red-900/50 bg-red-950/30 text-red-300 hover:bg-red-900/30'
      : 'border-sky-900/50 bg-sky-950/30 text-sky-300 hover:bg-sky-900/30';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[30px] border border-white/10 bg-[#141414] p-7 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
        <p className="text-xs uppercase tracking-[0.22em] text-white/40">
          ПОДТВЕРЖДЕНИЕ ДЕЙСТВИЯ
        </p>

        <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>

        <p className="mt-4 text-lg leading-relaxed text-white/60">
          {description}
        </p>

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-[18px] border border-white/10 bg-white/5 px-5 py-3 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-[18px] border px-6 py-3 font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${confirmClass}`}
          >
            {loading ? 'Выполнение...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}