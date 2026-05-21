import { useQuery } from '@tanstack/react-query';
import { getAdminDashboardStats } from '@/services/adminDashboardService';
import { AdminDashboardStats } from '@/types/admin-dashboard';

// Query key for admin dashboard stats
export const adminDashboardKeys = {
    all: ['adminDashboard'] as const,
    stats: () => [...adminDashboardKeys.all, 'stats'] as const,
};

/**
 * Hook to fetch admin dashboard statistics
 * Currently uses mock data service, but structured to easily swap with API call
 * 
 * @returns Query result with admin dashboard stats, loading, and error states
 */
export const useAdminDashboard = () => {
    return useQuery<AdminDashboardStats>({
        queryKey: adminDashboardKeys.stats(),
        queryFn: getAdminDashboardStats,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    });
};

