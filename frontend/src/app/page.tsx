import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">TeamInsight</h1>
        <Link href="/projects" className="text-blue-400 underline">
          Перейти к проектам
        </Link>
      </div>
    </div>
  );
}