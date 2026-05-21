'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { FaArrowLeft, FaPaperPlane, FaPlus, FaTrash } from 'react-icons/fa';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { listManageForms } from '@/api/formBuilder';
import { useFormDistributionMutations } from '@/hooks/useFormSubmissions';
import {
  ALL_QUALIFICATIONS_VALUE,
  fetchProgrammeEnrolmentsDrilldown,
  getProgrammeAudienceRecipientCount,
  programmeEnrolmentsDrilldownQueryKey,
  toProgrammeEnrolmentSelectOptions,
  toQualificationEnrolmentSelectOptions,
} from '@/lib/programme-enrolments-drilldown';
import { useAuthStore } from '@/store/authStore';
import { getUserIdFromToken } from '@/lib/jwt-user-id';
import {
  dedupeExternalRecipients,
  parseExternalRecipientsCsv,
} from '@/lib/form-submission-csv';
import {
  DEFAULT_EMAIL_BODY,
  DEFAULT_EMAIL_SUBJECT,
  DEFAULT_SMS_BODY,
  mergeTemplate,
  previewMergeContext,
} from '@/lib/form-submission-templates';
import type {
  AudienceType,
  DistributionChannel,
  ExternalRecipientInput,
} from '@/types/formSubmissions';

function apiErr(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object') {
      const o = d as Record<string, unknown>;
      if (typeof o.message === 'string') return o.message;
    }
    return e.message || 'Request failed';
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}

function emptyExternalRow(): ExternalRecipientInput {
  return { fullName: '', email: '', cellphone: '' };
}

function countEligible(
  recipients: ExternalRecipientInput[],
  channels: DistributionChannel[],
): { total: number; email: number; sms: number } {
  let email = 0;
  let sms = 0;
  for (const r of recipients) {
    if (channels.includes('email') && r.email?.trim()) email += 1;
    if (channels.includes('sms') && r.cellphone?.trim()) sms += 1;
  }
  const total = new Set(
    recipients.map((r, i) => r.email || r.cellphone || `row-${i}`),
  ).size;
  return { total, email, sms };
}

export default function FormSubmissionsSendAdmin() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const createdByUserId = getUserIdFromToken(token) ?? '';

  const [formId, setFormId] = useState('');
  const [audienceType, setAudienceType] = useState<AudienceType>('all_beneficiaries');
  const [programmeId, setProgrammeId] = useState('');
  const [qualificationId, setQualificationId] = useState(ALL_QUALIFICATIONS_VALUE);
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelSms, setChannelSms] = useState(true);
  const [emailSubject, setEmailSubject] = useState(DEFAULT_EMAIL_SUBJECT);
  const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL_BODY);
  const [smsBody, setSmsBody] = useState(DEFAULT_SMS_BODY);
  const [externalRows, setExternalRows] = useState<ExternalRecipientInput[]>([emptyExternalRow()]);
  const [csvText, setCsvText] = useState('');
  const [csvErrors, setCsvErrors] = useState<{ line: number; message: string }[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formsQuery = useQuery({
    queryKey: ['form-builder', 'manage-list'],
    queryFn: () => listManageForms(),
    retry: false,
  });

  const drilldownQuery = useQuery({
    queryKey: programmeEnrolmentsDrilldownQueryKey,
    queryFn: fetchProgrammeEnrolmentsDrilldown,
    retry: false,
  });

  const drilldownRows = drilldownQuery.data ?? [];

  const programmeOptions = useMemo(
    () => toProgrammeEnrolmentSelectOptions(drilldownRows),
    [drilldownRows],
  );

  const qualificationOptions = useMemo(
    () => toQualificationEnrolmentSelectOptions(drilldownRows, programmeId),
    [drilldownRows, programmeId],
  );

  const { createMutation } = useFormDistributionMutations();

  const selectedForm = (formsQuery.data ?? []).find((f) => f.id === formId);
  const formTitle = selectedForm?.title ?? 'Form';

  const channels = useMemo<DistributionChannel[]>(() => {
    const c: DistributionChannel[] = [];
    if (channelEmail) c.push('email');
    if (channelSms) c.push('sms');
    return c;
  }, [channelEmail, channelSms]);

  const mergedExternal = useMemo(() => {
    const manual = externalRows.filter((r) => r.email?.trim() || r.cellphone?.trim());
    const parsed = csvText.trim() ? parseExternalRecipientsCsv(csvText).rows : [];
    return dedupeExternalRecipients([...manual, ...parsed]);
  }, [externalRows, csvText]);

  const previewCtx = useMemo(
    () => (formId ? previewMergeContext(formTitle, formId) : previewMergeContext('Sample form', 'sample')),
    [formId, formTitle],
  );

  const resolvedSms = useMemo(() => mergeTemplate(smsBody, previewCtx), [smsBody, previewCtx]);
  const smsLength = resolvedSms.length;

  const recipientPreview = useMemo(() => {
    if (audienceType === 'external') {
      return countEligible(mergedExternal, channels);
    }
    if (audienceType === 'by_programme' && programmeId) {
      const total = getProgrammeAudienceRecipientCount(
        drilldownRows,
        programmeId,
        qualificationId || null,
      );
      return { total, email: total, sms: total };
    }
    return { total: 4, email: 4, sms: 4 };
  }, [audienceType, mergedExternal, channels, drilldownRows, programmeId, qualificationId]);

  const applyCsv = useCallback(() => {
    const result = parseExternalRecipientsCsv(csvText);
    setCsvErrors(result.errors);
  }, [csvText]);

  const canSend =
    formId &&
    createdByUserId &&
    channels.length > 0 &&
    ((channels.includes('email') && recipientPreview.email > 0) ||
      (channels.includes('sms') && recipientPreview.sms > 0)) &&
    (audienceType !== 'by_programme' || (programmeId && recipientPreview.total > 0)) &&
    (audienceType !== 'external' || mergedExternal.length > 0);

  const handleSend = async () => {
    setSubmitError(null);
    if (!formId) {
      setSubmitError('Select a form.');
      return;
    }
    if (!createdByUserId) {
      setSubmitError('You must be signed in as an admin.');
      return;
    }
    if (channels.length === 0) {
      setSubmitError('Select at least one channel.');
      return;
    }
    if (audienceType === 'external' && mergedExternal.length === 0) {
      setSubmitError('Add at least one external recipient.');
      return;
    }
    if (channelSms && smsLength > 160) {
      setSubmitError(`SMS message is ${smsLength} characters (max 160).`);
      return;
    }

    const programme = programmeOptions.find((p) => p.programmeId === programmeId);
    const qualification = qualificationOptions.find((q) => q.qualificationId === qualificationId);
    const scopedQualificationId =
      audienceType === 'by_programme' && qualificationId ? qualificationId : null;
    const scopedQualificationName =
      audienceType === 'by_programme' && qualificationId
        ? (qualification?.qualificationName ?? null)
        : null;

    try {
      const result = await createMutation.mutateAsync({
        formId,
        formTitle,
        audienceType,
        programmeId: audienceType === 'by_programme' ? programmeId : null,
        programmeName: programme?.programmeName ?? null,
        qualificationId: scopedQualificationId,
        qualificationName: scopedQualificationName,
        channels,
        emailSubject: channelEmail ? emailSubject : undefined,
        emailBody: channelEmail ? emailBody : undefined,
        smsBody: channelSms ? smsBody : undefined,
        externalRecipients: audienceType === 'external' ? mergedExternal : undefined,
        createdByUserId,
      });
      router.push(
        `/dashboard/admin/form-submissions/${encodeURIComponent(result.distributionId)}`,
      );
    } catch (e) {
      setSubmitError(apiErr(e));
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] bg-gradient-to-b from-slate-50/70 to-white px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-[900px]">
        <Link
          href="/dashboard/admin/form-submissions"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-hwseta-green"
        >
          <FaArrowLeft className="h-3.5 w-3.5" />
          Submissions
        </Link>

        <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Send form</h1>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Form &amp; audience</h2>
            <div className="space-y-4">
              <div>
                <label className={adminFormTheme.label}>
                  Form<span className={adminFormTheme.required}>*</span>
                </label>
                <select
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  className={adminFormTheme.select}
                >
                  <option value="">Select a form…</option>
                  {(formsQuery.data ?? []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset className="space-y-2">
                <legend className={adminFormTheme.label}>Audience</legend>
                {(
                  [
                    ['all_beneficiaries', 'All beneficiaries'],
                    ['by_programme', 'By programme'],
                    ['external', 'Non-beneficiaries'],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="audience"
                      checked={audienceType === value}
                      onChange={() => setAudienceType(value)}
                      className="text-hwseta-green focus:ring-hwseta-green"
                    />
                    {label}
                  </label>
                ))}
              </fieldset>

              {audienceType === 'by_programme' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={adminFormTheme.label}>
                      Programme<span className={adminFormTheme.required}>*</span>
                    </label>
                    <select
                      value={programmeId}
                      onChange={(e) => {
                        setProgrammeId(e.target.value);
                        setQualificationId(ALL_QUALIFICATIONS_VALUE);
                      }}
                      className={adminFormTheme.select}
                      disabled={drilldownQuery.isLoading}
                    >
                      <option value="">Select programme…</option>
                      {programmeOptions.map((p) => (
                        <option key={p.programmeId} value={p.programmeId}>
                          {p.programmeName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={adminFormTheme.label}>Qualification</label>
                    <select
                      value={qualificationId}
                      onChange={(e) => setQualificationId(e.target.value)}
                      className={adminFormTheme.select}
                      disabled={!programmeId || drilldownQuery.isLoading}
                    >
                      {qualificationOptions.length === 0 ? (
                        <option value="">Select programme first…</option>
                      ) : (
                        qualificationOptions.map((q) => {
                          const count =
                            programmeId && q.qualificationId
                              ? getProgrammeAudienceRecipientCount(
                                  drilldownRows,
                                  programmeId,
                                  q.qualificationId,
                                )
                              : programmeId
                                ? getProgrammeAudienceRecipientCount(drilldownRows, programmeId)
                                : 0;
                          return (
                            <option key={q.qualificationId || 'all'} value={q.qualificationId}>
                              {q.qualificationName}
                              {count > 0 ? ` (${count})` : ''}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>
                </div>
              ) : null}

              {audienceType === 'external' ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">Manual recipients</p>
                  {externalRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3 sm:grid-cols-4"
                    >
                      <input
                        placeholder="Full name"
                        value={row.fullName ?? ''}
                        onChange={(e) => {
                          const next = [...externalRows];
                          next[idx] = { ...next[idx], fullName: e.target.value };
                          setExternalRows(next);
                        }}
                        className={adminFormTheme.input}
                      />
                      <input
                        placeholder="Email"
                        value={row.email ?? ''}
                        onChange={(e) => {
                          const next = [...externalRows];
                          next[idx] = { ...next[idx], email: e.target.value };
                          setExternalRows(next);
                        }}
                        className={adminFormTheme.input}
                      />
                      <input
                        placeholder="Cellphone"
                        value={row.cellphone ?? ''}
                        onChange={(e) => {
                          const next = [...externalRows];
                          next[idx] = { ...next[idx], cellphone: e.target.value };
                          setExternalRows(next);
                        }}
                        className={adminFormTheme.input}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setExternalRows((rows) => rows.filter((_, i) => i !== idx))
                        }
                        disabled={externalRows.length <= 1}
                        className={adminFormTheme.btnGhost}
                        aria-label="Remove row"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setExternalRows((r) => [...r, emptyExternalRow()])}
                    className={adminFormTheme.btnSecondary}
                  >
                    <FaPlus />
                    Add row
                  </button>

                  <div>
                    <label className={adminFormTheme.label}>CSV paste or upload</label>
                    <textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      onBlur={applyCsv}
                      placeholder="fullName,email,cellphone"
                      className={adminFormTheme.textarea}
                      rows={4}
                    />
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="mt-2 block text-sm text-slate-600"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setCsvText(String(reader.result ?? ''));
                          const result = parseExternalRecipientsCsv(String(reader.result ?? ''));
                          setCsvErrors(result.errors);
                        };
                        reader.readAsText(file);
                      }}
                    />
                    {csvErrors.length > 0 ? (
                      <ul className="mt-2 text-xs text-red-700">
                        {csvErrors.map((err) => (
                          <li key={`${err.line}-${err.message}`}>
                            Line {err.line}: {err.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Channels &amp; templates</h2>
            <div className="mb-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={channelEmail}
                  onChange={(e) => setChannelEmail(e.target.checked)}
                  className="rounded text-hwseta-green"
                />
                Email
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={channelSms}
                  onChange={(e) => setChannelSms(e.target.checked)}
                  className="rounded text-hwseta-green"
                />
                SMS
              </label>
            </div>

            {channelEmail ? (
              <div className="mb-4 space-y-3">
                <div>
                  <label className={adminFormTheme.label}>Email subject</label>
                  <input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className={adminFormTheme.input}
                  />
                </div>
                <div>
                  <label className={adminFormTheme.label}>Email body</label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className={adminFormTheme.textarea}
                    rows={8}
                  />
                </div>
              </div>
            ) : null}

            {channelSms ? (
              <div className="space-y-2">
                <label className={adminFormTheme.label}>SMS message</label>
                <textarea
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  className={adminFormTheme.textarea}
                  rows={3}
                  maxLength={500}
                />
                <p
                  className={`text-xs font-medium ${smsLength > 160 ? 'text-red-600' : 'text-slate-500'}`}
                >
                  {smsLength} / 160 characters after preview merge
                </p>
              </div>
            ) : null}

            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Preview (sample data)</p>
              {channelEmail ? (
                <p className="mt-2 whitespace-pre-wrap">
                  <span className="font-medium">Subject:</span>{' '}
                  {mergeTemplate(emailSubject, previewCtx)}
                </p>
              ) : null}
              {channelSms ? (
                <p className="mt-2 whitespace-pre-wrap">{resolvedSms}</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-sm text-slate-700">
            <p>
              <span className="font-semibold">Recipients:</span> {recipientPreview.total} total
              {channels.includes('email') ? ` · ${recipientPreview.email} with email` : ''}
              {channels.includes('sms') ? ` · ${recipientPreview.sms} with SMS` : ''}
            </p>
            {audienceType === 'all_beneficiaries' ? (
              <p className="mt-1 text-xs text-slate-500">
                Final counts are resolved on the server when the API is available.
              </p>
            ) : null}
            {audienceType === 'by_programme' && programmeId && recipientPreview.total === 0 ? (
              <p className="mt-1 text-xs text-red-600">
                No beneficiaries found for this programme / qualification selection.
              </p>
            ) : null}
          </section>

          {submitError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!canSend || createMutation.isPending}
              onClick={() => void handleSend()}
              className={adminFormTheme.btnPrimary}
            >
              <FaPaperPlane />
              {createMutation.isPending ? 'Sending…' : 'Send notifications'}
            </button>
            <Link href="/dashboard/admin/form-submissions" className={adminFormTheme.btnSecondary}>
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
