import BeneficiaryProfilePage from '@/components/beneficiary-profile/BeneficiaryProfilePage';

export default async function AdminBeneficiaryEditPage({
  params,
}: {
  params: Promise<{ beneficiaryId: string }>;
}) {
  const { beneficiaryId } = await params;
  return <BeneficiaryProfilePage adminMode adminBeneficiaryId={beneficiaryId} />;
}
