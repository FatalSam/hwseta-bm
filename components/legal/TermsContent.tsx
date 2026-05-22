import { FaEnvelope } from 'react-icons/fa';
import { LegalContactEmail, LegalList, LegalSection } from '@/components/legal/LegalDocumentPage';

const CONTACT_EMAIL = 'hwseta@hwseta.org.za';
const PORTAL_NAME = 'HWSETA Beneficiary Hub';

export default function TermsContent() {
  return (
    <>
      <LegalSection title="Introduction">
        <p>
          Welcome to the {PORTAL_NAME}. These terms and conditions outline the rules and regulations for accessing and
          using our platform services. By accessing our platform services, you agree to comply with these terms. If you
          do not agree with these terms, please refrain from using our platform services.
        </p>
      </LegalSection>

      <LegalSection title="1. Access and Use">
        <p>Users are granted access to our platform services for personal beneficiary use only. This access is limited to:</p>
        <LegalList
          items={[
            'Retrieving information from HWSETA beneficiary portal services;',
            'Saving a local copy for personal reference or printing;',
            'Creating links to our services for personal use.',
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Prohibited Actions">
        <p>You are expressly prohibited from:</p>
        <LegalList
          items={[
            'Modifying, copying, or distributing portal services and their contents, including text and graphics, without explicit permission;',
            'Using our services for any unlawful purpose or in a way that violates any applicable laws;',
            'Misrepresenting yourself or your affiliation with HWSETA;',
            'Attempting to gain unauthorised access to other beneficiary accounts or system data.',
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Disclaimer">
        <p>
          While we strive to provide accurate information, HWSETA and its service providers are not liable for any loss
          or damage resulting from the use of or reliance on the information provided. Any mention of third-party
          services or products is for informational purposes only and does not constitute an endorsement.
        </p>
      </LegalSection>

      <LegalSection title="4. Contact Information">
        <p>If you have any questions or concerns, please feel free to contact us:</p>
        <p className="flex items-center gap-2">
          <FaEnvelope className="h-4 w-4 text-hwseta-green" aria-hidden />
          <LegalContactEmail email={CONTACT_EMAIL} />
        </p>
      </LegalSection>

      <LegalSection title="5. Changes to Terms">
        <p>
          HWSETA reserves the right to change these terms and conditions at any time. Users are responsible for
          reviewing the terms periodically to stay informed. Continued use of the portal after changes constitutes
          acceptance of the updated terms.
        </p>
      </LegalSection>

      <LegalSection title="6. Service Availability">
        <p>
          HWSETA reserves the right to modify, suspend, or terminate its services at any time. We do not guarantee
          uninterrupted availability of our services.
        </p>
      </LegalSection>

      <LegalSection title="7. Copyright">
        <p>
          © HWSETA Beneficiary Hub. All rights reserved. This document, its contents, and our services are protected by
          copyright law. Any unauthorised use or reproduction is strictly prohibited.
        </p>
      </LegalSection>

      <LegalSection title="Closing Statement">
        <p>
          Thank you for using the {PORTAL_NAME}. Your use of our services signifies your acceptance of these terms and
          conditions.
        </p>
        <p className="text-sm italic text-slate-600">
          <strong>Legal Notice:</strong> This document is legally binding and constitutes an agreement between the user
          and HWSETA in relation to use of the beneficiary portal.
        </p>
      </LegalSection>
    </>
  );
}
