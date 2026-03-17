'use client';

interface Props {
  type: 'success' | 'error';
  message: string;
}

export default function InlineNotice({ type, message }: Props) {
  const styles =
    type === 'success'
      ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-300'
      : 'border-red-900/50 bg-red-950/20 text-red-300';

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${styles}`}
    >
      {message}
    </div>
  );
}