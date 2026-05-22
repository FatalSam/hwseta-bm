import LegalDocumentPage from '@/components/legal/LegalDocumentPage';
import TermsContent from '@/components/legal/TermsContent';

export default function TermsPage() {
  return (
    <LegalDocumentPage breadcrumbTitle="Terms" heading="Terms and Conditions of Use">
      <TermsContent />
    </LegalDocumentPage>
  );
}
