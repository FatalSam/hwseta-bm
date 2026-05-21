import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getAllCompanies, 
    getCompanyById, 
    createCompany, 
    updateCompany, 
    deleteCompany,
    getAllOwnershipByCompanyId,
    getOwnershipById,
    createOwnership,
    updateOwnership
} from '@/api/companies';
import { Company, Owner } from '@/types/companies';
import { adminDashboardKeys } from '@/hooks/useAdminDashboard';

// Query keys
export const companyKeys = {
    all: ['companies'] as const,
    lists: () => [...companyKeys.all, 'list'] as const,
    list: (filters: string) => [...companyKeys.lists(), { filters }] as const,
    details: () => [...companyKeys.all, 'detail'] as const,
    detail: (id: string) => [...companyKeys.details(), id] as const,
    ownership: () => [...companyKeys.all, 'ownership'] as const,
    ownershipList: (companyId: string) => [...companyKeys.ownership(), 'list', companyId] as const,
    ownershipDetail: (id: string) => [...companyKeys.ownership(), 'detail', id] as const,
};

export const useCompanies = () => {
    const queryClient = useQueryClient();

    // Get all companies
    const { data: companies, isLoading, error } = useQuery({
        queryKey: companyKeys.lists(),
        queryFn: getAllCompanies,
    });

    // Get company by ID
    const useCompany = (id: string) => {
        return useQuery({
            queryKey: companyKeys.detail(id),
            queryFn: () => getCompanyById(id),
            enabled: !!id,
        });
    };

    // Create company mutation
    const createCompanyMutation = useMutation({
        mutationFn: createCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
            queryClient.invalidateQueries({ queryKey: adminDashboardKeys.stats() });
        },
    });

    // Update company mutation
    const updateCompanyMutation = useMutation({
        mutationFn: ({ id, company }: { id: string; company: Company }) => 
            updateCompany(id, company),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
            queryClient.invalidateQueries({ queryKey: companyKeys.detail(data.companyID) });
            queryClient.invalidateQueries({ queryKey: adminDashboardKeys.stats() });
        },
    });

    // Delete company mutation
    const deleteCompanyMutation = useMutation({
        mutationFn: deleteCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
            queryClient.invalidateQueries({ queryKey: adminDashboardKeys.stats() });
        },
    });

    // Get all ownership by company ID
    const useCompanyOwnership = (companyId: string) => {
        return useQuery({
            queryKey: companyKeys.ownershipList(companyId),
            queryFn: () => getAllOwnershipByCompanyId(companyId),
            enabled: !!companyId,
        });
    };

    // Get ownership by ID
    const useOwnership = (id: string) => {
        return useQuery({
            queryKey: companyKeys.ownershipDetail(id),
            queryFn: () => getOwnershipById(id),
            enabled: !!id,
        });
    };

    // Create ownership mutation
    const createOwnershipMutation = useMutation({
        mutationFn: ({ id, ownership }: { id: string; ownership: Owner }) => 
            createOwnership(id, ownership),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: companyKeys.ownershipList(variables.id) });
        },
    });

    // Update ownership mutation
    const updateOwnershipMutation = useMutation({
        mutationFn: ({ ownershipId, ownership }: { ownershipId: string; ownership: Owner }) => 
            updateOwnership(ownershipId, ownership),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: companyKeys.ownershipDetail(data.companyID) });
        },
    });

    return {
        companies,
        isLoading,
        error,
        useCompany,
        useCompanyOwnership,
        useOwnership,
        createCompany: createCompanyMutation.mutate,
        updateCompany: updateCompanyMutation.mutate,
        updateCompanyAsync: updateCompanyMutation.mutateAsync,
        deleteCompany: deleteCompanyMutation.mutate,
        createOwnership: createOwnershipMutation.mutate,
        updateOwnership: updateOwnershipMutation.mutate,
        isCreating: createCompanyMutation.isPending,
        isUpdating: updateCompanyMutation.isPending,
        isDeleting: deleteCompanyMutation.isPending,
        isCreatingOwnership: createOwnershipMutation.isPending,
        isUpdatingOwnership: updateOwnershipMutation.isPending,
    };
};
