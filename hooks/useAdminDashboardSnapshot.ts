import { useQuery } from '@tanstack/react-query';
import { getAdminDashboardSnapshot } from '@/api/adminDashboard';

export const adminDashboardSnapshotKeys = {
  all: ['admin-dashboard-snapshot'] as const,
  snapshot: (monthlyMonths: number, topProvinces: number) =>
    [...adminDashboardSnapshotKeys.all, monthlyMonths, topProvinces] as const,
};

export function useAdminDashboardSnapshot(monthlyMonths = 12, topProvinces = 10) {
  return useQuery({
    queryKey: adminDashboardSnapshotKeys.snapshot(monthlyMonths, topProvinces),
    queryFn: () => getAdminDashboardSnapshot({ monthlyMonths, topProvinces }),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
