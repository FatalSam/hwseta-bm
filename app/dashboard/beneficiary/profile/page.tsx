import { Suspense } from "react";
import BeneficiaryProfilePage from "@/components/beneficiary-profile/BeneficiaryProfilePage";

export default function MyProfileRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">Loading profile…</div>
      }
    >
      <BeneficiaryProfilePage />
    </Suspense>
  );
}
