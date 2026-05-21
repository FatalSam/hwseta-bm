'use client';

import { useParams } from 'next/navigation';
import FormSubmissionDetailAdmin from '@/components/admin/FormSubmissionDetailAdmin';

export default function AdminFormSubmissionDetailPage() {
  const params = useParams();
  const distributionId =
    typeof params.distributionId === 'string' ? params.distributionId : '';
  if (!distributionId) {
    return (
      <p className="px-4 py-8 text-sm text-slate-600">Invalid distribution.</p>
    );
  }
  return <FormSubmissionDetailAdmin distributionId={distributionId} />;
}
