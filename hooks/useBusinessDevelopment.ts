import { useQuery } from '@tanstack/react-query';
import { getBusinessDevelopmentHeadersByCompanyID } from '@/api/companies';

export const useBusinessDevelopmentHeaders = (companyId: string) => {
    return useQuery({
        queryKey: ['businessDevelopmentHeaders', companyId],
        queryFn: () => getBusinessDevelopmentHeadersByCompanyID(companyId),
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
};