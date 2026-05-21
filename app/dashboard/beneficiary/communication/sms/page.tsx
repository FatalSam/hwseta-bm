'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { AdminBeneficiarySmsRecord } from '@/types/admin-beneficiaries';
import { listBeneficiarySms } from '@/api/beneficiarySms';

const beneficiarySmsQueryKey = ['beneficiary', 'communication', 'sms'] as const;

function apiErr(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object') {
      const o = d as Record<string, unknown>;
      if (typeof o.message === 'string') return o.message;
      if (typeof o.title === 'string') return o.title;
    }
    return e.message || 'Request failed';
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}

function formatInboxDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDetailMeta(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function messageSnippet(text: string, max = 80): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

export default function BeneficiaryCommunicationSmsPage() {
  const listQuery = useQuery({
    queryKey: beneficiarySmsQueryKey,
    queryFn: listBeneficiarySms,
    retry: false,
  });

  const items = listQuery.data?.items ?? [];
  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime(),
      ),
    [items],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (sortedItems.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev && sortedItems.some((i) => i.smsId === prev)) return prev;
      return sortedItems[0]?.smsId ?? null;
    });
  }, [sortedItems]);

  const selected: AdminBeneficiarySmsRecord | undefined = useMemo(
    () => sortedItems.find((r) => r.smsId === selectedId),
    [sortedItems, selectedId],
  );

  const count = listQuery.data?.count ?? sortedItems.length;

  return (
    <div className="max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">SMS Messages</h1>
        <p className="mt-2 text-slate-600">
          View all SMS messages you have received from organizations
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {listQuery.isError ? (
          <div className="p-6">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {apiErr(listQuery.error)}
            </div>
          </div>
        ) : listQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#017f3f]/20 border-t-[#017f3f]" />
            <p className="mt-4 text-sm font-medium text-slate-600">Loading SMS messages…</p>
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700">No SMS messages</p>
            <p className="mt-1 text-sm text-slate-500">You have not received any SMS messages yet</p>
          </div>
        ) : (
          <div className="flex min-h-[min(70vh,560px)] flex-col lg:flex-row">
            {/* Inbox */}
            <div className="flex w-full shrink-0 flex-col border-slate-200 lg:w-[min(100%,380px)] lg:border-r">
              <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                <h2 className="text-base font-bold text-slate-900">Inbox</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {count} {count === 1 ? 'message' : 'messages'}
                </p>
              </div>
              <ul className="max-h-[min(50vh,420px)] flex-1 overflow-y-auto lg:max-h-none">
                {sortedItems.map((row) => {
                  const isSel = row.smsId === selectedId;
                  const key = row.smsId || `${row.sentDate}-${row.cellphoneNr}`;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.smsId || key)}
                        className={`flex w-full border-b border-slate-100 px-4 py-3.5 text-left transition sm:px-5 ${
                          isSel
                            ? 'border-l-4 border-l-hwseta-green bg-slate-100/90'
                            : 'border-l-4 border-l-transparent hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-hwseta-green">
                            {row.sentByName?.trim() || 'HWSETA'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">{formatInboxDate(row.sentDate)}</p>
                          <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">
                            {messageSnippet(row.message)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Detail */}
            <div className="flex min-h-[280px] flex-1 flex-col bg-slate-50/40 lg:min-h-0">
              {selected ? (
                <div className="flex flex-1 flex-col p-6 sm:p-8">
                  <div className="mb-6 border-b border-slate-200/80 pb-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-hwseta-green">HWSETA</p>
                    <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                      {selected.sentByName?.trim() || 'Message'}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Sent {formatDetailMeta(selected.sentDate)}
                    </p>
                    {selected.cellphoneNr ? (
                      <p className="mt-1 text-sm text-slate-500">
                        To{' '}
                        <span className="font-mono text-xs text-slate-700">{selected.cellphoneNr}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-700">
                      {selected.message.replace(/\r\n/g, '\n').trim()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">
                  Select a message to read
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
