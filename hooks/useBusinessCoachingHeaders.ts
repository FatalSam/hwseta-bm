import { useQuery } from '@tanstack/react-query';
import { getCoachingHeadersByCompanyId } from '@/api/business-services';

export const useBusinessCoachingHeaders = (companyId: string) => {
    return useQuery({
        queryKey: ['businessCoachingHeaders', companyId],
        queryFn: () => getCoachingHeadersByCompanyId(companyId),
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error: any) => {
            // Don't retry on network errors or client errors (4xx)
            if (error?.code === 'ERR_NETWORK' || (error?.status && error.status >= 400 && error.status < 500)) {
                return false;
            }
            // Retry up to 2 times for server errors
            return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
};
