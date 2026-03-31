interface AdminStatCardProps {
  label: string;
  value: number | string;
  description?: string;
  accentClass?: string;
}

export default function AdminStatCard({
  label,
  value,
  description,
  accentClass = 'text-white',
}: AdminStatCardProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#141414] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      <p className="text-[12px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </p>
      <div className={`mt-4 text-5xl font-semibold leading-none ${accentClass}`}>
        {value}
      </div>
      {description ? (
        <p className="mt-4 text-sm leading-relaxed text-white/55">{description}</p>
      ) : null}
    </div>
  );
}