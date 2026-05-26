'use client';

import { Suspense } from 'react';
import FormFeedbackListAdmin from '@/components/admin/FormFeedbackListAdmin';

function FeedbackListFallback() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 text-sm text-slate-500">Loading feedback…</div>
  );
}

export default function AdminFormFeedbackPage() {
  return (
    <Suspense fallback={<FeedbackListFallback />}>
      <FormFeedbackListAdmin />
    </Suspense>
  );
}
