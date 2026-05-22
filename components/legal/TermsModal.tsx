'use client';

import { FaTimes } from 'react-icons/fa';
import TermsContent from '@/components/legal/TermsContent';

type TermsModalProps = {
  open: boolean;
  onClose: () => void;
  onAccept?: () => void;
};

export default function TermsModal({ open, onClose, onAccept }: TermsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6">
      <button
        type="button"
        aria-label="Close terms and conditions"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-terms-title"
        className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="signup-terms-title" className="text-lg font-bold text-slate-900 sm:text-xl">
              Terms and Conditions of Use
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Review the terms below. Your registration details will stay on this page when you close the popup.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <TermsContent />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
          {onAccept ? (
            <button
              type="button"
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="inline-flex items-center justify-center rounded-xl bg-hwseta-green px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-hwseta-green-dark"
            >
              I accept the terms
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
