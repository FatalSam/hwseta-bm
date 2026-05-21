'use client';

import React from 'react';
import { Trends } from '@/types/admin-dashboard';
import { Building2, FileText } from 'lucide-react';

interface AdminTrendsProps {
    trends: Trends;
}

export const AdminTrends: React.FC<AdminTrendsProps> = ({ trends }) => {
    // Format company registration trends
    const companyRegistrations = trends.companyRegistrations.map(item => ({
        label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: item.count || 0
    }));

    const maxRegValue = companyRegistrations.length > 0 ? Math.max(...companyRegistrations.map(d => d.value)) : 0;

    // Format gap analysis submission trends
    const gapAnalysisSubmissions = trends.gapAnalysisSubmissions.map(item => ({
        label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: item.count || 0
    }));

    const maxGapValue = gapAnalysisSubmissions.length > 0 ? Math.max(...gapAnalysisSubmissions.map(d => d.value)) : 0;

    return (
        <div className="space-y-5">
            {/* Company Registration Trend */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Company Registration Trend</h4>
                </div>
                {companyRegistrations.length > 0 ? (
                    <div className="space-y-3">
                        {companyRegistrations.map((item, index) => (
                            <div key={index} className="flex items-center space-x-3">
                                <div className="w-20 text-sm text-slate-600 truncate">
                                    {item.label}
                                </div>
                                <div className="flex-1 bg-slate-200 rounded-full h-3 relative">
                                    <div
                                        className="h-3 rounded-full transition-all duration-1000 bg-green-500"
                                        style={{
                                            width: maxRegValue > 0 ? `${(item.value / maxRegValue) * 100}%` : '0%'
                                        }}
                                    />
                                </div>
                                <div className="w-12 text-sm font-medium text-slate-900 text-right">
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No registration trend data available yet.</p>
                    </div>
                )}
                </div>
            </div>

            {/* Gap Analysis Submission Trend */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                        <FileText className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Gap Analysis Submission Trend</h4>
                </div>
                {gapAnalysisSubmissions.length > 0 ? (
                    <div className="space-y-3">
                        {gapAnalysisSubmissions.map((item, index) => (
                            <div key={index} className="flex items-center space-x-3">
                                <div className="w-20 text-sm text-slate-600 truncate">
                                    {item.label}
                                </div>
                                <div className="flex-1 bg-slate-200 rounded-full h-3 relative">
                                    <div
                                        className="h-3 rounded-full transition-all duration-1000 bg-purple-500"
                                        style={{
                                            width: maxGapValue > 0 ? `${(item.value / maxGapValue) * 100}%` : '0%'
                                        }}
                                    />
                                </div>
                                <div className="w-12 text-sm font-medium text-slate-900 text-right">
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No gap analysis submission trend data available yet.</p>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

