import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GridComponent, ColumnsDirective, ColumnDirective, Inject, Page, Search, Sort, Toolbar } from '@syncfusion/ej2-react-grids';
import { EyeIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
    getFinancialInformationHeadersByCompanyID,
    getFinancialInformationDocumentsByCompanyID2,
    FinancialInformationHeaderResponse
} from '@/api/companies';

interface FinancialInformationHeadersGridProps {
    companyId: string;
    refreshTrigger?: number;
    onCreateApplication?: () => void;
    onViewApplication?: (headerId: string) => void;
    onEditApplication?: (headerId: string) => void;
}

interface FinancialInformationHeaderRow {
    headerId: string;
    dateCreated: string;
    financialYear: string;
    profitabilityStatus: string;
    averageMonthlyIncome: number;
    averageMonthlyExpenditure: number;
    createdBy: string;
    noOfDocuments: number;
}

const getHeaderId = (header: FinancialInformationHeaderResponse) =>
    header.financialCompanyHeaderID || header.companyFinancialInformationHeader2ID || '';

const getDocumentHeaderId = (document: Record<string, unknown>) =>
    String(
        document.financialCompanyHeaderID ||
        document.financialCompanyHeader2ID ||
        document.companyFinancialInformationHeader2ID ||
        document.financialInformationHeaderID ||
        ''
    );

const FinancialInformationHeadersGrid: React.FC<FinancialInformationHeadersGridProps> = ({
    companyId,
    refreshTrigger = 0,
    onCreateApplication,
    onViewApplication,
    onEditApplication
}) => {
    const gridRef = useRef<GridComponent>(null);
    const [headers, setHeaders] = useState<FinancialInformationHeaderResponse[]>([]);
    const [documents, setDocuments] = useState<Record<string, unknown>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadData = async () => {
            if (!companyId) {
                setHeaders([]);
                setDocuments([]);
                return;
            }

            setIsLoading(true);
            setError('');

            try {
                const [headerResponse, documentResponse] = await Promise.all([
                    getFinancialInformationHeadersByCompanyID(companyId),
                    getFinancialInformationDocumentsByCompanyID2(companyId).catch(() => [])
                ]);

                const headerItems = Array.isArray(headerResponse) ? headerResponse : [];
                const documentItems = Array.isArray(documentResponse)
                    ? documentResponse
                    : (documentResponse && typeof documentResponse === 'object' && 'documents' in documentResponse && Array.isArray((documentResponse as { documents?: unknown[] }).documents)
                        ? ((documentResponse as { documents: Record<string, unknown>[] }).documents)
                        : []);

                setHeaders(headerItems);
                setDocuments(documentItems);
            } catch (err) {
                console.error('Error loading financial information headers:', err);
                setError('Failed to load financial applications. Please try again.');
                setHeaders([]);
                setDocuments([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [companyId, refreshTrigger]);

    const rows = useMemo<FinancialInformationHeaderRow[]>(() => {
        return headers.map((header) => {
            const headerId = getHeaderId(header);
            const dynamicCount = documents.filter((document) => getDocumentHeaderId(document) === headerId).length;
            const apiCount = Number(header.noOfDocuments ?? header.noofDocuments ?? 0);

            return {
                headerId,
                dateCreated: header.dateCreated || header.createdDate || '',
                financialYear: header.financialYear || '',
                profitabilityStatus: header.profitabilityStatus || '',
                averageMonthlyIncome: Number(header.averageMonthlyIncome || 0),
                averageMonthlyExpenditure: Number(header.averageMonthlyExpenditure || 0),
                createdBy: header.createdBy || header.createdbyUserID || '',
                noOfDocuments: dynamicCount || apiCount
            };
        });
    }, [documents, headers]);

    const formatDate = (value: string) => {
        if (!value) return 'N/A';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatCurrency = (value: number) =>
        `R${Number(value || 0).toLocaleString('en-ZA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                    <h4 className="text-lg font-medium text-gray-800">Financial Applications</h4>
                    <p className="text-sm text-gray-500 mt-1">Applications found: {rows.length}</p>
                </div>
                {onCreateApplication && (
                    <Button type="button" variant="primary" onClick={onCreateApplication}>
                        Add Financial Documents
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
                    Loading financial applications...
                </div>
            ) : error ? (
                <div className="text-center py-8 text-red-600">{error}</div>
            ) : rows.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No financial applications found.
                </div>
            ) : (
                <GridComponent
                    ref={gridRef}
                    dataSource={rows}
                    allowPaging={true}
                    pageSettings={{ pageSize: 10 }}
                    allowSorting={true}
                    toolbar={['Search']}
                    searchSettings={{
                        fields: ['financialYear', 'profitabilityStatus', 'createdBy'],
                        operator: 'contains',
                        ignoreCase: true
                    }}
                    cssClass="modern-grid"
                    height={420}
                >
                    <ColumnsDirective>
                        <ColumnDirective
                            field="headerId"
                            headerText="View"
                            width="80"
                            textAlign="Center"
                            allowSearching={false}
                            allowSorting={false}
                            template={(props: FinancialInformationHeaderRow) => (
                                <div className="flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => onViewApplication?.(props.headerId)}
                                        className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                        aria-label="View financial application"
                                    >
                                        <EyeIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            )}
                        />
                        <ColumnDirective
                            field="headerId"
                            headerText="Edit"
                            width="80"
                            textAlign="Center"
                            allowSearching={false}
                            allowSorting={false}
                            template={(props: FinancialInformationHeaderRow) => (
                                <div className="flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => onEditApplication?.(props.headerId)}
                                        className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                        aria-label="Edit financial application"
                                    >
                                        <PencilSquareIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            )}
                        />
                        <ColumnDirective
                            field="dateCreated"
                            headerText="Date Created"
                            width="150"
                            textAlign="Center"
                            template={(props: FinancialInformationHeaderRow) => formatDate(props.dateCreated)}
                        />
                        <ColumnDirective
                            field="financialYear"
                            headerText="Financial Year"
                            width="140"
                            textAlign="Center"
                        />
                        <ColumnDirective
                            field="profitabilityStatus"
                            headerText="Profitability Status"
                            width="170"
                            textAlign="Left"
                        />
                        <ColumnDirective
                            field="averageMonthlyIncome"
                            headerText="Average Monthly Income"
                            width="180"
                            textAlign="Right"
                            template={(props: FinancialInformationHeaderRow) => formatCurrency(props.averageMonthlyIncome)}
                        />
                        <ColumnDirective
                            field="averageMonthlyExpenditure"
                            headerText="Average Monthly Expenditure"
                            width="200"
                            textAlign="Right"
                            template={(props: FinancialInformationHeaderRow) => formatCurrency(props.averageMonthlyExpenditure)}
                        />
                        <ColumnDirective
                            field="createdBy"
                            headerText="Created By"
                            width="220"
                            textAlign="Left"
                            clipMode="EllipsisWithTooltip"
                        />
                        <ColumnDirective
                            field="noOfDocuments"
                            headerText="No of Documents"
                            width="140"
                            textAlign="Center"
                        />
                    </ColumnsDirective>
                    <Inject services={[Page, Sort, Toolbar, Search]} />
                </GridComponent>
            )}
        </div>
    );
};

export default FinancialInformationHeadersGrid;
