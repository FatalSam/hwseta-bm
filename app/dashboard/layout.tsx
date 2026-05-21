'use client';

import DashboardLayoutComponent from "@/components/dashbaord-layout";
import AuthGuard from "@/components/auth-guard";
import DashboardRoleGuard from "@/components/dashboard-role-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <DashboardRoleGuard>
                <DashboardLayoutComponent>
                    {children}
                </DashboardLayoutComponent>
            </DashboardRoleGuard>
        </AuthGuard>
    );
}
