'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaExclamationTriangle } from 'react-icons/fa';
import { useAuthStore } from '@/store/authStore';
import { getBeneficiaryProfileOptions, listBeneficiaryProgrammeLinks } from '@/api/beneficiaryProfile';
import { listQualifications } from '@/api/programmeSetup';
import type { BeneficiaryProfileOptions } from '@/types/beneficiaryProfile';
import MyProgrammesListCard from '@/components/beneficiary-profile/MyProgrammesListCard';
import {
  hydrateBeneficiaryProgrammeLinks,
  type ProgrammeLinkDraft,
} from '@/components/beneficiary-profile/programmeLinkMapping';

function profileProgrammesHref(tab: 'programmes', editId?: string) {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (editId) params.set('edit', editId);
  return `/dashboard/beneficiary/profile?${params.toString()}`;
}

export default function BeneficiaryProgrammesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [programmeOptions, setProgrammeOptions] = useState<BeneficiaryProfileOptions>({
    programmes: [],
    trainingProviders: [],
    employers: [],
  });
  const [qualificationOptions, setQualificationOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [programmeLinks, setProgrammeLinks] = useState<ProgrammeLinkDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const programmeOrganisationId = useMemo(() => {
    const parsed = Number(String(user?.companyID ?? '').trim());
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [user?.companyID]);

  const qualificationNameById = useMemo(
    () => new Map(qualificationOptions.map((option) => [option.id, option.name])),
    [qualificationOptions],
  );
  const programmesMissingProofEvidenceRows = useMemo(
    () =>
      programmeLinks.filter(
        (row) =>
          row.completedProgramme === 'Completed' &&
          (!Array.isArray(row.proofFiles) || row.proofFiles.length === 0),
      ),
    [programmeLinks],
  );
  const getProgrammeRowDisplayName = useCallback(
    (row: ProgrammeLinkDraft) => {
      const selectedProgramme = programmeOptions.programmes.find((programme) => String(programme.id) === row.programmeId);
      return row.programmeName || selectedProgramme?.name || 'Programme';
    },
    [programmeOptions.programmes],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const qualifications = await listQualifications(programmeOrganisationId);
        if (cancelled) return;

        setQualificationOptions(
          qualifications.flatMap((qualification) => {
            const id = qualification.qualificationId;
            const name = qualification.qualificationName;
            if (id == null || name == null) return [];

            const normalizedId = String(id).trim();
            const normalizedName = String(name).trim();
            if (!normalizedId || !normalizedName) return [];

            return [{ id: normalizedId, name: normalizedName }];
          }),
        );
      } catch {
        if (!cancelled) {
          setQualificationOptions([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [programmeOrganisationId]);

  useEffect(() => {
    if (!isAuthenticated || !user?.userID) {
      setProgrammeOptions({ programmes: [], trainingProviders: [], employers: [] });
      setProgrammeLinks([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [optionsResult, linksResult] = await Promise.allSettled([
          getBeneficiaryProfileOptions(),
          listBeneficiaryProgrammeLinks(),
        ]);

        if (!isMounted) return;

        if (optionsResult.status === 'fulfilled') {
          setProgrammeOptions(optionsResult.value);
        } else {
          console.warn('Failed to load programme link options', optionsResult.reason);
          setProgrammeOptions({ programmes: [], trainingProviders: [], employers: [] });
        }

        if (linksResult.status === 'fulfilled') {
          const hydratedLinks = await hydrateBeneficiaryProgrammeLinks(linksResult.value ?? []);
          if (!isMounted) return;
          setProgrammeLinks(hydratedLinks);
        } else {
          console.warn('Failed to load programme links', linksResult.reason);
          setProgrammeLinks([]);
        }
      } catch (e) {
        if (!isMounted) return;
        setLoadError(e instanceof Error ? e.message : 'Could not load programmes.');
        setProgrammeLinks([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.userID]);

  const goToProfileProgrammes = useCallback(() => {
    router.push(profileProgrammesHref('programmes'));
  }, [router]);

  const goToProfileEditRow = useCallback(
    (clientId: string) => {
      const row = programmeLinks.find((r) => r.clientId === clientId);
      const editKey =
        row?.beneficiaryProgrammeLinkId != null ? String(row.beneficiaryProgrammeLinkId) : clientId;
      router.push(profileProgrammesHref('programmes', editKey));
    },
    [programmeLinks, router],
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-hwseta-green mb-2">Programmes</p>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
          View your enrolled programmes. Use <span className="font-medium text-slate-800">Manage Programmes</span> to
          update your records on My Profile.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div>
      ) : null}

      {programmesMissingProofEvidenceRows.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50/95 p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <FaExclamationTriangle className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-amber-950 sm:text-base">Proof of evidence still needed</h3>
              <p className="mt-1 text-sm text-amber-900/90">
                The following programme(s) are marked <span className="font-semibold">Completed</span> but have no proof
                documents uploaded yet. You can upload them when you are ready by choosing{' '}
                <span className="font-semibold">Manage Programmes</span>, then adding files under proof of evidence.
              </p>
              <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm font-medium text-amber-950">
                {programmesMissingProofEvidenceRows.map((row) => (
                  <li key={row.clientId}>
                    <span className="font-semibold">{getProgrammeRowDisplayName(row)}</span>
                    {' — '}
                    completed, but no proof of evidence uploaded.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Loading your programmes…
        </div>
      ) : (
        <MyProgrammesListCard
          programmeLinks={programmeLinks}
          programmeOptions={programmeOptions}
          qualificationNameById={qualificationNameById}
          actionsMode="editOnly"
          showAddProgrammeButton
          onAddProgramme={goToProfileProgrammes}
          onEditRow={goToProfileEditRow}
        />
      )}
    </div>
  );
}
