'use client';

import { useAuthStore } from '@/store/authStore';
import { useParams } from 'next/navigation';
import { EditFormClient } from './EditFormClient';

export default function EditAdminFormPage() {
  const params = useParams();
  const formId = typeof params.formId === 'string' ? params.formId : '';
  const { token } = useAuthStore();

  if (!formId) {
    return <div className="p-6">Invalid form.</div>;
  }

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-[1200px] px-2 py-2 lg:px-4">
        <EditFormClient formId={formId} token={token} />
      </div>
    </div>
  );
}
