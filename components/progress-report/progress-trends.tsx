'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { SubmittedQuestionnaireSummary } from '@/types/questionnaire';
import { TrendingUp } from 'lucide-react';

interface ProgressTrendsProps {
    questionnaireSummaries: SubmittedQuestionnaireSummary[];
    profileCompletionHistory?: Array<{ date: string; value: number }>;
}

export const ProgressTrends: React.FC<ProgressTrendsProps> = ({
    questionnaireSummaries
}) => {
    // Process cost trends
    const costTrends = useMemo(() => {
        if (!questionnaireSummaries || questionnaireSummaries.length === 0) {
            return [];
        }

        const completed = questionnaireSummaries
            .filter(q => q.status === 'Completed' && q.dateSubmitted)
            .sort((a, b) => new Date(a.dateSubmitted).getTime() - new Date(b.dateSubmitted).getTime())
            .slice(-10);

        return completed.map(q => ({
            label: new Date(q.dateSubmitted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: q.totalCost || 0
        }));
    }, [questionnaireSummaries]);

    const chartData = useMemo(() => costTrends.map(item => ({
        ...item,
        value: Math.round(item.value / 1000) // Convert to thousands for display
    })), [costTrends]);

    const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0;
    const targetWidths = useMemo(() =>
        chartData.map(item => (maxValue > 0 ? (item.value / maxValue) * 100 : 0)),
        [chartData, maxValue]
    );

    const [animatedWidths, setAnimatedWidths] = useState<number[]>(() => targetWidths.map(() => 0));

    // Animate progress bars from 0 to target (same pattern as company-info Profile Completion)
    useEffect(() => {
        setAnimatedWidths(targetWidths.map(() => 0));
        const id = requestAnimationFrame(() => {
            setAnimatedWidths(targetWidths);
        });
        return () => cancelAnimationFrame(id);
    }, [targetWidths]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
            <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Cost of Formalisation Trend (R&apos;000s)</h3>
                </div>
                {costTrends.length > 0 ? (
                <div className="space-y-3">
                    {chartData.map((item, index) => (
                        <div key={index} className="flex items-center space-x-3">
                            <div className="w-20 text-sm text-gray-600 truncate">
                                {item.label}
                            </div>
                            <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden shadow-inner">
                                <div
                                    className="relative h-full rounded-full transition-all duration-[2500ms] ease-out shadow-lg"
                                    style={{
                                        width: `${animatedWidths[index] ?? 0}%`,
                                        background: 'linear-gradient(90deg, #10b981 0%, #059669 50%, #047857 100%)',
                                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse" />
                                </div>
                            </div>
                            <div className="w-12 text-sm font-medium text-gray-900 text-right">
                                {item.value}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No trend data available yet. Complete gap analysis to see progress trends.</p>
                </div>
            )}
            </div>
        </div>
    );
};

