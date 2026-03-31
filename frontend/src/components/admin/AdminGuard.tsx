'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseJwt } from '@/utils/auth';

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.replace('/login');
      return;
    }

    const payload = parseJwt(token);

    if (!payload || payload.systemRole !== 'SUPER_ADMIN') {
      router.replace('/projects');
      return;
    }

    setAllowed(true);
  }, [router]);

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
