'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Old URL: framework tabs now live under Programmes Setup. */
export default function AdminProgrammesFrameworkPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/admin/setup/programmes-setup');
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-slate-600">
      Redirecting to Programmes Setup…
    </div>
  );
}
