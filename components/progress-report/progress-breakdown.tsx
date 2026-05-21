'use client';

import React from 'react';
import { SubmittedQuestionnaireSummary } from '@/types/questionnaire';
import { Calendar, CheckCircle, Clock, DollarSign, FileText, GraduationCap, XCircle } from 'lucide-react';

interface ProgressBreakdownProps {
    questionnaireSummaries: SubmittedQuestionnaireSummary[];
    coachingAssignments: Array<{
        assignmentTitle: string;
        dateSubmitted?: string;
        isVerified: boolean;
    }>;
    workshops: Array<{
        title: string;
        dateAttended: string;
    }>;
    totalCost: number;
    fundingRequested: number;
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'Completed':
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'Under Review':
            return <Clock className="w-5 h-5 text-blue-500" />;
        case 'Submitted':
            return <FileText className="w-5 h-5 text-purple-500" />;
        case 'Rejected':
            return <XCircle className="w-5 h-5 text-red-500" />;
        default:
            return <Clock className="w-5 h-5 text-gray-500" />;
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Completed':
            return 'bg-green-100 text-green-800';
        case 'Under Review':
            return 'bg-blue-100 text-blue-800';
        case 'Submitted':
            return 'bg-purple-100 text-purple-800';
        case 'Rejected':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

export const ProgressBreakdown: React.FC<ProgressBreakdownProps> = ({
    questionnaireSummaries,
    coachingAssignments,
    workshops,
    totalCost,
    fundingRequested
}) => {
    // Sort questionnaires by date (newest first)
    const sortedQuestionnaires = [...(questionnaireSummaries || [])].sort((a, b) => 
        new Date(b.dateSubmitted || '').getTime() - new Date(a.dateSubmitted || '').getTime()
    );

    return (
        <div className="space-y-6">
            {/* Financial Summary */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Financial Summary</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Total Cost of Formalisation</p>
                        <p className="text-2xl font-bold text-gray-900">
                            R{totalCost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Funding Requested</p>
                        <p className="text-2xl font-bold text-gray-900">
                            R{fundingRequested.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
                </div>
            </div>

            {/* Gap Analysis History */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                            <FileText className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Gap Analysis History</h3>
                    </div>
                    {sortedQuestionnaires.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No gap analysis submitted yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Reference
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date Submitted
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Completion
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Cost
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sortedQuestionnaires.map((q) => (
                                    <tr key={q.surveyHeaderId} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {q.referenceNumber || `#${q.surveyHeaderId}`}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {q.dateSubmitted 
                                                ? new Date(q.dateSubmitted).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })
                                                : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div
                                                        className="bg-teal-600 h-2 rounded-full"
                                                        style={{ width: `${q.completionPercentage || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium">{q.completionPercentage || 0}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            R{(q.totalCost || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                {getStatusIcon(q.status)}
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(q.status)}`}>
                                                    {q.status || 'Submitted'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                </div>
            </div>

            {/* Coaching Assignments */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Coaching Assignments</h3>
                    </div>
                    {!coachingAssignments || coachingAssignments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No coaching assignments yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {coachingAssignments.map((assignment, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-gray-900">{assignment.assignmentTitle || `Assignment ${index + 1}`}</h4>
                                    {assignment.dateSubmitted && (
                                        <p className="text-xs text-gray-600 mt-1">
                                            Submitted: {new Date(assignment.dateSubmitted).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    )}
                                </div>
                                <div className="ml-4">
                                    {assignment.isVerified ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Verified
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            <Clock className="w-3 h-3 mr-1" />
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </div>
            </div>

            {/* Workshops Attended */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Workshops Attended</h3>
                    </div>
                    {!workshops || workshops.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No workshops attended yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {workshops.map((workshop, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-gray-900">{workshop.title || `Workshop ${index + 1}`}</h4>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Attended: {new Date(workshop.dateAttended).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div className="ml-4">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

