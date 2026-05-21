import { AdminDashboardStats } from '@/types/admin-dashboard';
import { getAllCompanies } from '@/api/companies';
import { getAllUsers } from '@/api/users';

/** Normalise company status for grouping: trim and use title case; use "Unknown" when missing. */
function normaliseCompanyStatus(status: string | null | undefined): string {
    const s = (status ?? '').trim();
    if (!s) return 'Unknown';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** True if the given date string falls in the current month (UTC). */
function isCurrentMonth(dateStr: string | null | undefined): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
}

/**
 * Fetches admin dashboard statistics.
 * Company and user stats are derived from GetAllCompanies and GetAllUsers (system-wide).
 * Other sections (questionnaires, financial, documents, workshops, coaching, trends) use mock data until backend provides admin aggregate endpoints.
 *
 * @returns Promise<AdminDashboardStats> - Aggregated system-wide statistics
 */
export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
    const [companiesList, usersList] = await Promise.all([
        getAllCompanies(),
        getAllUsers()
    ]);

    const companies = Array.isArray(companiesList) ? companiesList : [];
    const users = Array.isArray(usersList) ? usersList : [];

    const byStatus: Record<string, number> = {};
    let activeCount = 0;
    let newThisMonthCount = 0;
    let completionSum = 0;
    let completionCount = 0;

    for (const c of companies) {
        const status = normaliseCompanyStatus(c.companyStatus);
        byStatus[status] = (byStatus[status] ?? 0) + 1;
        if (status === 'Active') activeCount++;
        if (isCurrentMonth(c.createdDate)) newThisMonthCount++;
        const score = c.totalCompletionScore;
        if (typeof score === 'number' && !isNaN(score)) {
            completionSum += score;
            completionCount++;
        }
    }

    const companyTotal = companies.length;
    const userTotal = users.length;
    const userActive = users.filter(u => u.isActive === true).length;
    const userNewThisMonth = users.filter(u => isCurrentMonth(u.createdDate)).length;

    const companiesStats = {
        total: companyTotal,
        active: activeCount,
        newThisMonth: newThisMonthCount,
        averageCompletion: completionCount > 0 ? completionSum / completionCount : 0,
        byStatus
    };

    const usersStats = {
        total: userTotal,
        active: userActive,
        newThisMonth: userNewThisMonth
    };

    // Generate date range for trends (last 6 months) - mock
    const generateTrendData = (baseValue: number, variance: number = 0.2) => {
        const data: Array<{ date: string; count?: number; value?: number }> = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now);
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const randomFactor = 1 + (Math.random() - 0.5) * variance;
            const value = Math.round(baseValue * randomFactor);
            
            data.push({
                date: monthStart.toISOString().split('T')[0],
                count: value,
                value: value
            });
        }
        return data;
    };

    const mockStats: AdminDashboardStats = {
        companies: companiesStats,
        users: usersStats,
        questionnaires: {
            total: 189,
            averageCompletion: 72.3,
            byStatus: {
                'Completed': 142,
                'Under Review': 28,
                'Submitted': 15,
                'Rejected': 4
            },
            averageScore: 68.7
        },
        financial: {
            totalCostOfFormalisation: 12450000, // R12,450,000
            totalFundingRequested: 45600000, // R45,600,000
            averageCostPerCompany: 50445.18
        },
        documents: {
            total: 2847,
            byCategory: {
                'Financial': 423,
                'Company': 512,
                'Branding': 389,
                'Development': 678,
                'Coaching': 445,
                'Workshops': 400
            },
            averagePerCompany: 11.5
        },
        workshops: {
            total: 892,
            participationRate: 78.5,
            averagePerCompany: 3.6
        },
        coaching: {
            total: 567,
            verified: 423,
            pending: 144,
            averagePerCompany: 2.3
        },
        trends: {
            companyRegistrations: generateTrendData(40, 0.3),
            gapAnalysisSubmissions: generateTrendData(32, 0.25),
            costTrends: generateTrendData(2000000, 0.15).map(item => ({
                date: item.date,
                value: item.value ? Math.round(item.value / 1000) : 0 // Convert to thousands
            })),
            profileCompletionTrends: generateTrendData(65, 0.1).map(item => ({
                date: item.date,
                value: item.value
            }))
        }
    };

    return mockStats;
};

