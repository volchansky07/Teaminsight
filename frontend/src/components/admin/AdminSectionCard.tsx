import { ReactNode } from 'react';

interface AdminSectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}

export default function AdminSectionCard({
  title,
  subtitle,
  children,
  action,
}: AdminSectionCardProps) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[#141414] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          {subtitle ? (
            <p className="mt-2 text-sm text-white/55">{subtitle}</p>
          ) : null}
        </div>

        {action ? <div>{action}</div> : null}
      </div>

      {children}
    </section>
  );
}