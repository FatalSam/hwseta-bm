export interface AdminDashboardSummary {
  totalBeneficiaries: number;
  activeBeneficiaries: number;
  inactiveBeneficiaries: number;
  totalProgrammeLinks: number;
  totalProgrammeDocuments: number;
}

export interface AdminDashboardDemographicRow {
  label: string;
  count: number;
  percentage?: number;
}

export interface AdminDashboardProvinceRow {
  province: string;
  count: number;
}

export interface AdminDashboardMonthlyRow {
  month: string;
  count: number;
}

export interface AdminDashboardTrends {
  beneficiariesYoYPercent?: number;
  beneficiariesMoMPercent?: number;
  programmeLinksYoYPercent?: number;
  programmeLinksMoMPercent?: number;
}

/** Counts from HW_Beneficiaries — aligned with profile Employment Status (Volunteering / employed / not employed). */
export interface AdminDashboardEmploymentStatus {
  currentlyEmployed: number;
  notEmployed: number;
  volunteering: number;
}

/** GET /api/Admin/dashboard/employment-type-status — EmploymentTypeStatus text buckets. */
export interface AdminDashboardEmploymentTypeStatus {
  totalBeneficiaries: number;
  employed: number;
  unemployed: number;
  volunteering: number;
  volunteeringWithStipend: number;
  otherOrUnspecified: number;
}

export interface AdminDashboardSnapshot {
  summary: AdminDashboardSummary;
  demographics: {
    gender: AdminDashboardDemographicRow[];
    ageBands: AdminDashboardDemographicRow[];
    raceGroups: AdminDashboardDemographicRow[];
  };
  topProvinces: AdminDashboardProvinceRow[];
  monthlyActivity: AdminDashboardMonthlyRow[];
  trends: AdminDashboardTrends;
  employmentStatus?: AdminDashboardEmploymentStatus;
}
