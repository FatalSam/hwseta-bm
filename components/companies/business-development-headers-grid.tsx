import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GridComponent, ColumnsDirective, ColumnDirective, Inject, Page, Search, Sort, Toolbar } from '@syncfusion/ej2-react-grids';
import { EyeIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getBusinessDevelopmentHeadersByCompanyID, BusinessDevelopmentHeaderResponse } from '@/api/companies';

interface BusinessDevelopmentHeadersGridProps {
    companyId: string;
    refreshTrigger?: number;
    onCreateApplication?: () => void;
    onViewApplication?: (headerId: string) => void;
    onEditApplication?: (headerId: string) => void;
}

interface BusinessDevelopmentHeaderRow {
    headerId: string;
    dateCreated: string;
    financialYear: string;
    status: string;
    fundingPurpose: string;
    fundingAmountRequested: number;
    gapAnalysisScore: number;
    createdBy: string;
}

const getHeaderId = (header: BusinessDevelopmentHeaderResponse) =>
    header.businessDevelopmentCompanyHeaderID || header.companyBusinessDevelopmentHeader2ID || '';

const normalizeHeader = (header: BusinessDevelopmentHeaderResponse): BusinessDevelopmentHeaderRow => ({
    headerId: getHeaderId(header),
    dateCreated: header.dateCreated || header.createdDate || '',
    financialYear: header.financialYear || '',
    status: header.status || '',
    fundingPurpose: header.fundingPurpose || '',
    fundingAmountRequested: Number(header.fundingAmountRequested || 0),
    gapAnalysisScore: Number(header.gapAnalysisScore || 0),
    createdBy: header.createdBy || header.createdbyUserID || '',
});

const BusinessDevelopmentHeadersGrid: React.FC<BusinessDevelopmentHeadersGridProps> = ({
    companyId,
    refreshTrigger = 0,
    onCreateApplication,
    onViewApplication,
    onEditApplication
}) => {
    const gridRef = useRef<GridComponent>(null);
    const [headers, setHeaders] = useState<BusinessDevelopmentHeaderRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadHeaders = async () => {
            if (!companyId) {
                setHeaders([]);
                return;
            }

            setIsLoading(true);
            setError('');

            try {
                const response = await getBusinessDevelopmentHeadersByCompanyID(companyId);
                const items = Array.isArray(response) ? response : [];
                setHeaders(items.map(normalizeHeader));
            } catch (err) {
                console.error('Error loading business development headers:', err);
                setError('Failed to load business development applications. Please try again.');
                setHeaders([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadHeaders();
    }, [companyId, refreshTrigger]);

    const headerCount = useMemo(() => headers.length, [headers.length]);
    const totalFundingRequired = useMemo(
        () => headers.reduce((total, header) => total + Number(header.fundingAmountRequested || 0), 0),
        [headers]
    );

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
                    <h4 className="text-lg font-medium text-gray-800">Business Development Applications</h4>
                    <p className="text-sm text-gray-500 mt-1">Applications found: {headerCount}</p>
                    <p className="text-sm font-semibold text-teal-700 mt-1">
                        Total Funding Required: {formatCurrency(totalFundingRequired)}
                    </p>
                </div>
                {onCreateApplication && (
                    <Button type="button" variant="primary" onClick={onCreateApplication}>
                        Apply Now
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
                    Loading applications...
                </div>
            ) : error ? (
                <div className="text-center py-8">
                    <div className="text-red-600 mb-3">{error}</div>
                    <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
                        Reload Page
                    </Button>
                </div>
            ) : headers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No business development applications found.
                </div>
            ) : (
                <GridComponent
                    ref={gridRef}
                    dataSource={headers}
                    allowPaging={true}
                    pageSettings={{ pageSize: 10 }}
                    allowSorting={true}
                    toolbar={['Search']}
                    searchSettings={{
                        fields: ['financialYear', 'status', 'fundingPurpose', 'createdBy'],
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
                            template={(props: BusinessDevelopmentHeaderRow) => (
                                <div className="flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => onViewApplication?.(props.headerId)}
                                        className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                        aria-label="View application"
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
                            template={(props: BusinessDevelopmentHeaderRow) => (
                                <div className="flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => onEditApplication?.(props.headerId)}
                                        className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                        aria-label="Edit application"
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
                            template={(props: BusinessDevelopmentHeaderRow) => formatDate(props.dateCreated)}
                        />
                        <ColumnDirective
                            field="financialYear"
                            headerText="Financial Year"
                            width="140"
                            textAlign="Center"
                        />
                        <ColumnDirective
                            field="status"
                            headerText="Status"
                            width="120"
                            textAlign="Center"
                        />
                        <ColumnDirective
                            field="fundingPurpose"
                            headerText="Funding Purpose"
                            width="180"
                            textAlign="Left"
                            clipMode="EllipsisWithTooltip"
                        />
                        <ColumnDirective
                            field="fundingAmountRequested"
                            headerText="Funding Amount Requested"
                            width="180"
                            textAlign="Right"
                            template={(props: BusinessDevelopmentHeaderRow) => formatCurrency(props.fundingAmountRequested)}
                        />
                        <ColumnDirective
                            field="gapAnalysisScore"
                            headerText="Gap Analysis Score"
                            width="150"
                            textAlign="Right"
                            template={(props: BusinessDevelopmentHeaderRow) => `${Number(props.gapAnalysisScore || 0).toFixed(2)}%`}
                        />
                        <ColumnDirective
                            field="createdBy"
                            headerText="Created By"
                            width="220"
                            textAlign="Left"
                            clipMode="EllipsisWithTooltip"
                        />
                    </ColumnsDirective>
                    <Inject services={[Page, Sort, Toolbar, Search]} />
                </GridComponent>
            )}
        </div>
    );
};

export default BusinessDevelopmentHeadersGrid;
