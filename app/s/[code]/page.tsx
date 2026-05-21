'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { resolveShortLink } from '@/api/formSubmissions';

export default function ShortLinkRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const code = typeof params.code === 'string' ? params.code.trim() : '';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError('Invalid link.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await resolveShortLink(code);
        if (cancelled) return;
        if (result.targetUrl.startsWith('http')) {
          window.location.replace(result.targetUrl);
        } else {
          router.replace(result.targetUrl);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'This link is invalid or has expired.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <p className="text-center text-sm text-slate-600">{error}</p>
        <a href="/" className="mt-4 text-sm font-semibold text-hwseta-green hover:underline">
          Go to home
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-hwseta-green border-t-transparent" />
    </div>
  );
}
