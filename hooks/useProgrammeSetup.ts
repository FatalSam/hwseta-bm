import { useCallback, useMemo } from 'react';
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as api from '@/api/programmeSetup';
import type {
  ProgrammeCreatePayload,
  ProgrammeUpdatePayload,
  UnitStandardRow,
  UserAuditId,
} from '@/types/programmeSetup';

export const programmeSetupKeys = {
  all: ['programmeSetup'] as const,
  programmes: (organisationId: number) =>
    [...programmeSetupKeys.all, 'programmes', organisationId] as const,
  programmeDetail: (id: string) => [...programmeSetupKeys.all, 'programme', id] as const,
  types: (organisationId: number) => [...programmeSetupKeys.all, 'types', organisationId] as const,
  subTypes: (organisationId: number, programmeTypeId: number) =>
    [...programmeSetupKeys.all, 'subTypes', organisationId, programmeTypeId] as const,
  setas: () => [...programmeSetupKeys.all, 'setas'] as const,
  accreditationBodies: () => [...programmeSetupKeys.all, 'accreditationBodies'] as const,
  nqfLevels: () => [...programmeSetupKeys.all, 'nqfLevels'] as const,
  subSectors: () => [...programmeSetupKeys.all, 'subSectors'] as const,
  qualifications: (organisationId: number, nqfLevelId: number | 'all') =>
    [...programmeSetupKeys.all, 'qualifications', organisationId, nqfLevelId] as const,
  unitStandards: (organisationId: number, qualificationId: number) =>
    [...programmeSetupKeys.all, 'unitStandards', organisationId, qualificationId] as const,
  docMappings: (
    organisationId: number,
    programmeTypeId: number | 'any',
    programmeId: number | 'any'
  ) =>
    [
      ...programmeSetupKeys.all,
      'docMappings',
      organisationId,
      programmeTypeId,
      programmeId,
    ] as const,
  setupDocTypes: () => [...programmeSetupKeys.all, 'setupDocTypes'] as const,
  programmeStatuses: () => [...programmeSetupKeys.all, 'programmeStatuses'] as const,
};

export function useProgrammesList(organisationId: number) {
  return useQuery({
    queryKey: programmeSetupKeys.programmes(organisationId),
    queryFn: () => api.listProgrammes(organisationId),
    enabled: organisationId > 0,
    retry: false,
  });
}

export function useProgrammeDetail(programmeId: string | null) {
  return useQuery({
    queryKey: programmeSetupKeys.programmeDetail(programmeId ?? ''),
    queryFn: () => api.getProgramme(programmeId!),
    enabled: programmeId != null && programmeId.length > 0,
    retry: false,
  });
}

export function useProgrammeMutations(organisationId: number) {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (body: ProgrammeCreatePayload) => api.createProgramme(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: programmeSetupKeys.programmes(organisationId) });
    },
  });

  const update = useMutation({
    mutationFn: ({
      programmeId,
      body,
    }: {
      programmeId: number | string;
      body: ProgrammeUpdatePayload;
    }) => api.updateProgramme(programmeId, body),
    onSuccess: (_d, { programmeId }) => {
      queryClient.invalidateQueries({ queryKey: programmeSetupKeys.programmes(organisationId) });
      queryClient.invalidateQueries({
        queryKey: programmeSetupKeys.programmeDetail(String(programmeId)),
      });
    },
  });

  const remove = useMutation({
    mutationFn: ({
      programmeId,
      modifiedByUserId,
    }: {
      programmeId: number | string;
      modifiedByUserId: UserAuditId;
    }) => api.deleteProgramme(programmeId, organisationId, modifiedByUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: programmeSetupKeys.programmes(organisationId) });
    },
  });

  return { create, update, remove };
}

export function useProgrammeTypesList(organisationId: number, includeInactive = true) {
  return useQuery({
    queryKey: [...programmeSetupKeys.types(organisationId), includeInactive] as const,
    queryFn: () => api.listProgrammeTypes(organisationId, includeInactive),
    enabled: organisationId > 0,
    retry: false,
  });
}

export function useProgrammeSubTypesList(
  organisationId: number,
  programmeTypeId: number,
  includeInactive = true
) {
  return useQuery({
    queryKey: [...programmeSetupKeys.subTypes(organisationId, programmeTypeId), includeInactive] as const,
    queryFn: () => api.listProgrammeSubTypes(organisationId, programmeTypeId, includeInactive),
    enabled: organisationId > 0 && programmeTypeId > 0,
    retry: false,
  });
}

export function useSetasList() {
  return useQuery({
    queryKey: programmeSetupKeys.setas(),
    queryFn: () => api.listSetas(true),
    retry: false,
  });
}

export function useAccreditationBodiesList(enabled = true) {
  return useQuery({
    queryKey: programmeSetupKeys.accreditationBodies(),
    queryFn: () => api.listAccreditationBodies(true),
    enabled,
    retry: false,
  });
}

export function useNqfLevelsList() {
  return useQuery({
    queryKey: programmeSetupKeys.nqfLevels(),
    queryFn: () => api.listNqfLevels(true),
    retry: false,
  });
}

export function useSubSectorsList() {
  return useQuery({
    queryKey: programmeSetupKeys.subSectors(),
    queryFn: () => api.listSubSectors(),
    retry: false,
  });
}

export function useQualificationsList(organisationId: number, nqfLevelId?: number) {
  const keyPart = nqfLevelId != null && nqfLevelId > 0 ? nqfLevelId : ('all' as const);
  return useQuery({
    queryKey: programmeSetupKeys.qualifications(organisationId, keyPart),
    queryFn: () => api.listQualifications(organisationId, nqfLevelId, true),
    enabled: organisationId > 0,
    retry: false,
  });
}

export function useUnitStandardsList(organisationId: number, qualificationId: number) {
  return useQuery({
    queryKey: programmeSetupKeys.unitStandards(organisationId, qualificationId),
    queryFn: () => api.listUnitStandards(organisationId, qualificationId, true),
    enabled: organisationId > 0 && qualificationId > 0,
    retry: false,
  });
}

/** Fetches unit standards for every qualification (API is per–qualification id). */
export function useAllUnitStandardsList(organisationId: number) {
  const { data: quals = [] } = useQualificationsList(organisationId);
  const qualIds = useMemo(
    () =>
      quals
        .map((q) => Number(q.qualificationId))
        .filter((id) => Number.isFinite(id) && id > 0),
    [quals],
  );
  const queries = useQueries({
    queries: qualIds.map((qualificationId) => ({
      queryKey: programmeSetupKeys.unitStandards(organisationId, qualificationId),
      queryFn: () => api.listUnitStandards(organisationId, qualificationId, true),
      enabled: organisationId > 0 && qualificationId > 0,
      retry: false,
    })),
  });
  const rows: UnitStandardRow[] = queries.flatMap((q) => (Array.isArray(q.data) ? q.data : []));
  const isLoading = qualIds.length > 0 && queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);
  const error = queries.find((q) => q.error)?.error ?? null;
  const queryClient = useQueryClient();
  const refetch = useCallback(() => {
    return queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === 'programmeSetup' &&
        q.queryKey[1] === 'unitStandards' &&
        q.queryKey[2] === organisationId,
    });
  }, [queryClient, organisationId]);
  return { rows, quals, qualIds, isLoading, isFetching, error, refetch };
}

export function useProgrammeDocumentMappingsList(
  organisationId: number,
  programmeTypeId?: number,
  programmeId?: number
) {
  const pt = programmeTypeId != null && programmeTypeId > 0 ? programmeTypeId : ('any' as const);
  const pid = programmeId != null && programmeId > 0 ? programmeId : ('any' as const);
  return useQuery({
    queryKey: programmeSetupKeys.docMappings(organisationId, pt, pid),
    queryFn: () => api.listProgrammeDocumentMappings(organisationId, programmeTypeId, programmeId),
    enabled: organisationId > 0,
    retry: false,
  });
}

export function useSetupDocumentTypesList() {
  return useQuery({
    queryKey: programmeSetupKeys.setupDocTypes(),
    queryFn: () => api.listSetupDocumentTypes(),
    retry: false,
  });
}

export function useProgrammeStatusesList() {
  return useQuery({
    queryKey: programmeSetupKeys.programmeStatuses(),
    queryFn: () => api.listProgrammeStatuses(),
    retry: false,
  });
}

export function useFrameworkMutations(organisationId: number) {
  const queryClient = useQueryClient();

  const invalidateTypes = () =>
    queryClient.invalidateQueries({ queryKey: programmeSetupKeys.types(organisationId) });
  const invalidateSubTypes = (programmeTypeId?: number) => {
    if (programmeTypeId != null && programmeTypeId > 0) {
      queryClient.invalidateQueries({
        queryKey: programmeSetupKeys.subTypes(organisationId, programmeTypeId),
      });
    } else {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'programmeSetup' &&
          q.queryKey[1] === 'subTypes' &&
          q.queryKey[2] === organisationId,
      });
    }
  };
  const invalidateSetas = () =>
    queryClient.invalidateQueries({ queryKey: programmeSetupKeys.setas() });
  const invalidateNqf = () =>
    queryClient.invalidateQueries({ queryKey: programmeSetupKeys.nqfLevels() });
  const invalidateSubSectors = () =>
    queryClient.invalidateQueries({ queryKey: programmeSetupKeys.subSectors() });
  const invalidateQualifications = () => {
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === 'programmeSetup' &&
        q.queryKey[1] === 'qualifications' &&
        q.queryKey[2] === organisationId,
    });
  };
  const invalidateUnitStandards = () => {
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === 'programmeSetup' &&
        q.queryKey[1] === 'unitStandards' &&
        q.queryKey[2] === organisationId,
    });
  };
  const invalidateDocMappings = () => {
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === 'programmeSetup' &&
        q.queryKey[1] === 'docMappings' &&
        q.queryKey[2] === organisationId,
    });
  };
  const invalidateSetupDocTypes = () =>
    queryClient.invalidateQueries({ queryKey: programmeSetupKeys.setupDocTypes() });

  return {
    createType: useMutation({
      mutationFn: api.createProgrammeType,
      onSuccess: invalidateTypes,
    }),
    updateType: useMutation({
      mutationFn: ({ id, body }: { id: number | string; body: Parameters<typeof api.updateProgrammeType>[1] }) =>
        api.updateProgrammeType(id, body),
      onSuccess: invalidateTypes,
    }),
    deleteType: useMutation({
      mutationFn: ({
        id,
        modifiedByUserId,
      }: {
        id: number | string;
        modifiedByUserId: UserAuditId;
      }) => api.deleteProgrammeType(id, organisationId, modifiedByUserId),
      onSuccess: invalidateTypes,
    }),
    createSubType: useMutation({
      mutationFn: api.createProgrammeSubType,
      onSuccess: (_d, v) => invalidateSubTypes(v.programmeTypeId),
    }),
    updateSubType: useMutation({
      mutationFn: ({
        id,
        body,
      }: {
        id: number | string;
        body: Parameters<typeof api.updateProgrammeSubType>[1];
      }) => api.updateProgrammeSubType(id, body),
      onSuccess: (_d, { body }) => invalidateSubTypes(body.programmeTypeId),
    }),
    deleteSubType: useMutation<
      void,
      unknown,
      { id: number | string; modifiedByUserId: UserAuditId }
    >({
      mutationFn: ({ id, modifiedByUserId }) =>
        api.deleteProgrammeSubType(id, organisationId, modifiedByUserId),
      onSuccess: () => invalidateSubTypes(),
    }),
    createSeta: useMutation({
      mutationFn: api.createSeta,
      onSuccess: invalidateSetas,
    }),
    updateSeta: useMutation({
      mutationFn: ({ id, body }: { id: number | string; body: Parameters<typeof api.updateSeta>[1] }) =>
        api.updateSeta(id, body),
      onSuccess: invalidateSetas,
    }),
    deleteSeta: useMutation({
      mutationFn: ({ id, modifiedByUserId }: { id: number | string; modifiedByUserId: UserAuditId }) =>
        api.deleteSeta(id, modifiedByUserId),
      onSuccess: invalidateSetas,
    }),
    createNqf: useMutation({
      mutationFn: api.createNqfLevel,
      onSuccess: invalidateNqf,
    }),
    updateNqf: useMutation({
      mutationFn: ({ id, body }: { id: number | string; body: Parameters<typeof api.updateNqfLevel>[1] }) =>
        api.updateNqfLevel(id, body),
      onSuccess: invalidateNqf,
    }),
    deleteNqf: useMutation({
      mutationFn: ({ id, modifiedByUserId }: { id: number | string; modifiedByUserId: UserAuditId }) =>
        api.deleteNqfLevel(id, modifiedByUserId),
      onSuccess: invalidateNqf,
    }),
    createSubSector: useMutation({
      mutationFn: api.createSubSector,
      onSuccess: invalidateSubSectors,
    }),
    updateSubSector: useMutation({
      mutationFn: ({
        id,
        body,
      }: {
        id: number | string;
        body: Parameters<typeof api.updateSubSector>[1];
      }) => api.updateSubSector(id, body),
      onSuccess: invalidateSubSectors,
    }),
    deleteSubSector: useMutation({
      mutationFn: ({ id }: { id: number | string }) => api.deleteSubSector(id),
      onSuccess: invalidateSubSectors,
    }),
    createQualification: useMutation({
      mutationFn: api.createQualification,
      onSuccess: invalidateQualifications,
    }),
    updateQualification: useMutation({
      mutationFn: ({
        id,
        body,
      }: {
        id: number | string;
        body: Parameters<typeof api.updateQualification>[1];
      }) => api.updateQualification(id, body),
      onSuccess: invalidateQualifications,
    }),
    deleteQualification: useMutation({
      mutationFn: ({
        id,
        modifiedByUserId,
      }: {
        id: number | string;
        modifiedByUserId: UserAuditId;
      }) => api.deleteQualification(id, organisationId, modifiedByUserId),
      onSuccess: invalidateQualifications,
    }),
    createUnitStandard: useMutation({
      mutationFn: api.createUnitStandard,
      onSuccess: invalidateUnitStandards,
    }),
    updateUnitStandard: useMutation({
      mutationFn: ({
        id,
        body,
      }: {
        id: number | string;
        body: Parameters<typeof api.updateUnitStandard>[1];
      }) => api.updateUnitStandard(id, body),
      onSuccess: invalidateUnitStandards,
    }),
    deleteUnitStandard: useMutation({
      mutationFn: ({
        id,
        modifiedByUserId,
      }: {
        id: number | string;
        modifiedByUserId: UserAuditId;
      }) => api.deleteUnitStandard(id, organisationId, modifiedByUserId),
      onSuccess: invalidateUnitStandards,
    }),
    createDocMapping: useMutation({
      mutationFn: api.createProgrammeDocumentMapping,
      onSuccess: invalidateDocMappings,
    }),
    updateDocMapping: useMutation({
      mutationFn: ({
        id,
        body,
      }: {
        id: number | string;
        body: Parameters<typeof api.updateProgrammeDocumentMapping>[1];
      }) => api.updateProgrammeDocumentMapping(id, body),
      onSuccess: invalidateDocMappings,
    }),
    deleteDocMapping: useMutation({
      mutationFn: ({ id }: { id: number | string }) =>
        api.deleteProgrammeDocumentMapping(id, organisationId),
      onSuccess: invalidateDocMappings,
    }),
    createSetupDocType: useMutation({
      mutationFn: api.createSetupDocumentType,
      onSuccess: invalidateSetupDocTypes,
    }),
    updateSetupDocType: useMutation({
      mutationFn: ({
        id,
        body,
      }: {
        id: number | string;
        body: Parameters<typeof api.updateSetupDocumentType>[1];
      }) => api.updateSetupDocumentType(id, body),
      onSuccess: invalidateSetupDocTypes,
    }),
    deleteSetupDocType: useMutation({
      mutationFn: ({ id }: { id: number | string }) => api.deleteSetupDocumentType(id),
      onSuccess: invalidateSetupDocTypes,
    }),
  };
}
