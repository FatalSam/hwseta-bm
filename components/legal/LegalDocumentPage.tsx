import Link from 'next/link';
import type { ReactNode } from 'react';
import Breadcrumb from '@/components/breadcrumb';

type LegalDocumentPageProps = {
  breadcrumbTitle: string;
  heading: string;
  children: ReactNode;
};

export default function LegalDocumentPage({
  breadcrumbTitle,
  heading,
  children,
}: LegalDocumentPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-hwseta-green-muted/40">
      <Breadcrumb breadcrumbTitle={breadcrumbTitle} />
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-6 sm:px-10 sm:py-8">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{heading}</h1>
            </div>

            <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">{children}</div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 text-sm font-semibold text-hwseta-green transition-colors hover:text-hwseta-green-dark"
            >
              ← Back to Registration
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-hwseta-green">{title}</h2>
      <div className="space-y-3 text-base leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

export function LegalSubSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

export function LegalList({
  ordered,
  items,
}: {
  ordered?: boolean;
  items: ReactNode[];
}) {
  const Tag = ordered ? 'ol' : 'ul';
  const listClass = ordered
    ? 'list-decimal list-inside space-y-2 ml-1'
    : 'list-disc list-inside space-y-2 ml-1';

  return (
    <Tag className={listClass}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </Tag>
  );
}

export function LegalContactEmail({ email }: { email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="inline-flex items-center gap-2 font-medium text-hwseta-green underline underline-offset-4 transition-colors hover:text-hwseta-green-dark"
    >
      {email}
    </a>
  );
}
