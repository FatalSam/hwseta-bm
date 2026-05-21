'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminProgrammesLegacyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/admin/programme-enrolments');
  }, [router]);

  return null;
}
