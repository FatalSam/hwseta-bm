'use client';

import { FaCheckCircle, FaDatabase, FaEdit, FaEnvelope, FaLock, FaShareAlt, FaShieldAlt, FaTrashAlt, FaUserShield } from "react-icons/fa";

const sections = [
  {
    number: 1,
    title: "Beneficiary Registration and Profile Information",
    icon: FaUserShield,
    content:
      "When you register on the HWSETA Beneficiary Portal, you agree to provide accurate, complete, and up-to-date information. You are responsible for keeping your login details secure and for reviewing your profile information before submission.",
  },
  {
    number: 2,
    title: "Use of Personal Information",
    icon: FaDatabase,
    content:
      "Your personal information is collected and stored so that HWSETA can process your profile, assess beneficiary-related requests, and improve service delivery. Information submitted through the portal may be retained for administrative, reporting, compliance, and support purposes.",
  },
  {
    number: 3,
    title: "Information Sharing",
    icon: FaShareAlt,
    content:
      "HWSETA may share your information with authorised internal teams, approved partners, training providers, employers, funders, or other relevant stakeholders where required to support the services, programmes, or opportunities linked to your profile.",
  },
  {
    number: 4,
    title: "Data Security",
    icon: FaLock,
    content:
      "We apply reasonable technical and administrative safeguards to protect your information against unauthorised access, misuse, loss, or disclosure. While every reasonable effort is made to secure your data, no internet-based service can guarantee absolute security.",
  },
  {
    number: 5,
    title: "Access, Review, and Correction",
    icon: FaTrashAlt,
    content:
      "You may request access to the information held about you, and you may request corrections where information is inaccurate or incomplete. Portal users are expected to keep their own details accurate and updated wherever possible.",
  },
  {
    number: 6,
    title: "Changes to These Terms",
    icon: FaEdit,
    content:
      "HWSETA may update these Terms and Conditions from time to time. Continued use of the portal after such updates means you accept the latest version that applies at the time of submission.",
  },
  {
    number: 7,
    title: "Contact Information",
    icon: FaEnvelope,
    content:
      "If you have questions about these Terms and Conditions or about how your information is handled, please contact HWSETA using the official details below.",
    email: "hwseta@hwseta.org.za",
  },
];

export default function BeneficiaryTermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-[#017f3f]/10 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="rounded-t-3xl bg-[linear-gradient(135deg,rgba(1,127,63,0.96)_0%,rgba(216,25,32,0.92)_55%,rgba(254,202,7,0.92)_100%)] px-6 py-8 text-white sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                <FaShieldAlt className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Beneficiary Terms and Conditions</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/90 sm:text-base">
                  Please read these terms carefully before agreeing and submitting your beneficiary profile details.
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <div className="mb-8 rounded-2xl border border-[#feca07]/40 bg-[#feca07]/10 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#9a6700] shadow-sm">
                  <FaCheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Important</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    By signing your profile submission, you confirm that the information you provide is correct and
                    that you accept these Terms and Conditions for use of the HWSETA Beneficiary Portal.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <section
                    key={section.number}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#017f3f]/20"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#017f3f_0%,#015c2e_100%)] text-white shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#017f3f]/10 text-sm font-bold text-[#017f3f]">
                            {section.number}
                          </span>
                          <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                        </div>
                        <p className="text-sm leading-6 text-slate-700">{section.content}</p>
                        {section.email && (
                          <a
                            href={`mailto:${section.email}`}
                            className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-[#017f3f] transition hover:border-[#017f3f]/30 hover:bg-[#017f3f]/5"
                          >
                            <FaEnvelope className="h-4 w-4" />
                            {section.email}
                          </a>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.close();
                  }
                }}
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#017f3f] hover:text-[#017f3f]"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
