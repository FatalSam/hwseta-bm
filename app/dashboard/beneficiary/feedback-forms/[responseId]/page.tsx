'use client';

import { useParams } from 'next/navigation';
import BeneficiaryFeedbackFormDetail from '@/components/beneficiary/BeneficiaryFeedbackFormDetail';

export default function BeneficiaryFeedbackFormDetailPage() {
  const params = useParams();
  const responseId = typeof params.responseId === 'string' ? params.responseId : '';
  if (!responseId) {
    return <p className="px-4 py-8 text-sm text-slate-600">Invalid response.</p>;
  }
  return <BeneficiaryFeedbackFormDetail responseId={responseId} />;
}
