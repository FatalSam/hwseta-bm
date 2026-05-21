'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { BarChart2, Building2, FileText, GraduationCap, Target } from 'lucide-react';

interface ProgressDetailedProps {
    profileCompletion: number;
    questionnaireCompletion: number;
    documentCount: number;
    coachingCount: number;
    workshopCount: number;
}

const BAR_GRADIENTS: Record<string, { gradient: string; shadow: string; border: string }> = {
    'bg-blue-500': { gradient: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)', shadow: '0 2px 8px rgba(59, 130, 246, 0.4)', border: 'border-blue-500' },
    'bg-green-500': { gradient: 'linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #15803d 100%)', shadow: '0 2px 8px rgba(34, 197, 94, 0.4)', border: 'border-green-500' },
    'bg-orange-500': { gradient: 'linear-gradient(90deg, #f97316 0%, #ea580c 50%, #c2410c 100%)', shadow: '0 2px 8px rgba(249, 115, 22, 0.4)', border: 'border-orange-500' },
    'bg-red-500': { gradient: 'linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)', shadow: '0 2px 8px rgba(239, 68, 68, 0.4)', border: 'border-red-500' },
    'bg-purple-500': { gradient: 'linear-gradient(90deg, #a855f7 0%, #9333ea 50%, #7e22ce 100%)', shadow: '0 2px 8px rgba(168, 85, 247, 0.4)', border: 'border-purple-500' },
};

export const ProgressDetailed: React.FC<ProgressDetailedProps> = ({
    profileCompletion,
    questionnaireCompletion,
    documentCount,
    coachingCount,
    workshopCount
}) => {
    // Individual progress bars with target values
    const progressItems = useMemo(() => [
        { label: 'Profile Completion', value: profileCompletion, icon: Building2, color: 'bg-blue-500' },
        { label: 'Gap Analysis Completion', value: questionnaireCompletion, icon: FileText, color: 'bg-green-500' },
        { label: 'Documents Uploaded', value: Math.min(documentCount * 10, 100), icon: FileText, color: 'bg-orange-500' },
        { label: 'Coaching Assignments', value: Math.min(coachingCount * 20, 100), icon: GraduationCap, color: 'bg-red-500' },
        { label: 'Workshops Attended', value: Math.min(workshopCount * 10, 100), icon: Target, color: 'bg-purple-500' },
    ], [profileCompletion, questionnaireCompletion, documentCount, coachingCount, workshopCount]);

    const targetValues = useMemo(() => progressItems.map(item => Math.max(0, Math.min(100, item.value))), [progressItems]);

    const [animatedValues, setAnimatedValues] = useState<number[]>(() => targetValues.map(() => 0));

    // Animate progress bars from 0 to target (same pattern as company-info Profile Completion)
    useEffect(() => {
        setAnimatedValues(targetValues.map(() => 0));
        const id = requestAnimationFrame(() => {
            setAnimatedValues(targetValues);
        });
        return () => cancelAnimationFrame(id);
    }, [targetValues]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
            <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                        <BarChart2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Detailed Progress</h3>
                </div>
                <div className="space-y-4">
                {progressItems.map((item, index) => {
                    const Icon = item.icon;
                    const animated = animatedValues[index] ?? 0;
                    const style = BAR_GRADIENTS[item.color] ?? BAR_GRADIENTS['bg-blue-500'];
                    return (
                        <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Icon className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
                            </div>
                            <div className="relative w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="relative h-full rounded-full transition-all duration-[2500ms] ease-out shadow-lg"
                                    style={{
                                        width: `${animated}%`,
                                        background: style.gradient,
                                        boxShadow: style.shadow
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse" />
                                </div>
                                {animated > 0 && (
                                    <div
                                        className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-2 shadow-lg transform transition-all duration-[2500ms] ease-out z-10 ${style.border}`}
                                        style={{ left: `calc(${animated}% - 10px)` }}
                                    >
                                        <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${item.color}`} />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                </div>
            </div>
        </div>
    );
};

