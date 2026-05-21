'use client';

import React, { useState, useEffect } from 'react';
import { Target } from 'lucide-react';

interface ProgressMetricsProps {
    profileCompletion: number;
    questionnaireCompletion: number;
    documentCount: number;
    coachingCount: number;
    workshopCount: number;
}

const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const ProgressMetrics: React.FC<ProgressMetricsProps> = ({
    profileCompletion,
    questionnaireCompletion,
    documentCount,
    coachingCount,
    workshopCount
}) => {
    // Calculate overall completion (0–100)
    const overallCompletion = Math.max(0, Math.min(100, Math.round(
        (profileCompletion + questionnaireCompletion +
         Math.min(documentCount * 10, 100) +
         Math.min(coachingCount * 20, 100) +
         Math.min(workshopCount * 10, 100)) / 5
    )));

    const [animatedCompletion, setAnimatedCompletion] = useState(0);

    // Animate donut from 0 to target (same pattern as company-info Profile Completion)
    useEffect(() => {
        setAnimatedCompletion(0);
        const id = requestAnimationFrame(() => {
            setAnimatedCompletion(overallCompletion);
        });
        return () => cancelAnimationFrame(id);
    }, [overallCompletion]);

    const strokeDash = (animatedCompletion / 100) * CIRCUMFERENCE;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative h-full flex flex-col w-full">
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
            <div className="relative z-10 flex flex-col flex-1">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                        <Target className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Overall Progress</h3>
                </div>
                <div className="flex items-center justify-center flex-1 w-full">
                <div className="relative w-48 h-48">
                    <svg className="transform -rotate-90 w-48 h-48">
                        <circle
                            cx="96"
                            cy="96"
                            r={RADIUS}
                            stroke="#e5e7eb"
                            strokeWidth="16"
                            fill="none"
                        />
                        <circle
                            cx="96"
                            cy="96"
                            r={RADIUS}
                            stroke="#14b8a6"
                            strokeWidth="16"
                            fill="none"
                            strokeDasharray={`${strokeDash} ${CIRCUMFERENCE}`}
                            strokeLinecap="round"
                            className="transition-all duration-[2500ms] ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-teal-600 transition-all duration-[2500ms] ease-out tabular-nums">{Math.round(animatedCompletion)}%</div>
                            <div className="text-sm text-gray-600">Complete</div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
};

