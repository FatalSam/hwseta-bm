'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import {
  ChatBubbleLeftRightIcon,
  CheckIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listAdminBeneficiarySms, sendAdminBeneficiarySms } from '@/api/adminBeneficiaries';
import type { AdminBeneficiarySmsRecord } from '@/types/admin-beneficiaries';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { useNotifications } from '@/components/ui/notification';
import { cn } from '@/ultis/cn';

const SMS_CHAR_LIMIT = 160;

const smsQueryKey = (beneficiaryId: string) => ['admin-beneficiary-sms', beneficiaryId] as const;

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

function smsRowKey(row: AdminBeneficiarySmsRecord): string {
  return row.smsId?.trim() || `${row.sentDate}-${row.cellphoneNr}`;
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

type Props = {
  beneficiaryId: string;
  beneficiaryLabel: string;
  defaultPhone: string;
};

export default function AdminBeneficiarySmsPanel({
  beneficiaryId,
  beneficiaryLabel,
  defaultPhone,
}: Props) {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const [modalOpen, setModalOpen] = useState(false);
  const [cellphoneNr, setCellphoneNr] = useState('');
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: smsQueryKey(beneficiaryId),
    queryFn: () => listAdminBeneficiarySms(beneficiaryId),
    enabled: !!beneficiaryId,
  });

  useEffect(() => {
    if (modalOpen) {
      setCellphoneNr(defaultPhone.trim());
      setMessage('');
    }
  }, [modalOpen, defaultPhone]);

  const sendMutation = useMutation({
    mutationFn: () =>
      sendAdminBeneficiarySms(beneficiaryId, {
        cellphoneNr: cellphoneNr.trim(),
        message: message.slice(0, SMS_CHAR_LIMIT),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsQueryKey(beneficiaryId) });
      setModalOpen(false);
      addNotification({
        type: 'success',
        title: 'SMS sent',
        message: 'The message was sent successfully.',
      });
    },
    onError: (e: unknown) => {
      addNotification({
        type: 'error',
        title: 'Could not send SMS',
        message: apiErr(e),
      });
    },
  });

  const remaining = SMS_CHAR_LIMIT - message.length;
  const canSend =
    cellphoneNr.trim().length > 0 &&
    message.trim().length > 0 &&
    remaining >= 0 &&
    !sendMutation.isPending;

  const count = listQuery.data?.count ?? listQuery.data?.items?.length ?? 0;
  const items = listQuery.data?.items ?? [];
  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime(),
      ),
    [items],
  );

  useEffect(() => {
    if (sortedItems.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev && sortedItems.some((i) => smsRowKey(i) === prev)) return prev;
      return smsRowKey(sortedItems[0]);
    });
  }, [sortedItems]);

  const selected = useMemo(
    () => sortedItems.find((r) => smsRowKey(r) === selectedId),
    [sortedItems, selectedId],
  );

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">SMS Messages</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {listQuery.isLoading ? 'Loading…' : `${count} sms found`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={cn(adminFormTheme.btnPrimary, 'w-full shrink-0 sm:w-auto')}
        >
          <CheckIcon className="h-4 w-4" aria-hidden />
          New SMS
        </button>
      </div>

      <div className="overflow-hidden">
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
          <div className="py-16 text-center">
            <p className="text-sm text-slate-600">No SMS records found.</p>
          </div>
        ) : (
          <div className="flex min-h-[min(70vh,560px)] flex-col lg:flex-row">
            <div className="flex w-full shrink-0 flex-col border-slate-200 lg:w-[min(100%,380px)] lg:border-r">
              <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                <h3 className="text-base font-bold text-slate-900">Inbox</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {count} {count === 1 ? 'message' : 'messages'}
                </p>
              </div>
              <ul className="max-h-[min(50vh,420px)] flex-1 overflow-y-auto lg:max-h-none">
                {sortedItems.map((row) => {
                  const key = smsRowKey(row);
                  const isSel = key === selectedId;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(key)}
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
      </div>

      <Transition.Root show={modalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[70]" onClose={() => setModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]" />
          </Transition.Child>
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.28)]">
                <div className="relative bg-hwseta-green px-5 pb-5 pt-5 text-white sm:px-6">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="absolute right-4 top-4 rounded-lg p-1.5 text-white/90 transition hover:bg-white/10"
                    aria-label="Close"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                  <div className="flex items-start gap-3 pr-10">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                      <ChatBubbleLeftRightIcon className="h-6 w-6" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/90">SMS</p>
                      <p className="mt-0.5 truncate text-sm font-medium text-white/95">{beneficiaryLabel}</p>
                      <Dialog.Title className="mt-2 text-2xl font-bold tracking-tight">Send SMS</Dialog.Title>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 px-5 py-5 sm:px-6">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <PhoneIcon className="h-4 w-4 text-slate-500" aria-hidden />
                      To
                    </span>
                    <input
                      type="tel"
                      autoComplete="tel"
                      className={adminFormTheme.input}
                      value={cellphoneNr}
                      onChange={(e) => setCellphoneNr(e.target.value)}
                      placeholder="e.g. 0609448337"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <ChatBubbleLeftRightIcon className="h-4 w-4 text-slate-500" aria-hidden />
                      Message
                    </span>
                    <textarea
                      className={cn(adminFormTheme.textarea, 'min-h-[120px]')}
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, SMS_CHAR_LIMIT))}
                      placeholder="Type your message..."
                    />
                    <p className="mt-1.5 text-right text-xs text-slate-500">
                      {Math.max(0, remaining)} characters left
                    </p>
                  </label>
                </div>

                <div className="border-t border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">
                  <button
                    type="button"
                    disabled={!canSend}
                    onClick={() => sendMutation.mutate()}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700/90 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" aria-hidden />
                    {sendMutation.isPending ? 'Sending…' : 'Send SMS'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}
