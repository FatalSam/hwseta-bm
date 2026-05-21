'use client';

import React from 'react';
import { AdminDashboardStats } from '@/types/admin-dashboard';
import { DollarSign, Building2, FileText, GraduationCap, Target, CheckCircle, Clock } from 'lucide-react';

interface AdminBreakdownProps {
    stats: AdminDashboardStats;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Completed':
        case 'Active':
        case 'Verified':
            return 'bg-green-100 text-green-800';
        case 'Under Review':
        case 'Pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'Submitted':
            return 'bg-blue-100 text-blue-800';
        case 'Rejected':
        case 'Inactive':
        case 'Suspended':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

export const AdminBreakdown: React.FC<AdminBreakdownProps> = ({ stats }) => {
    return (
        <div className="space-y-5">
            {/* Financial Summary */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">System-Wide Financial Summary</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Cost of Formalisation</p>
                        <p className="text-2xl font-bold text-slate-900">
                            R{stats.financial.totalCostOfFormalisation.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Funding Requested</p>
                        <p className="text-2xl font-bold text-slate-900">
                            R{stats.financial.totalFundingRequested.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Average Cost per Company</p>
                        <p className="text-2xl font-bold text-slate-900">
                            R{stats.financial.averageCostPerCompany.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
                </div>
            </div>

            {/* Companies by Status */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Companies by Status</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(stats.companies.byStatus).map(([status, count]) => (
                        <div key={status} className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{status}</p>
                            <p className="text-2xl font-bold text-slate-900">{count}</p>
                            <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                {status}
                            </span>
                        </div>
                    ))}
                </div>
                </div>
            </div>

            {/* Gap Analysis by Status */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                        <FileText className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Gap Analysis by Status</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(stats.questionnaires.byStatus).map(([status, count]) => (
                        <div key={status} className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{status}</p>
                            <p className="text-2xl font-bold text-slate-900">{count}</p>
                            <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                {status}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Average Completion</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.questionnaires.averageCompletion.toFixed(1)}%</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Average Score</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.questionnaires.averageScore.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>
                </div>
            </div>

            {/* Documents by Category */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                        <FileText className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Documents by Category</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {Object.entries(stats.documents.byCategory).map(([category, count]) => (
                        <div key={category} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{category}</p>
                            <p className="text-2xl font-bold text-slate-900">{count}</p>
                        </div>
                    ))}
                </div>
                <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Documents</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.documents.total.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Average per Company</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.documents.averagePerCompany.toFixed(1)}</p>
                        </div>
                    </div>
                </div>
                </div>
            </div>

            {/* Coaching Statistics */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Coaching Statistics</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Assignments</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.coaching.total}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Verified</p>
                        <p className="text-2xl font-bold text-green-600">{stats.coaching.verified}</p>
                        <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Verified
                        </span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.coaching.pending}</p>
                        <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Pending
                        </span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Avg per Company</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.coaching.averagePerCompany.toFixed(1)}</p>
                    </div>
                </div>
                </div>
            </div>

            {/* Workshop Statistics */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                        <Target className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Workshop Statistics</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Workshops</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.workshops.total}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Participation Rate</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.workshops.participationRate.toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Avg per Company</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.workshops.averagePerCompany.toFixed(1)}</p>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
};

