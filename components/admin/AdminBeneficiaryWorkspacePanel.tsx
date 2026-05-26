'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import BeneficiaryComplaintsClient from '@/components/beneficiary/BeneficiaryComplaintsClient';
import BeneficiaryFeedbackFormsPanel from '@/components/beneficiary/BeneficiaryFeedbackFormsPanel';
import AdminBeneficiaryEmailsPanel from '@/components/admin/AdminBeneficiaryEmailsPanel';
import AdminBeneficiarySmsPanel from '@/components/admin/AdminBeneficiarySmsPanel';
import { cn } from '@/ultis/cn';

type WorkspaceTab = 'profile' | 'sms' | 'emails' | 'complaints' | 'feedback-forms';

type SecondaryTabDef = {
  id: Exclude<WorkspaceTab, 'profile'>;
  label: string;
  icon: typeof ChatBubbleLeftRightIcon;
  blurb: string;
};

const secondaryTabs: SecondaryTabDef[] = [
  {
    id: 'sms',
    label: 'SMS',
    icon: ChatBubbleLeftRightIcon,
    blurb: 'Send and review SMS activity for this beneficiary.',
  },
  {
    id: 'emails',
    label: 'Emails',
    icon: EnvelopeIcon,
    blurb: 'Email history and notifications linked to this beneficiary.',
  },
  {
    id: 'complaints',
    label: 'Complaints',
    icon: ExclamationTriangleIcon,
    blurb: 'Complaints and case notes for this beneficiary.',
  },
  {
    id: 'feedback-forms',
    label: 'Feedback Forms',
    icon: ClipboardDocumentListIcon,
    blurb: 'Feedback forms submitted for this beneficiary.',
  },
];

function SecondaryPlaceholder({ tab }: { tab: SecondaryTabDef }) {
  const Icon = tab.icon;
  return (
    <>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#017f3f]/10 to-[#feca07]/15 text-[#017f3f] shadow-inner ring-1 ring-[#017f3f]/10">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{tab.label}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{tab.blurb}</p>
      <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500 ring-1 ring-slate-200/80">
        API wiring for this beneficiary will appear here. Endpoints can be plugged in when ready.
      </p>
    </>
  );
}

export default function AdminBeneficiaryWorkspacePanel({
  children: profilePanel,
  beneficiaryId,
  smsBeneficiaryLabel = 'Beneficiary',
  defaultSmsPhone = '',
  beneficiaryEmail,
}: {
  children: ReactNode;
  beneficiaryId?: string | null;
  /** Shown in SMS / Email compose modals */
  smsBeneficiaryLabel?: string;
  defaultSmsPhone?: string;
  /** Filters Sent emails (admin mailbox → this address) */
  beneficiaryEmail?: string | null;
}) {
  const [active, setActive] = useState<WorkspaceTab>('profile');

  const secondary = secondaryTabs.find((t) => t.id === active);

  return (
    <section
      className="overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-gradient-to-br from-white via-emerald-50/30 to-amber-50/20 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.18)] ring-1 ring-slate-100/80"
      aria-label="Beneficiary workspace (admin only)"
    >
      <div className="px-3 pt-3 sm:px-4 sm:pt-4">
        <div
          className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/80 p-1.5 ring-1 ring-slate-200/60 sm:grid-cols-5"
          role="tablist"
          aria-label="Workspace areas"
        >
          <button
            type="button"
            role="tab"
            aria-selected={active === 'profile'}
            id="admin-workspace-tab-profile"
            aria-controls="admin-workspace-panel-profile"
            onClick={() => setActive('profile')}
            className={cn(
              'flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
              active === 'profile'
                ? 'bg-white text-[#017f3f] shadow-md ring-1 ring-[#017f3f]/20'
                : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
            )}
          >
            <UserCircleIcon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            <span className="truncate">Profile</span>
          </button>
          {secondaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                id={`admin-workspace-tab-${tab.id}`}
                aria-controls={`admin-workspace-panel-${tab.id}`}
                onClick={() => setActive(tab.id)}
                className={cn(
                  'flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                  isActive
                    ? 'bg-white text-[#017f3f] shadow-md ring-1 ring-[#017f3f]/20'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
                )}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 pb-4 pt-2 sm:px-4 sm:pb-5">
        {/* Keep profile steps mounted when switching tabs so form state is preserved */}
        <div
          id="admin-workspace-panel-profile"
          role="tabpanel"
          aria-labelledby="admin-workspace-tab-profile"
          hidden={active !== 'profile'}
          className="min-w-0"
        >
          {profilePanel}
        </div>

        {active !== 'profile' && active === 'sms' && beneficiaryId ? (
          <div
            role="tabpanel"
            id="admin-workspace-panel-sms"
            aria-labelledby="admin-workspace-tab-sms"
            className="min-w-0"
          >
            <AdminBeneficiarySmsPanel
              beneficiaryId={beneficiaryId}
              beneficiaryLabel={smsBeneficiaryLabel}
              defaultPhone={defaultSmsPhone}
            />
          </div>
        ) : active !== 'profile' && active === 'emails' && beneficiaryId ? (
          <div
            role="tabpanel"
            id="admin-workspace-panel-emails"
            aria-labelledby="admin-workspace-tab-emails"
            className="min-w-0"
          >
            <AdminBeneficiaryEmailsPanel
              beneficiaryId={beneficiaryId}
              beneficiaryLabel={smsBeneficiaryLabel}
              beneficiaryEmail={beneficiaryEmail ?? undefined}
            />
          </div>
        ) : active !== 'profile' && active === 'complaints' && beneficiaryId ? (
          <div
            role="tabpanel"
            id="admin-workspace-panel-complaints"
            aria-labelledby="admin-workspace-tab-complaints"
            className="min-w-0"
          >
            <BeneficiaryComplaintsClient variant="admin" beneficiaryId={beneficiaryId} layout="embed" />
          </div>
        ) : active !== 'profile' && active === 'feedback-forms' && beneficiaryId ? (
          <div
            role="tabpanel"
            id="admin-workspace-panel-feedback-forms"
            aria-labelledby="admin-workspace-tab-feedback-forms"
            className="min-w-0"
          >
            <BeneficiaryFeedbackFormsPanel beneficiaryId={beneficiaryId} layout="embed" />
          </div>
        ) : active !== 'profile' && secondary ? (
          <div
            role="tabpanel"
            id={`admin-workspace-panel-${active}`}
            aria-labelledby={`admin-workspace-tab-${active}`}
            className="rounded-2xl border border-dashed border-slate-200/90 bg-white/80 px-5 py-10 sm:px-8 sm:py-12"
          >
            <div className="mx-auto flex max-w-lg flex-col items-center text-center">
              <SecondaryPlaceholder tab={secondary} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
