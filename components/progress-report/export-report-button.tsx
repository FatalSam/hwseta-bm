'use client';

import React, { useState } from 'react';
import { FileText, Printer, Loader2 } from 'lucide-react';
import { SubmittedQuestionnaireSummary } from '@/types/questionnaire';

interface CoachingAssignment {
    assignmentTitle: string;
    dateSubmitted?: string;
    isVerified: boolean;
}

interface Workshop {
    title: string;
    dateAttended: string;
}

interface ExportReportButtonProps {
    reportData: {
        companyName: string;
        profileCompletion: number;
        questionnaireSummaries: SubmittedQuestionnaireSummary[];
        coachingAssignments: CoachingAssignment[];
        workshops: Workshop[];
        totalCost: number;
        fundingRequested: number;
        documentCounts: Record<string, number>;
    };
}

export const ExportReportButton: React.FC<ExportReportButtonProps> = ({ reportData }) => {
    const [isExporting, setIsExporting] = useState(false);

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        setIsExporting(true);
        try {
            // Prepare CSV data
            const csvRows: string[] = [];
            
            // Header
            csvRows.push('Progress Report');
            csvRows.push(`Company: ${reportData.companyName}`);
            csvRows.push(`Generated: ${new Date().toLocaleDateString()}`);
            csvRows.push('');
            
            // Summary
            csvRows.push('Summary');
            csvRows.push(`Profile Completion,${reportData.profileCompletion}%`);
            csvRows.push(`Total Cost,R${reportData.totalCost.toLocaleString()}`);
            csvRows.push(`Funding Requested,R${reportData.fundingRequested.toLocaleString()}`);
            csvRows.push('');
            
            // Gap Analysis
            csvRows.push('Gap Analysis History');
            csvRows.push('Reference,Date Submitted,Completion %,Cost,Status');
            reportData.questionnaireSummaries.forEach(q => {
                csvRows.push([
                    q.referenceNumber || `#${q.surveyHeaderId}`,
                    q.dateSubmitted || 'N/A',
                    `${q.completionPercentage || 0}%`,
                    `R${(q.totalCost || 0).toLocaleString()}`,
                    q.status || 'Submitted'
                ].join(','));
            });
            
            // Create and download
            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `progress-report-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('Failed to export CSV. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <button
                onClick={handlePrint}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                disabled={isExporting}
            >
                <Printer className="w-4 h-4" />
                <span>Print</span>
            </button>
            
            <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
                {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <FileText className="w-4 h-4" />
                )}
                <span>Export CSV</span>
            </button>
        </div>
    );
};

