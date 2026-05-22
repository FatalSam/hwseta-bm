'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaComments,
  FaEnvelope,
  FaExclamationTriangle,
  FaInfoCircle,
  FaPhone,
} from 'react-icons/fa';
import BeneficiaryComplaintsTable from '@/components/beneficiary/BeneficiaryComplaintsTable';
import { useNotifications } from '@/components/ui/notification';
import { getAdminBeneficiary, listAdminBeneficiaryProgrammeLinks } from '@/api/adminBeneficiaries';
import {
  createBeneficiaryComplaint,
  getAdminBeneficiaryComplaintActivities,
  getAdminBeneficiaryComplaintActivitiesForBeneficiary,
  getAdminBeneficiaryComplaintById,
  getBeneficiaryComplaintById,
  getBeneficiaryComplaintActivities,
  listBeneficiaryComplaints,
  listBeneficiaryComplaintsForAdmin,
  listBeneficiaryComplaintTypes,
  postAdminBeneficiaryComplaintNote,
  postAdminBeneficiaryComplaintToBeneficiary,
  postBeneficiaryComplaintMessage,
} from '@/api/beneficiaryComplaints';
import { getMyBeneficiaryProfile, listBeneficiaryProgrammeLinks } from '@/api/beneficiaryProfile';
import { SyncfusionIsoDatePicker } from '@/components/ui/SyncfusionIsoDatePicker';
import { useAuthStore } from '@/store/authStore';
import { formatComplaintDisplayDateTime } from '@/ultis/complaintsDisplay';
import { cn } from '@/ultis/cn';
import type {
  BeneficiaryComplaintActivity,
  BeneficiaryComplaintListItem,
  ComplaintAgainstTypeId,
  ComplaintTypeOption,
} from '@/types/beneficiaryComplaints';
import type { BeneficiaryProgrammeLink } from '@/types/beneficiaryProfile';
import type { Employer } from '@/types/employers';
import type { TrainingProvider } from '@/types/trainingProviders';

type ValidationErrors = Record<string, string>;

type ComplaintsTabId = 'my-complaints' | 'new-complaint';
type ComplaintDialogTabId = 'details' | 'timeline';

type ComplaintFormData = {
  fullName: string;
  idNumber: string;
  contactNumber: string;
  emailAddress: string;
  preferredContactMethod: string[];
  trainingProviderId: string;
  employerId: string;
  incidentLocation: string;
  complaintTypeId: string;
  staffMemberName: string;
  incidentDate: string;
  description: string;
  consent: boolean;
};

const initialFormData: ComplaintFormData = {
  fullName: '',
  idNumber: '',
  contactNumber: '',
  emailAddress: '',
  preferredContactMethod: [],
  trainingProviderId: '',
  employerId: '',
  incidentLocation: '',
  complaintTypeId: '',
  staffMemberName: '',
  incidentDate: '',
  description: '',
  consent: false,
};

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function pickFirstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = normalizeString(record[key]);
    if (value) return value;
  }
  return '';
}

function formatDetailValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeString(item)).filter(Boolean).join(', ');
  }
  return normalizeString(value);
}

function hasBeneficiaryProfileData(profile: Record<string, unknown>): boolean {
  return [
    'firstName',
    'lastName',
    'idNumber_Passport',
    'cellNo',
    'emailAddress',
    'physicalAddress1',
    'gender',
    'raceGroup',
  ].some((key) => normalizeString(profile[key]) !== '');
}

function formatAddress(parts: Array<unknown>): string {
  const filtered = parts.map((part) => normalizeString(part)).filter(Boolean);
  return filtered.join(', ');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  const cleaned = phone.trim().replace(/\s+/g, '');
  return /^(\+?27|0)?[1-9]\d{8}$/.test(cleaned);
}

function isValidDate(dateString: string): boolean {
  if (!dateString) return true;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return !Number.isNaN(date.getTime()) && date <= today;
}

function isValidFullName(name: string): boolean {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/).filter((part) => part.length > 0);
  return parts.length >= 2 && trimmed.length >= 3;
}

function activitySortTime(a: BeneficiaryComplaintActivity): number {
  const s = normalizeString(a.dateCreated ?? a.createdAt);
  if (!s) return 0;
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Same source as My Programmes on /dashboard/beneficiary/profile — not global TP/employer catalogs. */
function trainingProvidersFromProgrammeLinks(links: BeneficiaryProgrammeLink[]): TrainingProvider[] {
  const byId = new Map<string, TrainingProvider>();
  for (const link of links) {
    const id = link.trainingProviderId;
    if (id == null || String(id).trim() === '' || String(id) === '0') continue;
    const key = String(id);
    const name = link.trainingProviderName?.trim();
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, { trainingProviderId: id, trainingProviderName: name || undefined });
    } else if (!normalizeString(existing.trainingProviderName) && name) {
      byId.set(key, { ...existing, trainingProviderName: name });
    }
  }
  return [...byId.values()].sort((a, b) =>
    normalizeString(a.trainingProviderName).localeCompare(normalizeString(b.trainingProviderName)),
  );
}

function employersFromProgrammeLinks(links: BeneficiaryProgrammeLink[]): Employer[] {
  const byId = new Map<string, Employer>();
  for (const link of links) {
    const id = link.employerId;
    if (id == null || String(id).trim() === '' || String(id) === '0') continue;
    const key = String(id);
    const name = link.employerName?.trim();
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, { employerId: id, employerName: name || undefined });
    } else if (!normalizeString(existing.employerName) && name) {
      byId.set(key, { ...existing, employerName: name });
    }
  }
  return [...byId.values()].sort((a, b) =>
    normalizeString(a.employerName).localeCompare(normalizeString(b.employerName)),
  );
}

function hasAdminBeneficiaryBasicData(b: Record<string, unknown>): boolean {
  return ['firstName', 'lastName', 'idNumber_Passport', 'cellNo', 'emailAddress'].some(
    (k) => normalizeString(b[k]) !== '',
  );
}

export type BeneficiaryComplaintsClientProps = {
  variant: 'beneficiary' | 'admin';
  /** Required when `variant` is `admin`. */
  beneficiaryId?: string;
  /** `embed` = admin workspace (compact). */
  layout?: 'page' | 'embed';
};

export default function BeneficiaryComplaintsClient({
  variant,
  beneficiaryId: adminBeneficiaryId,
  layout = 'page',
}: BeneficiaryComplaintsClientProps) {
  const isAdmin = variant === 'admin';
  const isEmbed = layout === 'embed';
  const { user } = useAuthStore();
  const { addNotification, clearAll } = useNotifications();
  const [isLoadingLookups, setIsLoadingLookups] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [trainingProviders, setTrainingProviders] = useState<TrainingProvider[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [complaintTypes, setComplaintTypes] = useState<ComplaintTypeOption[]>([]);
  const [complaintsList, setComplaintsList] = useState<BeneficiaryComplaintListItem[]>([]);
  const [isLoadingComplaintsList, setIsLoadingComplaintsList] = useState(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedComplaintDetails, setSelectedComplaintDetails] = useState<Record<string, unknown> | null>(null);
  const [isLoadingComplaintDetails, setIsLoadingComplaintDetails] = useState(false);
  const [complaintDetailsError, setComplaintDetailsError] = useState<string | null>(null);
  const [activeComplaintDialogTab, setActiveComplaintDialogTab] = useState<ComplaintDialogTabId>('details');
  const [activities, setActivities] = useState<BeneficiaryComplaintActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  /** Admin: `true` = POST `.../messages` (to beneficiary), `false` = POST `.../notes` with internal visibility. */
  const [adminMessageToBeneficiary, setAdminMessageToBeneficiary] = useState(true);
  const [activeTab, setActiveTab] = useState<ComplaintsTabId>('my-complaints');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [formData, setFormData] = useState<ComplaintFormData>(initialFormData);

  const refreshComplaintsList = useCallback(async () => {
    try {
      if (isAdmin) {
        if (!adminBeneficiaryId) {
          setComplaintsList([]);
          return;
        }
        const result = await listBeneficiaryComplaintsForAdmin(adminBeneficiaryId, 1, 50);
        setComplaintsList(result.items);
        return;
      }
      const result = await listBeneficiaryComplaints(1, 50);
      setComplaintsList(result.items);
    } catch {
      setComplaintsList([]);
    }
  }, [adminBeneficiaryId, isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    setFormData((prev) => ({
      ...prev,
      fullName: prev.fullName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
      emailAddress: prev.emailAddress || user?.email || '',
    }));
  }, [isAdmin, user?.email, user?.firstName, user?.lastName]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      preferredContactMethod: prev.preferredContactMethod.filter((m) => m !== 'WhatsApp'),
    }));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadLookups = async () => {
      setIsLoadingLookups(true);
      try {
        const linksPromise = isAdmin
          ? adminBeneficiaryId
            ? listAdminBeneficiaryProgrammeLinks(adminBeneficiaryId)
            : Promise.reject(new Error('missing id'))
          : listBeneficiaryProgrammeLinks();

        const [linksResult, typesResult] = await Promise.allSettled([
          linksPromise,
          listBeneficiaryComplaintTypes(),
        ]);
        if (!isMounted) return;

        const errorParts: string[] = [];

        if (linksResult.status === 'fulfilled') {
          setTrainingProviders(trainingProvidersFromProgrammeLinks(linksResult.value));
          setEmployers(employersFromProgrammeLinks(linksResult.value));
        } else {
          setTrainingProviders([]);
          setEmployers([]);
          errorParts.push(
            isAdmin
              ? 'Could not load programme links for this beneficiary.'
              : 'Could not load your programme links. Add programmes on My Profile, then try again.',
          );
        }

        if (typesResult.status === 'fulfilled') {
          setComplaintTypes(typesResult.value);
        } else {
          setComplaintTypes([]);
          errorParts.push('Could not load complaint types. Please refresh and try again.');
        }

        if (errorParts.length > 0) {
          addNotification({
            type: 'error',
            title: 'Could not load complaint form',
            message: errorParts.join(' '),
            duration: 6000,
          });
        }
      } catch {
        if (!isMounted) return;
        setTrainingProviders([]);
        setEmployers([]);
        setComplaintTypes([]);
        addNotification({
          type: 'error',
          title: 'Could not load complaint form',
          message: 'Failed to load the complaint form. Please refresh and try again.',
          duration: 6000,
        });
      } finally {
        if (isMounted) {
          setIsLoadingLookups(false);
        }
      }
    };

    if (isAdmin && !adminBeneficiaryId) {
      setIsLoadingLookups(false);
      setTrainingProviders([]);
      setEmployers([]);
      return;
    }

    loadLookups().catch(() => {
      if (!isMounted) return;
      setIsLoadingLookups(false);
      setTrainingProviders([]);
      setEmployers([]);
      setComplaintTypes([]);
      addNotification({
        type: 'error',
        title: 'Could not load complaint form',
        message: 'Failed to load the complaint form. Please refresh and try again.',
        duration: 6000,
      });
    });

    return () => {
      isMounted = false;
    };
  }, [addNotification, adminBeneficiaryId, isAdmin]);

  useEffect(() => {
    if (!isAdmin && !user?.userID) {
      setHasProfile(false);
      return;
    }
    if (isAdmin && !adminBeneficiaryId) {
      setHasProfile(false);
      return;
    }

    let isMounted = true;

    const loadBeneficiaryProfile = async () => {
      setIsLoadingProfile(true);
      try {
        if (isAdmin && adminBeneficiaryId) {
          const b = await getAdminBeneficiary(adminBeneficiaryId);
          if (!isMounted) return;
          const profile = b as Record<string, unknown>;
          if (hasAdminBeneficiaryBasicData(profile)) {
            const firstName = pickFirstString(profile, ['firstName']);
            const lastName = pickFirstString(profile, ['lastName', 'surname']);
            const profileFullName = [firstName, lastName].filter(Boolean).join(' ').trim();
            setFormData((prev) => ({
              ...prev,
              fullName: profileFullName || prev.fullName,
              idNumber: pickFirstString(profile, ['idNumber_Passport', 'idNumber', 'passportNumber']) || prev.idNumber,
              contactNumber:
                pickFirstString(profile, ['cellNo', 'contactNumber', 'telephoneNo', 'telNoHome', 'mobileNo']) ||
                prev.contactNumber,
              emailAddress: pickFirstString(profile, ['emailAddress', 'email']) || prev.emailAddress,
            }));
            setHasProfile(true);
          } else {
            setHasProfile(false);
          }
          return;
        }

        const profile = await getMyBeneficiaryProfile();
        if (!isMounted) return;

        if (hasBeneficiaryProfileData(profile)) {
          const firstName = pickFirstString(profile, ['firstName']);
          const lastName = pickFirstString(profile, ['lastName', 'surname']);
          const profileFullName = [firstName, lastName].filter(Boolean).join(' ').trim();

          setFormData((prev) => ({
            ...prev,
            fullName: profileFullName || prev.fullName,
            idNumber: pickFirstString(profile, ['idNumber_Passport', 'idNumber', 'passportNumber']) || prev.idNumber,
            contactNumber:
              pickFirstString(profile, ['cellNo', 'contactNumber', 'telephoneNo', 'telNoHome', 'mobileNo']) ||
              prev.contactNumber,
            emailAddress: pickFirstString(profile, ['emailAddress', 'email']) || prev.emailAddress,
          }));
          setHasProfile(true);
        } else {
          setHasProfile(false);
        }
      } catch {
        if (!isMounted) return;
        setHasProfile(false);
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadBeneficiaryProfile().catch(() => {
      if (!isMounted) return;
      setHasProfile(false);
      setIsLoadingProfile(false);
    });

    return () => {
      isMounted = false;
    };
  }, [adminBeneficiaryId, isAdmin, user?.userID]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingComplaintsList(true);
    refreshComplaintsList().finally(() => {
      if (!cancelled) setIsLoadingComplaintsList(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshComplaintsList]);

  useEffect(() => {
    setReplyDraft('');
    setAdminMessageToBeneficiary(true);
    setActivities([]);
    if (!selectedComplaintId) return;

    let cancelled = false;
    setIsLoadingActivities(true);
    (async () => {
      try {
        const rows = isAdmin
          ? adminBeneficiaryId
            ? await getAdminBeneficiaryComplaintActivitiesForBeneficiary(
                adminBeneficiaryId,
                selectedComplaintId,
              )
            : await getAdminBeneficiaryComplaintActivities(selectedComplaintId)
          : await getBeneficiaryComplaintActivities(selectedComplaintId);
        if (!cancelled) setActivities(rows);
      } catch {
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setIsLoadingActivities(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adminBeneficiaryId, isAdmin, selectedComplaintId]);

  useEffect(() => {
    setSelectedComplaintDetails(null);
    setComplaintDetailsError(null);
    if (!selectedComplaintId) return;

    let cancelled = false;
    setIsLoadingComplaintDetails(true);
    (async () => {
      try {
        const details =
          isAdmin && adminBeneficiaryId
            ? await getAdminBeneficiaryComplaintById(adminBeneficiaryId, selectedComplaintId)
            : await getBeneficiaryComplaintById(selectedComplaintId);
        if (!cancelled) setSelectedComplaintDetails(details);
      } catch {
        if (!cancelled) {
          setSelectedComplaintDetails(null);
          setComplaintDetailsError('Could not load the full complaint details. Showing the summary we have.');
        }
      } finally {
        if (!cancelled) setIsLoadingComplaintDetails(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adminBeneficiaryId, isAdmin, selectedComplaintId]);

  const selectedComplaint = useMemo(
    () => complaintsList.find((c) => c.beneficiaryComplaintId === selectedComplaintId) ?? null,
    [complaintsList, selectedComplaintId],
  );

  const selectedComplaintRecord = useMemo<Record<string, unknown>>(
    () => ({
      ...(selectedComplaint ? (selectedComplaint as unknown as Record<string, unknown>) : {}),
      ...(selectedComplaintDetails ?? {}),
    }),
    [selectedComplaint, selectedComplaintDetails],
  );

  const complaintDetailRows = useMemo(() => {
    const record = selectedComplaintRecord;
    const preferredContact =
      formatDetailValue(record.preferredContactMethod) ||
      formatDetailValue(record.PreferredContactMethod) ||
      formatDetailValue(record.preferredContactMethods) ||
      formatDetailValue(record.PreferredContactMethods);

    return [
      {
        label: 'Reference',
        value:
          pickFirstString(record, ['complaintReference', 'ComplaintReference']) ||
          selectedComplaintId ||
          '—',
      },
      {
        label: 'Status',
        value:
          pickFirstString(record, [
            'complaintsStatusDescription',
            'ComplaintsStatusDescription',
            'complaintsStatus',
            'ComplaintsStatus',
          ]) || '—',
      },
      {
        label: 'Complaint type',
        value:
          pickFirstString(record, [
            'complaintTypeName',
            'ComplaintTypeName',
            'complaintType',
            'ComplaintType',
          ]) || '—',
      },
      {
        label: 'Date Submitted',
        value: formatComplaintDisplayDateTime(
          pickFirstString(record, ['dateCreated', 'DateCreated', 'createdAt', 'CreatedAt']) || undefined,
        ),
      },
      {
        label: 'Training provider',
        value: pickFirstString(record, ['trainingProviderName', 'TrainingProviderName']) || '—',
      },
      {
        label: 'Employer',
        value: pickFirstString(record, ['employerName', 'EmployerName']) || '—',
      },
      {
        label: 'Incident date',
        value: formatComplaintDisplayDateTime(
          pickFirstString(record, ['incidentDate', 'IncidentDate']) || undefined,
        ),
      },
      {
        label: 'Incident location',
        value: pickFirstString(record, ['incidentLocation', 'IncidentLocation']) || '—',
      },
      {
        label: 'Staff member involved',
        value: pickFirstString(record, ['staffMemberName', 'StaffMemberName']) || '—',
      },
      {
        label: 'Preferred contact',
        value: preferredContact || '—',
      },
    ];
  }, [selectedComplaintId, selectedComplaintRecord]);

  const selectedComplaintDescription = useMemo(
    () =>
      pickFirstString(selectedComplaintRecord, [
        'description',
        'Description',
        'complaintDescription',
        'ComplaintDescription',
        'details',
        'Details',
      ]),
    [selectedComplaintRecord],
  );

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => activitySortTime(b) - activitySortTime(a));
  }, [activities]);

  const selectedTrainingProvider = useMemo(
    () =>
      trainingProviders.find(
        (provider) => String(provider.trainingProviderId ?? '') === formData.trainingProviderId,
      ) ?? null,
    [formData.trainingProviderId, trainingProviders],
  );

  const selectedEmployer = useMemo(
    () =>
      employers.find((employer) => String(employer.employerId ?? '') === formData.employerId) ?? null,
    [employers, formData.employerId],
  );

  const trainingProviderAddress = useMemo(
    () =>
      selectedTrainingProvider
        ? formatAddress([
            selectedTrainingProvider.physicalAddress1,
            selectedTrainingProvider.physicalAddress2,
            selectedTrainingProvider.physicalAddress3,
            selectedTrainingProvider.physicalAddressCode,
          ])
        : '',
    [selectedTrainingProvider],
  );

  const employerAddress = useMemo(
    () =>
      selectedEmployer
        ? formatAddress([
            selectedEmployer.physicalAddress1,
            selectedEmployer.physicalAddress2,
            selectedEmployer.physicalAddress3,
            selectedEmployer.physicalAddressCode,
          ])
        : '',
    [selectedEmployer],
  );

  const selectedComplaintTypeId = useMemo(() => {
    const raw = formData.complaintTypeId.trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [formData.complaintTypeId]);

  const selectedComplaintType = useMemo(() => {
    if (selectedComplaintTypeId == null) return null;
    return complaintTypes.find((t) => t.complaintTypeId === selectedComplaintTypeId) ?? null;
  }, [complaintTypes, selectedComplaintTypeId]);

  const updateFormData = <K extends keyof ComplaintFormData>(field: K, value: ComplaintFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => {
      if (!prev[field] && !(field === 'trainingProviderId' || field === 'employerId')) return prev;
      const next = { ...prev };
      delete next[field];
      if (field === 'trainingProviderId' || field === 'employerId') {
        delete next.relatedParty;
      }
      return next;
    });
  };

  const handleContactMethodChange = (method: string) => {
    setFormData((prev) => {
      const methods = prev.preferredContactMethod.includes(method)
        ? prev.preferredContactMethod.filter((m) => m !== method)
        : [...prev.preferredContactMethod, method];
      return { ...prev, preferredContactMethod: methods };
    });
  };

  const loadActivitiesForSelected = useCallback(async () => {
    if (!selectedComplaintId) return [];
    if (isAdmin) {
      if (adminBeneficiaryId) {
        return getAdminBeneficiaryComplaintActivitiesForBeneficiary(
          adminBeneficiaryId,
          selectedComplaintId,
        );
      }
      return getAdminBeneficiaryComplaintActivities(selectedComplaintId);
    }
    return getBeneficiaryComplaintActivities(selectedComplaintId);
  }, [adminBeneficiaryId, isAdmin, selectedComplaintId]);

  const handleSendReply = async () => {
    const msg = replyDraft.trim();
    if (!msg || !selectedComplaintId) return;
    setIsSendingReply(true);
    try {
      if (isAdmin) {
        if (adminMessageToBeneficiary) {
          await postAdminBeneficiaryComplaintToBeneficiary(selectedComplaintId, { message: msg, toUserId: null });
        } else {
          await postAdminBeneficiaryComplaintNote(selectedComplaintId, {
            message: msg,
            isVisibleToBeneficiary: false,
          });
        }
        setReplyDraft('');
        clearAll();
        addNotification({
          type: 'success',
          title: adminMessageToBeneficiary ? 'Message sent' : 'Note added',
          message: adminMessageToBeneficiary
            ? 'The message was added for the beneficiary on this case.'
            : 'Internal note added to the complaint file.',
          duration: 5000,
        });
        const rows = await loadActivitiesForSelected();
        setActivities(rows);
        await refreshComplaintsList();
      } else {
        await postBeneficiaryComplaintMessage(selectedComplaintId, { message: msg });
        setReplyDraft('');
        clearAll();
        addNotification({
          type: 'success',
          title: 'Message sent',
          message: 'Your update was added to the complaint timeline.',
          duration: 5000,
        });
        const rows = await getBeneficiaryComplaintActivities(selectedComplaintId);
        setActivities(rows);
        await refreshComplaintsList();
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isAdmin
            ? 'Could not add this update. Please try again.'
            : 'Could not send your message. Please try again.';
      addNotification({ type: 'error', title: 'Could not send message', message, duration: 5000 });
    } finally {
      setIsSendingReply(false);
    }
  };

  const validateForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (!isValidFullName(formData.fullName)) {
      errors.fullName = 'Please enter your full name (first and last name)';
    }

    if (!formData.contactNumber.trim()) {
      errors.contactNumber = 'Contact number is required';
    } else if (!isValidPhone(formData.contactNumber)) {
      errors.contactNumber = 'Please enter a valid South African phone number';
    }

    if (formData.emailAddress.trim() && !isValidEmail(formData.emailAddress)) {
      errors.emailAddress = 'Please enter a valid email address';
    }

    if (!formData.trainingProviderId && !formData.employerId) {
      errors.relatedParty = 'Please select at least a Training Provider or an Employer';
    }

    if (formData.trainingProviderId && !selectedTrainingProvider) {
      errors.trainingProviderId = 'Please select a valid Training Provider';
    }

    if (formData.employerId && !selectedEmployer) {
      errors.employerId = 'Please select a valid Employer';
    }

    if (!formData.complaintTypeId.trim()) {
      errors.complaintTypeId = 'Please select a complaint type';
    } else if (!selectedComplaintType) {
      errors.complaintTypeId = 'Please select a valid complaint type';
    }

    if (!formData.staffMemberName.trim()) {
      errors.staffMemberName = 'Name of the person you interacted with is required';
    } else if (formData.staffMemberName.trim().length < 2) {
      errors.staffMemberName = 'Please enter a valid name';
    }

    if (formData.incidentDate && !isValidDate(formData.incidentDate)) {
      errors.incidentDate = 'Please enter a valid date that is not in the future';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description of complaint is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Please provide more detail (at least 10 characters)';
    } else if (formData.description.trim().length > 5000) {
      errors.description = 'Description is too long (maximum 5000 characters)';
    }

    if (!formData.consent) {
      errors.consent = 'You must confirm your consent to proceed';
    }

    setValidationErrors(errors);
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAdmin) {
      addNotification({
        type: 'info',
        title: 'Raise a complaint',
        message: 'Beneficiaries submit new complaints from their hub. Use this screen to review cases and add messages to existing complaints.',
        duration: 6000,
      });
      return;
    }

    if (!formData.consent) {
      addNotification({
        type: 'warning',
        title: 'Consent required',
        message: 'Please tick the confirmation box before submitting your complaint.',
        duration: 4200,
      });
      return;
    }

    if (!hasProfile) {
      addNotification({
        type: 'error',
        title: 'Profile required',
        message: 'Please complete your beneficiary profile before submitting a complaint.',
        duration: 5000,
      });
      return;
    }

    const fieldErrors = validateForm();
    if (Object.keys(fieldErrors).length > 0) {
      const firstMessage =
        Object.values(fieldErrors)[0] ?? 'Please correct the highlighted fields before submitting your complaint.';
      clearAll();
      addNotification({
        type: 'warning',
        title: 'Please review your complaint',
        message: firstMessage,
        duration: 4200,
      });
      return;
    }

    const complaintType = selectedComplaintType;
    if (!complaintType || selectedComplaintTypeId == null) {
      addNotification({
        type: 'error',
        title: 'Complaint type required',
        message: 'Please select a valid complaint type.',
        duration: 5000,
      });
      return;
    }

    const hasTp = Boolean(formData.trainingProviderId.trim());
    const hasEmp = Boolean(formData.employerId.trim());
    const complaintAgainstTypeId: ComplaintAgainstTypeId =
      hasTp && hasEmp ? 3 : hasTp ? 1 : 2;

    setIsSubmitting(true);
    try {
      const result = await createBeneficiaryComplaint({
        complaintAgainstTypeId,
        trainingProviderId: hasTp ? formData.trainingProviderId.trim() : null,
        employerId: hasEmp ? formData.employerId.trim() : null,
        fullName: formData.fullName.trim(),
        idNumber: formData.idNumber.trim() || null,
        contactNumber: formData.contactNumber.trim(),
        emailAddress: formData.emailAddress.trim() || null,
        preferredContactMethod: [...formData.preferredContactMethod],
        incidentLocation: formData.incidentLocation.trim() || null,
        complaintTypeId: complaintType.complaintTypeId,
        staffMemberName: formData.staffMemberName.trim(),
        incidentDate: formData.incidentDate.trim() || null,
        description: formData.description.trim(),
        consent: formData.consent,
        trainingProviderAddress: trainingProviderAddress.trim() || null,
        employerAddress: employerAddress.trim() || null,
        validateAgainstProgrammeLinks: true,
      });

      const refPart = result.complaintReference
        ? ` Reference: ${result.complaintReference}.`
        : ` Complaint ID: ${result.beneficiaryComplaintId}.`;
      clearAll();
      addNotification({
        type: 'success',
        title: 'Complaint submitted successfully',
        message: `Your complaint was submitted successfully.${refPart}`,
        duration: 6000,
      });
      setValidationErrors({});
      setFormData((prev) => ({
        ...initialFormData,
        fullName: prev.fullName,
        idNumber: prev.idNumber,
        contactNumber: prev.contactNumber,
        emailAddress: prev.emailAddress,
      }));
      void refreshComplaintsList();
      setActiveTab('my-complaints');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong while submitting your complaint. Please try again.';
      addNotification({
        type: 'error',
        title: 'Could not submit complaint',
        message,
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSelectedComplaint = useCallback(() => {
    setSelectedComplaintId(null);
    setActiveComplaintDialogTab('details');
  }, []);

  const toggleSelectedComplaint = useCallback((complaintId: string) => {
    setSelectedComplaintId((prev) => {
      if (prev === complaintId) return null;
      setActiveComplaintDialogTab('details');
      return complaintId;
    });
  }, []);

  if (isAdmin && !adminBeneficiaryId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Beneficiary is not selected.
      </div>
    );
  }

  return (
    <div
      className={cn(
        isEmbed ? 'mx-auto max-w-none px-0 py-0' : 'mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8',
      )}
    >
      {!isEmbed ? (
        <header className="mb-6">
          {isAdmin ? (
            <>
              <h2 className="text-lg font-semibold text-slate-900">Complaints</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 leading-relaxed">
                Review complaints for this beneficiary. Same list and details as on their hub.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-hwseta-green mb-2">Complaints</p>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
                Review your submitted complaints or use the tabs below to{' '}
                <span className="font-medium text-slate-800">Raise a complaint</span>.
              </p>
            </>
          )}
        </header>
      ) : null}

      <div
        className={cn(
          'overflow-hidden border border-slate-200 bg-white',
          isEmbed ? 'rounded-xl shadow-sm' : 'rounded-[1.75rem] shadow-[0_16px_48px_rgba(15,23,42,0.08)]',
        )}
      >
        {isAdmin && !isEmbed ? (
          <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-6">
            <p className="text-sm font-semibold text-[#124a3f]">This beneficiary&apos;s complaints</p>
            <p className="mt-0.5 text-xs text-slate-600">
              New complaints are raised by the beneficiary. You can add messages to existing cases below.
            </p>
          </div>
        ) : !isAdmin ? (
          <div className="flex border-b border-slate-200 bg-slate-50/90" role="tablist" aria-label="Complaints sections">
            <button
              type="button"
              role="tab"
              id="tab-my-complaints"
              aria-selected={activeTab === 'my-complaints'}
              aria-controls="panel-my-complaints"
              className={cn(
                'min-h-[44px] flex-1 px-4 py-2.5 text-sm font-semibold transition-colors sm:px-6',
                activeTab === 'my-complaints'
                  ? 'bg-white text-[#124a3f] shadow-[inset_0_-3px_0_0_#124a3f]'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
              )}
              onClick={() => setActiveTab('my-complaints')}
            >
              My complaints
            </button>
            <button
              type="button"
              role="tab"
              id="tab-new-complaint"
              aria-selected={activeTab === 'new-complaint'}
              aria-controls="panel-new-complaint"
              className={cn(
                'min-h-[44px] flex-1 border-l border-slate-200 px-4 py-2.5 text-sm font-semibold transition-colors sm:px-6',
                activeTab === 'new-complaint'
                  ? 'bg-white text-[#124a3f] shadow-[inset_0_-3px_0_0_#124a3f]'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
              )}
              onClick={() => setActiveTab('new-complaint')}
            >
              Raise a complaint
            </button>
          </div>
        ) : null}

        <div
          id="panel-my-complaints"
          role="tabpanel"
          aria-labelledby="tab-my-complaints"
          hidden={!isAdmin && activeTab !== 'my-complaints'}
          className={cn(isAdmin ? 'px-5 py-4 sm:px-6 sm:py-5' : 'p-0')}
        >
        {!isAdmin ? (
          <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-slate-900">My complaints</h2>
              {!isLoadingComplaintsList ? (
                <p className="text-xs font-medium text-slate-500 sm:text-right">
                  {complaintsList.length === 0
                    ? 'No complaints submitted yet'
                    : `${complaintsList.length} ${complaintsList.length === 1 ? 'complaint' : 'complaints'} found`}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className={cn(!isAdmin && 'px-5 py-4 sm:px-6 sm:py-5')}>
        <BeneficiaryComplaintsTable
          title={isAdmin ? 'Complaints' : undefined}
          subtitle={
            isAdmin && !isEmbed
              ? 'Complaints and latest activity for this beneficiary. Scroll the table when there are many rows.'
              : undefined
          }
          items={complaintsList}
          isLoading={isLoadingComplaintsList}
          interactive
          selectedComplaintId={selectedComplaintId}
          onToggleRow={toggleSelectedComplaint}
          showViewTimelineHint
          showCount={isAdmin}
          emptyMessage={
            isAdmin
              ? 'This beneficiary has not submitted any complaints yet.'
              : 'You have not submitted any complaints yet.'
          }
          emptyHint={
            isAdmin
              ? undefined
              : 'Switch to the "Raise a complaint" tab to submit your first complaint.'
          }
        />

            {selectedComplaintId && complaintsList.length > 0 && (
              <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
                <button
                  type="button"
                  aria-label="Close complaint dialog"
                  className="fixed inset-0 bg-slate-900/45 backdrop-blur-[1px]"
                  onClick={closeSelectedComplaint}
                />
                <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="selected-complaint-title"
                  className="relative z-10 flex w-full max-w-4xl max-h-[min(90vh,calc(100dvh-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected complaint</p>
                      <p id="selected-complaint-title" className="mt-1 text-lg font-semibold text-slate-900">
                        {selectedComplaint?.complaintReference ?? selectedComplaintId}
                      </p>
                      {selectedComplaint?.complaintsStatusDescription || selectedComplaint?.complaintsStatus ? (
                        <span className="mt-2 inline-flex max-w-full rounded-full bg-white px-3 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                          {selectedComplaint.complaintsStatusDescription ?? selectedComplaint.complaintsStatus}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={closeSelectedComplaint}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>

                  <div className="border-b border-slate-200 bg-slate-50/80 px-5 pt-3 sm:px-6">
                    <div className="flex gap-2" role="tablist" aria-label="Selected complaint sections">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeComplaintDialogTab === 'details'}
                        className={cn(
                          'rounded-t-xl px-4 py-2 text-sm font-semibold transition-colors',
                          activeComplaintDialogTab === 'details'
                            ? 'bg-white text-[#124a3f] shadow-[inset_0_-3px_0_0_#124a3f]'
                            : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
                        )}
                        onClick={() => setActiveComplaintDialogTab('details')}
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeComplaintDialogTab === 'timeline'}
                        className={cn(
                          'rounded-t-xl px-4 py-2 text-sm font-semibold transition-colors',
                          activeComplaintDialogTab === 'timeline'
                            ? 'bg-white text-[#124a3f] shadow-[inset_0_-3px_0_0_#124a3f]'
                            : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
                        )}
                        onClick={() => setActiveComplaintDialogTab('timeline')}
                      >
                        Timeline
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-8 sm:px-6 sm:pb-8">
                    {activeComplaintDialogTab === 'details' ? (
                      <div>
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <h3 className="text-sm font-semibold text-slate-900">Complaint details</h3>
                          {isLoadingComplaintDetails ? (
                            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#124a3f] border-t-transparent" />
                              Loading full details...
                            </span>
                          ) : null}
                        </div>

                        {complaintDetailsError ? (
                          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            {complaintDetailsError}
                          </div>
                        ) : null}

                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {complaintDetailRows.map((row) => (
                            <div key={row.label} className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
                              <dd className="mt-1 break-words text-sm font-medium text-slate-900">{row.value || '—'}</dd>
                            </div>
                          ))}
                        </dl>

                        <div className="mt-4 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</h4>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                            {selectedComplaintDescription || 'No complaint description was returned for this record.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-6">
                          <h3 className="mb-3 text-sm font-semibold text-slate-900">Activity timeline</h3>
                          {isLoadingActivities ? (
                            <div className="flex justify-center py-10">
                              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#124a3f] border-t-transparent" />
                            </div>
                          ) : sortedActivities.length === 0 ? (
                            <p className="text-sm text-slate-600">
                              {isAdmin
                                ? 'No activities in this timeline yet.'
                                : 'No visible activities yet.'}
                            </p>
                          ) : (
                            <ul className="space-y-4 border-l-2 border-emerald-200 pl-4">
                              {sortedActivities.map((a, idx) => (
                                <li key={a.activityId ?? `${idx}-${normalizeString(a.dateCreated)}`} className="relative">
                                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#124a3f]" />
                                  <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                      <span className="font-medium text-slate-700">
                                        {normalizeString(a.activityType) || 'Update'}
                                      </span>
                                      {isAdmin && a.isVisibleToBeneficiary === false ? (
                                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-700">
                                          Internal
                                        </span>
                                      ) : null}
                                      <span>·</span>
                                      <time dateTime={normalizeString(a.dateCreated || a.createdAt)}>
                                        {formatComplaintDisplayDateTime(
                                          normalizeString(a.dateCreated || a.createdAt) || undefined,
                                        )}
                                      </time>
                                    </div>
                                    {a.message != null && String(a.message).trim() !== '' ? (
                                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{String(a.message)}</p>
                                    ) : null}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <label htmlFor="complaint-reply-message" className="mb-2 block text-sm font-semibold text-slate-800">
                            {isAdmin ? 'Add a message or internal note' : 'Send a message on this complaint'}
                          </label>
                          {isAdmin ? (
                            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                              <span className="text-xs font-medium text-slate-600">Type</span>
                              <div className="flex flex-wrap gap-3" role="group" aria-label="Reply type">
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                                  <input
                                    type="radio"
                                    name="admin-complaint-reply-type"
                                    className="h-4 w-4 border-slate-300 text-[#124a3f] focus:ring-[#124a3f]"
                                    checked={adminMessageToBeneficiary}
                                    onChange={() => setAdminMessageToBeneficiary(true)}
                                  />
                                  Message to beneficiary
                                </label>
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                                  <input
                                    type="radio"
                                    name="admin-complaint-reply-type"
                                    className="h-4 w-4 border-slate-300 text-[#124a3f] focus:ring-[#124a3f]"
                                    checked={!adminMessageToBeneficiary}
                                    onChange={() => setAdminMessageToBeneficiary(false)}
                                  />
                                  Internal note (staff only)
                                </label>
                              </div>
                            </div>
                          ) : null}
                          <textarea
                            id="complaint-reply-message"
                            value={replyDraft}
                            onChange={(e) => setReplyDraft(e.target.value)}
                            rows={4}
                            placeholder={
                              isAdmin
                                ? adminMessageToBeneficiary
                                  ? 'Message the beneficiary will see on this complaint...'
                                  : 'Note for the file only; not shown to the beneficiary...'
                                : 'Further information for HWSETA (visible on your activity timeline)...'
                            }
                            className="w-full resize-y rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:border-[#124a3f] focus:outline-none focus:ring-4 focus:ring-[#124a3f]/10"
                          />
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => void handleSendReply()}
                              disabled={isSendingReply || !replyDraft.trim()}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#124a3f] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d3a32] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isSendingReply ? (
                                <>
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  {isAdmin && !adminMessageToBeneficiary ? 'Saving...' : 'Sending...'}
                                </>
                              ) : (
                                <>
                                  <FaComments className="h-4 w-4" />
                                  {isAdmin
                                    ? adminMessageToBeneficiary
                                      ? 'Send message'
                                      : 'Add internal note'
                                    : 'Send message'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                </div>
              </div>
            )}
        </div>
        </div>

        <div
          id="panel-new-complaint"
          role="tabpanel"
          aria-labelledby="tab-new-complaint"
          hidden={isAdmin || activeTab !== 'new-complaint'}
          className="px-5 py-4 sm:px-6 sm:py-5"
        >
        <div
          className="mb-6 flex gap-3 rounded-xl border border-emerald-200/90 bg-emerald-50/60 px-4 py-3.5 sm:items-start sm:px-4"
          role="note"
        >
          <FaInfoCircle className="mt-0.5 h-5 w-5 shrink-0 text-hwseta-green" aria-hidden />
          <p className="text-sm leading-relaxed text-slate-700 sm:text-[0.9375rem]">
            Complete the form below to submit a complaint relating to a training provider or employer. All information
            will be handled <span className="font-semibold text-slate-900">confidentially</span>.
          </p>
        </div>

        {!isLoadingProfile && !hasProfile && !isAdmin && (
          <div className="mb-8 rounded-r-lg border-l-4 border-amber-500 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-900">Profile not complete</p>
                <p className="text-sm text-amber-800">
                  This form is only available for beneficiaries with completed profiles. Please complete your profile
                  before submitting a complaint.
                </p>
                <Link
                  href="/dashboard/beneficiary/profile"
                  className="inline-flex text-sm font-semibold text-amber-900 underline-offset-2 hover:underline"
                >
                  Go to My Profile
                </Link>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section>
            <h2 className="mb-4 border-b-2 border-gray-200 pb-2 text-xl font-bold text-gray-900">
              Training Provider / Employer Details{' '}
              <span className="text-sm font-normal text-slate-500">
                (Select whichever applies to your complaint: Training Provider, Employer, or both.)
              </span>
            </h2>
            <div className="space-y-5">
              <div>
                <label htmlFor="trainingProviderId" className="mb-2 block text-sm font-semibold text-gray-700">
                  Training Provider
                </label>
                <select
                  id="trainingProviderId"
                  value={formData.trainingProviderId}
                  onChange={(e) => updateFormData('trainingProviderId', e.target.value)}
                  disabled={isLoadingLookups}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#124a3f]/10 disabled:cursor-not-allowed disabled:bg-gray-50 ${
                    validationErrors.trainingProviderId || validationErrors.relatedParty
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-gray-200 bg-white focus:border-[#124a3f]'
                  }`}
                >
                  <option value="">-- Select Training Provider --</option>
                  {trainingProviders.map((provider) => (
                    <option key={String(provider.trainingProviderId)} value={String(provider.trainingProviderId ?? '')}>
                      {provider.trainingProviderName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="employerId" className="mb-2 block text-sm font-semibold text-gray-700">
                  Employer
                </label>
                <select
                  id="employerId"
                  value={formData.employerId}
                  onChange={(e) => updateFormData('employerId', e.target.value)}
                  disabled={isLoadingLookups}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#124a3f]/10 disabled:cursor-not-allowed disabled:bg-gray-50 ${
                    validationErrors.employerId || validationErrors.relatedParty
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-gray-200 bg-white focus:border-[#124a3f]'
                  }`}
                >
                  <option value="">-- Select Employer --</option>
                  {employers.map((employer) => (
                    <option key={String(employer.employerId)} value={String(employer.employerId ?? '')}>
                      {employer.employerName}
                    </option>
                  ))}
                </select>
              </div>

              {validationErrors.relatedParty && (
                <p className="text-xs text-red-600">{validationErrors.relatedParty}</p>
              )}

              <div>
                <label htmlFor="incidentLocation" className="mb-2 block text-sm font-semibold text-gray-700">
                  Incident Location / Area
                </label>
                <input
                  type="text"
                  id="incidentLocation"
                  value={formData.incidentLocation}
                  onChange={(e) => updateFormData('incidentLocation', e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus:border-[#124a3f] focus:outline-none focus:ring-4 focus:ring-[#124a3f]/10"
                  placeholder="Enter the location or area related to your complaint"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 border-b-2 border-gray-200 pb-2 text-xl font-bold text-gray-900">
              Complaint Details
            </h2>
            <div className="space-y-5">
              <div>
                <label htmlFor="complaintTypeId" className="mb-2 block text-sm font-semibold text-gray-700">
                  Type of Complaint <span className="text-red-500">*</span>
                </label>
                <select
                  id="complaintTypeId"
                  value={formData.complaintTypeId}
                  onChange={(e) => updateFormData('complaintTypeId', e.target.value)}
                  disabled={isLoadingLookups}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#124a3f]/10 disabled:cursor-not-allowed disabled:bg-gray-50 ${
                    validationErrors.complaintTypeId
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-gray-200 bg-white focus:border-[#124a3f]'
                  }`}
                >
                  <option value="">-- Select Type of Complaint --</option>
                  {complaintTypes.map((type) => (
                    <option key={type.complaintTypeId} value={String(type.complaintTypeId)}>
                      {type.complaintTypeName}
                    </option>
                  ))}
                </select>
                {validationErrors.complaintTypeId && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.complaintTypeId}</p>
                )}
              </div>

              <div>
                <label htmlFor="staffMemberName" className="mb-2 block text-sm font-semibold text-gray-700">
                  Name of Person You Interacted With <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="staffMemberName"
                  value={formData.staffMemberName}
                  onChange={(e) => updateFormData('staffMemberName', e.target.value)}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#124a3f]/10 ${
                    validationErrors.staffMemberName
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-gray-200 bg-white focus:border-[#124a3f]'
                  }`}
                  placeholder="e.g. Trainer, Assessor, Mentor, HR contact, Administrator"
                />
                {validationErrors.staffMemberName ? (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.staffMemberName}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Example: Trainer, Assessor, Mentor, HR contact, Administrator
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="incidentDate" className="mb-2 block text-sm font-semibold text-gray-700">
                  Date of Incident
                </label>
                <SyncfusionIsoDatePicker
                  id="incidentDate"
                  value={formData.incidentDate}
                  onChange={(iso) => updateFormData('incidentDate', iso)}
                  max={new Date()}
                  hasError={!!validationErrors.incidentDate}
                />
                {validationErrors.incidentDate && (
                  <p className="mt-1 text-xs font-medium text-red-600">{validationErrors.incidentDate}</p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="mb-2 block text-sm font-semibold text-gray-700">
                  Description of Complaint <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={8}
                  maxLength={5000}
                  className={`w-full resize-none rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#124a3f]/10 ${
                    validationErrors.description
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-gray-200 bg-white focus:border-[#124a3f]'
                  }`}
                  placeholder="Please describe what happened, including dates, times, and any relevant details."
                />
                <div className="mt-1 flex items-center justify-between">
                  {validationErrors.description ? (
                    <p className="text-xs text-red-600">{validationErrors.description}</p>
                  ) : (
                    <span />
                  )}
                  <p className="text-xs text-gray-400">{formData.description.length}/5000 characters</p>
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-gray-700">Preferred Contact Method</label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { label: 'Phone', icon: <FaPhone className="h-4 w-4 text-gray-600" /> },
                    { label: 'Email', icon: <FaEnvelope className="h-4 w-4 text-gray-600" /> },
                  ].map((method) => (
                    <label key={method.label} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.preferredContactMethod.includes(method.label)}
                        onChange={() => handleContactMethodChange(method.label)}
                        className="h-4 w-4 rounded border-gray-300 text-[#124a3f] focus:ring-[#124a3f]"
                      />
                      {method.icon}
                      <span className="text-sm text-gray-700">{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 border-b-2 border-gray-200 pb-2 text-xl font-bold text-gray-900">
              Consent & Submission
            </h2>
            <div className="space-y-5">
              <div
                className={`flex items-start gap-3 rounded-xl border-2 p-4 ${
                  validationErrors.consent ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  id="consent"
                  checked={formData.consent}
                  onChange={(e) => updateFormData('consent', e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-[#124a3f] focus:ring-[#124a3f]"
                />
                <label htmlFor="consent" className="cursor-pointer text-sm text-gray-700">
                  I confirm that the information provided is true and accurate to the best of my knowledge. I understand
                  that this complaint will be investigated. <span className="text-red-500">*</span>
                </label>
              </div>
              {validationErrors.consent && <p className="text-xs text-red-600">{validationErrors.consent}</p>}

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !hasProfile ||
                    isLoadingProfile ||
                    isLoadingLookups ||
                    !formData.consent
                  }
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-8 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:from-red-700 hover:to-red-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <FaExclamationTriangle className="h-4 w-4" />
                      <span>Submit Complaint</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </form>
        </div>
      </div>
    </div>
  );
}
