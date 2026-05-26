'use client';

import { useParams } from 'next/navigation';
import FormFeedbackDetailAdmin from '@/components/admin/FormFeedbackDetailAdmin';

export default function AdminFormFeedbackDetailPage() {
  const params = useParams();
  const responseId = typeof params.responseId === 'string' ? params.responseId : '';
  if (!responseId) {
    return (
      <p className="px-4 py-8 text-sm text-slate-600">Invalid response.</p>
    );
  }
  return <FormFeedbackDetailAdmin responseId={responseId} />;
}
