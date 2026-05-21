import { redirect } from 'next/navigation';
import { buildPublicFormPath } from '@/lib/appBaseUrl';

type PageProps = {
  params: Promise<{ formId: string }>;
};

/** Legacy public URL — redirects to `/form/{formId}`. */
export default async function LegacyFormBuilderPublicPage({ params }: PageProps) {
  const { formId } = await params;
  redirect(buildPublicFormPath(formId));
}
