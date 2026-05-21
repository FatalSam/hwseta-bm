'use client';

import React, { useMemo, useState } from 'react';
import { useGetSurveyById, useGetSurveyHeaderTotals } from '@/hooks/useQuestionnaire';
import { SurveyQuestion } from '@/types/questionnaire';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/authStore';
import { FileText, DollarSign, Target, CheckCircle, AlertCircle, Download } from 'lucide-react';

interface QuestionnaireRoadmapProps {
    surveyHeaderId: number;
}

// Type definition for XLSX library (from CDN or npm)
interface XLSXWorksheet {
    '!cols'?: Array<{ wch?: number }>;
    [key: string]: unknown;
}

interface XLSXWorkbook {
    SheetNames: string[];
    Sheets: { [sheet: string]: XLSXWorksheet };
}

interface XLSXType {
    utils: {
        book_new: () => XLSXWorkbook;
        aoa_to_sheet: (data: unknown[][]) => XLSXWorksheet;
        book_append_sheet: (workbook: XLSXWorkbook, worksheet: XLSXWorksheet, name: string) => void;
    };
    writeFile: (workbook: XLSXWorkbook, filename: string) => void;
}

interface WindowWithXLSX extends Window {
    XLSX?: XLSXType;
}

const QuestionnaireRoadmap: React.FC<QuestionnaireRoadmapProps> = ({
    surveyHeaderId
}) => {

    
    const {
        data: surveyData,
        isLoading,
        error
    } = useGetSurveyById(String(surveyHeaderId));
    const questions = useMemo(() => surveyData?.questions || [], [surveyData?.questions]);
    const [expandAll, setExpandAll] = useState<boolean>(false);
    const { user } = useAuthStore();
    const { data: headerTotals } = useGetSurveyHeaderTotals(user?.companyID || '', surveyHeaderId);

    // Group questions by section and subsection using useMemo (same as feedback page)
    const groupedQuestions = useMemo(() => {
        if (!questions || questions.length === 0) {
            return {};
        }

        const grouped: { [sectionName: string]: { [subsectionName: string]: SurveyQuestion[] } } = {};
        
        // Group questions by questionCode first
        const questionsByCode: { [code: string]: SurveyQuestion[] } = {};
        questions.forEach(question => {
            if (!questionsByCode[question.questionCode]) {
                questionsByCode[question.questionCode] = [];
            }
            questionsByCode[question.questionCode].push(question);
        });
        
        // For each unique questionCode, take the first question as the base
        // and attach all cost items to it
        Object.values(questionsByCode).forEach(codeQuestions => {
            const baseQuestion = { ...codeQuestions[0] };
            baseQuestion.costOptions = codeQuestions.map(q => ({
                costItem: q.costItem,
                costPrice: q.costPrice,
                categoryQuestionID: q.categoryQuestionID,
                costItemID: q.costItemID
            }));
            
            if (!grouped[baseQuestion.sectionName]) {
                grouped[baseQuestion.sectionName] = {};
            }
            if (!grouped[baseQuestion.sectionName][baseQuestion.subsectionName]) {
                grouped[baseQuestion.sectionName][baseQuestion.subsectionName] = [];
            }
            grouped[baseQuestion.sectionName][baseQuestion.subsectionName].push(baseQuestion);
        });
        
        return grouped;
    }, [questions]);

    // Summary metrics
    const summary = useMemo(() => {
        // Use new header totals endpoint for authoritative values
        const totalQuestions = headerTotals?.totalQuestions ?? (questions ? new Set(questions.map(q => q.questionCode)).size : 0);
        const totalCost = headerTotals?.totalHelpAmount ?? (questions?.reduce((sum, q) => sum + (Number(q.costPrice) || 0), 0) ?? 0);
        const sectionCount = Object.keys(groupedQuestions || {}).length;
        const subsectionCount = Object.values(groupedQuestions || {}).reduce((acc, subs) => acc + Object.keys(subs).length, 0);
        const totalYes = headerTotals?.totalYes ?? undefined;
        const totalNo = headerTotals?.totalNo ?? undefined;
        const totalSurveyScore = headerTotals?.totalSurveyScore ?? undefined;
        return { totalQuestions, totalCost, sectionCount, subsectionCount, totalYes, totalNo, totalSurveyScore };
    }, [questions, groupedQuestions, headerTotals]);

    // Yes/No split (QuestionValue 0 = No; others = Yes). Use multiple fallbacks.
    const yesNo = useMemo(() => {
        const total = summary.totalQuestions || 0;
        if (typeof summary.totalYes === 'number' && typeof summary.totalNo === 'number') {
            return { yes: summary.totalYes, no: summary.totalNo };
        }
        // fallback to infer
        const numNo = (questions || []).reduce((acc, q: SurveyQuestion | Record<string, unknown>) => {
            const record = q as Record<string, unknown>;
            const v = record?.questionValue ?? record?.answer;
            if (v === 0 || v === 'No' || v === false) return acc + 1;
            return acc;
        }, 0);
        const clampedNo = Math.max(0, Math.min(total, numNo));
        const numYes = Math.max(0, total - clampedNo);
        return { yes: numYes, no: clampedNo };
    }, [questions, summary.totalQuestions, summary.totalYes, summary.totalNo]);

    const totalYesNo = yesNo.yes + yesNo.no;
    const yesPercentage = totalYesNo > 0 ? (yesNo.yes / totalYesNo) * 100 : 0;
    const noPercentage = totalYesNo > 0 ? (yesNo.no / totalYesNo) * 100 : 0;

    // Cost of Formalisation per section
    const sectionCosts = useMemo(() => {
        const costs: Record<string, number> = {};
        if (!groupedQuestions) return costs;

        Object.entries(groupedQuestions).forEach(([sectionName, subsections]) => {
            let total = 0;
            Object.values(subsections).forEach((sectionQuestions) => {
                sectionQuestions.forEach((question) => {
                    if (question.costOptions && question.costOptions.length > 0) {
                        question.costOptions.forEach((option) => {
                            total += Number(option.costPrice) || 0;
                        });
                    }
                });
            });
            costs[sectionName] = total;
        });

        return costs;
    }, [groupedQuestions]);

    const handleDownloadExcel = async () => {
        if (typeof window === 'undefined') return;

        try {
            // Load xlsx from CDN to avoid Turbopack/Next.js module resolution issues
            const win = window as WindowWithXLSX;
            let XLSX: XLSXType | undefined = win.XLSX;
            
            // If not already loaded, load from CDN
            if (!XLSX) {
                await new Promise<void>((resolve, reject) => {
                    // Check again in case it was loaded by another script
                    if (win.XLSX) {
                        XLSX = win.XLSX;
                        resolve();
                        return;
                    }
                    
                    const script = document.createElement('script');
                    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
                    script.onload = () => {
                        XLSX = win.XLSX;
                        if (!XLSX) {
                            reject(new Error('XLSX not found after loading script'));
                        } else {
                            resolve();
                        }
                    };
                    script.onerror = () => {
                        reject(new Error('Failed to load xlsx from CDN'));
                    };
                    document.head.appendChild(script);
                });
            }

            if (!XLSX) {
                throw new Error('XLSX library not available');
            }

            // Create a new workbook
            const workbook = XLSX.utils.book_new();

            // Summary Sheet
            const summaryData = [
                ['Gap Analysis Roadmap - Summary'],
                ['Generated on', new Date().toLocaleString()],
                [],
                ['Metric', 'Value'],
                ['Gap Analysis Score', typeof summary.totalSurveyScore === 'number' ? `${summary.totalSurveyScore}%` : '-'],
                ['Cost of Formalisation', `R${summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['Total Questions', summary.totalQuestions],
                ['Yes Answers', yesNo.yes],
                ['No Answers', yesNo.no],
                ['Yes Percentage', `${yesPercentage.toFixed(1)}%`],
                ['No Percentage', `${noPercentage.toFixed(1)}%`],
                ['Total Sections', summary.sectionCount],
                ['Total Subsections', summary.subsectionCount],
            ];

            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }]; // Set column widths
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

            // Section Costs Sheet
            const sectionCostsData = [
                ['Section', 'Cost of Formalisation'],
                ...Object.entries(sectionCosts).map(([sectionName, cost]) => [
                    sectionName,
                    `R${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ])
            ];

            const sectionCostsSheet = XLSX.utils.aoa_to_sheet(sectionCostsData);
            sectionCostsSheet['!cols'] = [{ wch: 40 }, { wch: 25 }]; // Set column widths
            XLSX.utils.book_append_sheet(workbook, sectionCostsSheet, 'Section Costs');

            // Detailed Questions Sheet
            const detailedData = [
                ['Section', 'Subsection', 'Question Code', 'Question Text', 'Cost Item', 'Cost Price', 'Importance', 'Resources', 'Section Description']
            ];

            Object.entries(groupedQuestions || {}).forEach(([sectionName, subsections]) => {
                Object.entries(subsections).forEach(([subsectionName, sectionQuestions]) => {
                    sectionQuestions.forEach((question) => {
                        const sectionDescription = questions?.find(q => q.sectionName === sectionName)?.sectionDescription ?? '';
                        
                        if (question.costOptions && question.costOptions.length > 0) {
                            // Add a row for each cost option
                            question.costOptions.forEach((option, index) => {
                                detailedData.push([
                                    index === 0 ? sectionName : '', // Only show section name on first row
                                    index === 0 ? subsectionName : '', // Only show subsection name on first row
                                    index === 0 ? question.questionCode : '', // Only show question code on first row
                                    index === 0 ? question.questionText : '', // Only show question text on first row
                                    option.costItem || '',
                                    `R${Number(option.costPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                    index === 0 ? (question.importance || '') : '',
                                    index === 0 ? (question.resources || '') : '',
                                    index === 0 ? sectionDescription : ''
                                ]);
                            });
                        } else {
                            // Add a row for questions without cost options
                            detailedData.push([
                                sectionName,
                                subsectionName,
                                question.questionCode,
                                question.questionText,
                                '',
                                '',
                                question.importance || '',
                                question.resources || '',
                                sectionDescription
                            ]);
                        }
                    });
                });
            });

            const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
            
            // Set column widths for better readability
            const colWidths = [
                { wch: 25 }, // Section
                { wch: 25 }, // Subsection
                { wch: 15 }, // Question Code
                { wch: 50 }, // Question Text
                { wch: 30 }, // Cost Item
                { wch: 15 }, // Cost Price
                { wch: 20 }, // Importance
                { wch: 40 }, // Resources
                { wch: 40 }  // Section Description
            ];
            detailedSheet['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed Analysis');

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `Gap_Analysis_Roadmap_${surveyHeaderId}_${timestamp}.xlsx`;

            // Write the file
            XLSX.writeFile(workbook, filename);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Failed to export Excel file. Please try again.');
        }
    };

    const handleDownloadPdf = () => {
        if (typeof window === 'undefined') return;

        const reportWindow = window.open('', '_blank');
        if (!reportWindow) return;

        const createdDate = new Date().toLocaleString();

        const sectionsHtml = Object.entries(groupedQuestions || {}).map(([sectionName, subsections]) => {
            const sectionTotal = sectionCosts[sectionName] ?? 0;
            const sectionDescription = questions?.find(q => q.sectionName === sectionName)?.sectionDescription ?? '';

            const subsectionsHtml = Object.entries(subsections).map(([subsectionName, sectionQuestions]) => {
                const questionsHtml = sectionQuestions.map((question) => {
                    const costItemsHtml = (question.costOptions || [])
                        .map(option => `
                            <div class="cost-item">
                                <div class="cost-item-header">
                                    <span class="cost-item-name">${option.costItem}</span>
                                    <span class="cost-item-price">R${Number(option.costPrice || 0).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}</span>
                                </div>
                            </div>
                        `)
                        .join('');

                    return `
                        <div class="question-card">
                            <div class="question-code">${question.questionCode}</div>
                            <div class="question-text">${question.questionText}</div>
                            ${costItemsHtml ? `<div class="cost-items">${costItemsHtml}</div>` : ''}
                        </div>
                    `;
                }).join('');

                return `
                    <div class="subsection">
                        <h3 class="subsection-title">${subsectionName} <span class="subsection-meta">${sectionQuestions.length} questions</span></h3>
                        <div class="questions-grid">
                            ${questionsHtml}
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <section class="section">
                    <header class="section-header">
                        <h2 class="section-title">
                            ${sectionName}
                            <span class="section-total">R${sectionTotal.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</span>
                        </h2>
                        ${sectionDescription ? `<p class="section-description">${sectionDescription}</p>` : ''}
                    </header>
                    ${subsectionsHtml}
                </section>
            `;
        }).join('');

        reportWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charSet="utf-8" />
    <title>Gap Analysis Roadmap</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 32px;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #0f172a;
            color: #0f172a;
        }
        .page {
            max-width: 1100px;
            margin: 0 auto;
            background: #f9fafb;
            border-radius: 24px;
            box-shadow: 0 24px 70px rgba(15, 23, 42, 0.35);
            overflow: hidden;
        }
        .page-header {
            padding: 32px 40px 24px;
            background: linear-gradient(135deg, #0f766e, #14b8a6);
            color: white;
        }
        .page-title {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 4px;
        }
        .page-subtitle {
            margin: 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .page-meta {
            margin-top: 12px;
            font-size: 12px;
            opacity: 0.8;
        }
        .content {
            padding: 24px 40px 32px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        }
        .summary-card {
            background: white;
            border-radius: 16px;
            padding: 16px 18px;
            border: 1px solid #e5e7eb;
        }
        .summary-label {
            font-size: 12px;
            font-weight: 500;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .summary-value {
            margin-top: 8px;
            font-size: 22px;
            font-weight: 700;
            color: #111827;
        }
        .summary-subtext {
            margin-top: 4px;
            font-size: 12px;
            color: #6b7280;
        }
        .section {
            margin-bottom: 32px;
            page-break-inside: avoid;
        }
        .section-header {
            margin-bottom: 16px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 10px;
        }
        .section-title {
            margin: 0 0 4px;
            font-size: 20px;
            font-weight: 700;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            color: #111827;
        }
        .section-total {
            font-size: 14px;
            font-weight: 600;
            color: #0f766e;
            background: #ecfdf5;
            padding: 2px 10px;
            border-radius: 999px;
        }
        .section-description {
            margin: 0;
            font-size: 13px;
            color: #6b7280;
        }
        .subsection {
            margin-bottom: 18px;
        }
        .subsection-title {
            margin: 0 0 8px;
            font-size: 15px;
            font-weight: 600;
            color: #111827;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
        }
        .subsection-meta {
            font-size: 11px;
            font-weight: 500;
            color: #6b7280;
        }
        .questions-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }
        .question-card {
            background: white;
            border-radius: 12px;
            padding: 10px 12px;
            border: 1px solid #e5e7eb;
        }
        .question-code {
            display: inline-flex;
            font-size: 11px;
            font-weight: 600;
            color: #2563eb;
            background: #eff6ff;
            padding: 2px 8px;
            border-radius: 999px;
            margin-bottom: 6px;
        }
        .question-text {
            font-size: 13px;
            font-weight: 500;
            color: #111827;
            margin-bottom: 6px;
        }
        .cost-items {
            margin-top: 4px;
            border-top: 1px dashed #e5e7eb;
            padding-top: 4px;
        }
        .cost-item {
            font-size: 12px;
            color: #374151;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .cost-item + .cost-item {
            margin-top: 4px;
        }
        .cost-item-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
        }
        .cost-item-name {
            font-weight: 500;
        }
        .cost-item-price {
            font-weight: 600;
            color: #0f766e;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .page {
                box-shadow: none;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <header class="page-header">
            <h1 class="page-title">Gap Analysis Roadmap</h1>
            <p class="page-subtitle">Cost of formalisation and readiness across key business sections.</p>
            <p class="page-meta">Generated on ${createdDate}</p>
        </header>
        <main class="content">
            <section class="summary-grid">
                <div class="summary-card">
                    <div class="summary-label">Gap Analysis Score</div>
                    <div class="summary-value">${typeof summary.totalSurveyScore === 'number' ? `${summary.totalSurveyScore}%` : '-'}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Cost of Formalisation</div>
                    <div class="summary-value">R${summary.totalCost.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Total Questions</div>
                    <div class="summary-value">${summary.totalQuestions}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Yes</div>
                    <div class="summary-value">${yesNo.yes}</div>
                    <div class="summary-subtext">${yesPercentage.toFixed(1)}% of total</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">No</div>
                    <div class="summary-value">${yesNo.no}</div>
                    <div class="summary-subtext">${noPercentage.toFixed(1)}% of total</div>
                </div>
            </section>

            ${sectionsHtml}
        </main>
    </div>
</body>
</html>
        `);

        reportWindow.document.close();
        reportWindow.focus();

        // Give the browser a moment to render before triggering print
        setTimeout(() => {
            try {
                reportWindow.print();
            } catch {
                // ignore print errors
            }
        }, 600);
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                <Spinner size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Roadmap</h2>
                    <p className="text-gray-600">Unable to load the roadmap data. Please try again later.</p>
                </div>
            </div>
        );
    }

    if (!questions || questions.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-500 mb-2">No Gap Analysis Roadmap Available</h2>
                    <p className="text-gray-600">There are no roadmap items to display for this Gap Analysis, please try again later.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h3 className="text-lg font-medium text-teal-400 mb-4">Gap Analysis Roadmap</h3>

            {/* Summary cards (using header totals endpoint) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
                {/* Gap Analysis Score */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Gap Analysis Score</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {typeof summary.totalSurveyScore === 'number' ? `${summary.totalSurveyScore}%` : '-'}
                            </p>
                        </div>
                        <div className="p-3 rounded-full bg-teal-500">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
                {/* Cost of Formalisation */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Cost of Formalisation</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">R{summary.totalCost.toLocaleString()}</p>
                        </div>
                        <div className="p-3 rounded-full bg-purple-500">
                            <DollarSign className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
                {/* Total Questions */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Questions</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalQuestions}</p>
                        </div>
                        <div className="p-3 rounded-full bg-blue-500">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
                {/* Yes Summary Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Yes</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{yesNo.yes}</p>
                            <p className="text-sm text-gray-500 mt-1">{yesPercentage.toFixed(1)}%</p>
                        </div>
                        <div className="p-3 rounded-full bg-green-500">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
                {/* No Summary Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">No</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{yesNo.no}</p>
                            <p className="text-sm text-gray-500 mt-1">{noPercentage.toFixed(1)}%</p>
                        </div>
                        <div className="p-3 rounded-full bg-red-500">
                            <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end mb-4 gap-3">
                <button
                    onClick={() => setExpandAll(prev => !prev)}
                    className="px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                >
                    {expandAll ? 'Collapse All' : 'Expand All'}
                </button>
                <button
                    onClick={handleDownloadExcel}
                    className="px-3 py-2 text-sm rounded-md border border-green-500 bg-green-500 text-white hover:bg-green-600 shadow-sm inline-flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    <span>Download Excel</span>
                </button>
                <button
                    onClick={handleDownloadPdf}
                    className="px-3 py-2 text-sm rounded-md border border-teal-500 bg-teal-500 text-white hover:bg-teal-600 shadow-sm inline-flex items-center gap-2"
                >
                    <span>Download PDF</span>
                </button>
            </div>

            <div className="space-y-8">
                {Object.entries(groupedQuestions).map(([sectionName, subsections]) => (
                    <div key={sectionName} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-emerald-800 px-6 py-5 border-b border-emerald-700">
                            <h4 className="text-2xl font-semibold text-white text-center">
                                {sectionName}
                                <span className="text-lg font-normal text-emerald-100 ml-2">
                                    (R
                                    {(sectionCosts[sectionName] ?? 0).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}
                                    )
                                </span>
                            </h4>
                            <p className="text-emerald-50 text-sm mt-3 text-center">
                                {questions?.find(q => q.sectionName === sectionName)?.sectionDescription}
                            </p>
                        </div>
                        
                        <div className="p-6">
                            {Object.entries(subsections).map(([subsectionName, sectionQuestions]) => (
                                <div key={subsectionName} className="mb-6 last:mb-0">
                                    <details open={expandAll} className="group">
                                        <summary className="cursor-pointer list-none">
                                            <h5 className="text-lg font-medium text-gray-800 mb-3 border-b border-gray-200 pb-2 flex items-center justify-between">
                                                <span>{subsectionName}</span>
                                                <span className="text-xs text-gray-500 ml-2">{sectionQuestions.length} questions</span>
                                            </h5>
                                        </summary>

                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {sectionQuestions.map((question) => {
                                                const hasCostOptions = question.costOptions && question.costOptions.length > 0;
                                                const totalQuestionCost = hasCostOptions
                                                    ? question.costOptions!.reduce(
                                                        (sum, option) => sum + (Number(option.costPrice) || 0),
                                                        0
                                                    )
                                                    : 0;

                                                return (
                                                    <div
                                                        key={question.categoryQuestionID}
                                                        className="group bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                                                                {question.questionCode}
                                                            </span>
                                                            {hasCostOptions && (
                                                                <div className="text-right">
                                                                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
                                                                        Cost of Formalisation
                                                                    </p>
                                                                    <p className="text-sm font-bold text-emerald-600">
                                                                        R{totalQuestionCost.toLocaleString(undefined, {
                                                                            minimumFractionDigits: 2,
                                                                            maximumFractionDigits: 2
                                                                        })}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <p className="mt-3 text-sm font-medium text-gray-900">
                                                            {question.questionText}
                                                        </p>

                                                        {question.importance && (
                                                            <p className="mt-2 text-xs font-medium text-gray-600">
                                                                <span className="font-semibold">Importance: </span>
                                                                {question.importance}
                                                            </p>
                                                        )}

                                                        {question.resources && (
                                                            <p className="mt-2 text-xs text-gray-600">
                                                                <span className="font-semibold">Resources: </span>
                                                                {question.resources.startsWith('http://') || question.resources.startsWith('https://') ? (
                                                                    <a
                                                                        href={question.resources}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 hover:text-blue-800 underline"
                                                                    >
                                                                        {question.resources}
                                                                    </a>
                                                                ) : (
                                                                    question.resources
                                                                )}
                                                            </p>
                                                        )}

                                                        {hasCostOptions && (
                                                            <div className="mt-3 space-y-2">
                                                                {question.costOptions!.map((option, index) => (
                                                                    <div
                                                                        key={`${option.categoryQuestionID}-${option.costItemID || index}`}
                                                                        className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2"
                                                                    >
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="text-xs font-medium text-gray-800">
                                                                                {option.costItem}
                                                                            </span>
                                                                            <span className="text-xs font-semibold text-emerald-700">
                                                                                R{Number(option.costPrice || 0).toLocaleString(undefined, {
                                                                                    minimumFractionDigits: 2,
                                                                                    maximumFractionDigits: 2
                                                                                })}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </details>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QuestionnaireRoadmap;

