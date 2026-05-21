'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { AdminDashboardStats } from '@/types/admin-dashboard';

interface AdminMetricsProps {
    stats: AdminDashboardStats;
}

export const AdminMetrics: React.FC<AdminMetricsProps> = ({ stats }) => {
    // Calculate overall system completion based on averages
    const overallCompletion = Math.round(
        (stats.companies.averageCompletion + 
         stats.questionnaires.averageCompletion + 
         Math.min((stats.documents.averagePerCompany / 15) * 100, 100) + 
         Math.min((stats.coaching.averagePerCompany / 5) * 100, 100) + 
         Math.min((stats.workshops.averagePerCompany / 5) * 100, 100)) / 5
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative h-full flex flex-col w-full">
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">System-Wide Progress</h4>
                </div>
                <div className="flex items-center justify-center flex-1 w-full">
                <div className="relative w-48 h-48">
                    <svg className="transform -rotate-90 w-48 h-48">
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="#e2e8f0"
                            strokeWidth="16"
                            fill="none"
                        />
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="#10b981"
                            strokeWidth="16"
                            fill="none"
                            strokeDasharray={`${(overallCompletion / 100) * 2 * Math.PI * 88} ${2 * Math.PI * 88}`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-emerald-600">{overallCompletion}%</div>
                            <div className="text-sm text-slate-600">System Average</div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

