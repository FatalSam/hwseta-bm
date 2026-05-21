import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GridComponent, ColumnsDirective, ColumnDirective, Inject, Page, Sort, Toolbar, Search } from '@syncfusion/ej2-react-grids';
import Button from '@/components/ui/button';
import { enableRipple } from '@syncfusion/ej2-base';
import { 
    getBusinessWorkshopsSummaryByCompanyID
} from '@/api/companies';

enableRipple(true);

interface WorkshopSummary {
    businessWorkshopsCompanyHeaderID: string;
    companyID: string;
    title: string;
    dateCreated: string;
    dateAttended_Completed: string;
    totalDocuments: number;
    workshopVideos: number;
    workshopDocuments: number;
}

interface WorkshopDocumentsGridProps {
    companyId: string;
    onRefresh?: () => void;
    refreshTrigger?: number;
    onAddDocument?: () => void; 
}

const WorkshopDocumentsGrid: React.FC<WorkshopDocumentsGridProps> = ({ companyId, refreshTrigger, onAddDocument }) => {
    const [allSummaries, setAllSummaries] = useState<WorkshopSummary[]>([]);
    const [filteredSummaries, setFilteredSummaries] = useState<WorkshopSummary[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const gridRef = useRef<GridComponent>(null);
    const totalCompleted = allSummaries.reduce((sum, s) => sum + (Number(s.totalDocuments) || 0), 0);
    const totalVideos = allSummaries.reduce((sum, s) => sum + (Number(s.workshopVideos) || 0), 0);

    const loadDocuments = useCallback(async () => {
        if (!companyId) return;
        
        setIsLoading(true);
        setError('');
        
        try {
            console.log('Loading workshop summaries for company:', companyId);
            const response = await getBusinessWorkshopsSummaryByCompanyID(companyId);
            console.log('Workshop summaries response:', response);
            
            const summaries: WorkshopSummary[] = Array.isArray(response) ? response : (response?.data ?? []);
            
            console.log('Processed summaries:', summaries);
            setAllSummaries(summaries);
            setFilteredSummaries(summaries);
            
            // If no documents found, show a helpful message
            if (summaries.length === 0) {
                console.log('No documents found for company:', companyId);
            }
        } catch (err: unknown) {
            console.error('Error loading workshop summaries:', err);
            console.log('Falling back to empty documents array due to API error');
            setError('Failed to load documents. Using local data.');
            setAllSummaries([]);
            setFilteredSummaries([]);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        loadDocuments();
    }, [companyId, refreshTrigger, loadDocuments]);

    // Filter summaries based on search query
    useEffect(() => {
        if (!searchQuery || !searchQuery.trim()) {
            setFilteredSummaries(allSummaries);
            return;
        }

        const query = searchQuery.toLowerCase().trim();
        const filtered = allSummaries.filter(summary => {
            const title = (summary.title || '').toLowerCase();
            return title.includes(query);
        });
        
        setFilteredSummaries(filtered);
    }, [searchQuery, allSummaries]);

    // Update document counter in toolbar
    useEffect(() => {
        const count = filteredSummaries.length;
        
        const updateCounter = () => {
            const gridElement = gridRef.current?.element;
            if (!gridElement) return;
            
            const toolbar = gridElement.querySelector('.e-toolbar');
            if (toolbar) {
                const existingCounter = toolbar.querySelector('.document-counter') as HTMLElement;
                if (existingCounter) {
                    existingCounter.textContent = `Summaries found: ${count}`;
                } else {
                    const counterDiv = document.createElement('div');
                    counterDiv.className = 'document-counter text-sm text-gray-600 font-medium px-3';
                    counterDiv.textContent = `Summaries found: ${count}`;
                    toolbar.insertBefore(counterDiv, toolbar.firstChild);
                }
            }
        };
        
        updateCounter();
        const timer = setTimeout(updateCounter, 50);
        
        return () => clearTimeout(timer);
    }, [filteredSummaries.length, searchQuery]);

    // Set up search input listener for real-time filtering
    useEffect(() => {
        if (allSummaries.length === 0) return;
        
        const setupSearchListener = () => {
            const gridElement = gridRef.current?.element;
            if (!gridElement) return null;
            
            const searchBox = gridElement.querySelector('.e-toolbar .e-search input') as HTMLInputElement;
            if (searchBox) {
                const handleSearch = () => {
                    const value = searchBox.value || '';
                    setSearchQuery(value);
                };
                
                searchBox.addEventListener('input', handleSearch);
                searchBox.addEventListener('keyup', handleSearch);
                searchBox.addEventListener('keydown', handleSearch);
                searchBox.addEventListener('change', handleSearch);
                searchBox.addEventListener('paste', handleSearch);
                searchBox.addEventListener('cut', handleSearch);
                
                const clearButton = gridElement.querySelector('.e-toolbar .e-search .e-clear-icon, .e-toolbar .e-search .e-input-group-icon') as HTMLElement;
                if (clearButton) {
                    const handleClear = () => {
                        setSearchQuery('');
                        setTimeout(() => {
                            if (searchBox.value === '') {
                                setSearchQuery('');
                            }
                        }, 10);
                    };
                    clearButton.addEventListener('click', handleClear);
                    
                    return () => {
                        searchBox.removeEventListener('input', handleSearch);
                        searchBox.removeEventListener('keyup', handleSearch);
                        searchBox.removeEventListener('keydown', handleSearch);
                        searchBox.removeEventListener('change', handleSearch);
                        searchBox.removeEventListener('paste', handleSearch);
                        searchBox.removeEventListener('cut', handleSearch);
                        clearButton.removeEventListener('click', handleClear);
                    };
                }
                
                const valueObserver = new MutationObserver(() => {
                    const currentValue = searchBox.value || '';
                    if (currentValue !== searchQuery) {
                        setSearchQuery(currentValue);
                    }
                });
                
                valueObserver.observe(searchBox, {
                    attributes: true,
                    attributeFilter: ['value'],
                    childList: false,
                    subtree: false
                });
                
                const intervalId = setInterval(() => {
                    const currentValue = searchBox.value || '';
                    if (currentValue !== searchQuery) {
                        setSearchQuery(currentValue);
                    }
                }, 200);
                
                return () => {
                    searchBox.removeEventListener('input', handleSearch);
                    searchBox.removeEventListener('keyup', handleSearch);
                    searchBox.removeEventListener('keydown', handleSearch);
                    searchBox.removeEventListener('change', handleSearch);
                    searchBox.removeEventListener('paste', handleSearch);
                    searchBox.removeEventListener('cut', handleSearch);
                    valueObserver.disconnect();
                    clearInterval(intervalId);
                };
            }
            return null;
        };
        
        const cleanup = setupSearchListener();
        const timer = setTimeout(setupSearchListener, 300);
        const timer2 = setTimeout(setupSearchListener, 600);
        const timer3 = setTimeout(setupSearchListener, 1000);
        
        return () => {
            clearTimeout(timer);
            clearTimeout(timer2);
            clearTimeout(timer3);
            if (cleanup) cleanup();
        };
    }, [allSummaries.length, searchQuery]);

    const formatUploadDate = (value: string) => {
        if (!value) return '';
        return new Date(value).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const gridContentHeight = 500;
    const gridMinHeight = gridContentHeight + 60;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: gridMinHeight }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading documents...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h4 className="text-lg font-medium text-gray-800 mb-4">Workshop Summaries</h4>
                    <div className="flex justify-between items-center mb-4">
                    {/* Summary Card */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4 mr-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow max-w-md">
                        <div className="p-2.5 rounded-full bg-emerald-500 text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1 text-center">
                            <div className="text-sm text-emerald-700 font-medium">Tasks & Assignments Completed</div>
                            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">{filteredSummaries.length}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-white text-gray-700 border border-gray-200 whitespace-nowrap">
                                {totalCompleted} Documents
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-white text-gray-700 border border-gray-200 whitespace-nowrap">
                                {totalVideos} Videos
                            </span>
                        </div>
                    </div>

                    <Button
                        onClick={() => onAddDocument?.()}
                        type="button"
                        variant="primary"
                    >
                        ADD TASK & ASSIGNMENT
                    </Button>
                </div>

            {error && (
                <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">
                    {error}
                </div>
            )}

            {allSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500 flex items-center justify-center" style={{ minHeight: gridMinHeight }}>
                    <div>
                        <div className="mb-4">
                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Workshop Summaries</h3>
                        <p className="text-gray-600">Add a task & assignment using the button above.</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200" style={{ minHeight: gridMinHeight }}>
                    <div className="overflow-x-auto">
                        <GridComponent
                            dataSource={filteredSummaries}
                            allowPaging={true}
                            pageSettings={{ pageSize: 10 }}
                            allowSorting={true}
                            allowFiltering={false}
                            toolbar={['Search']}
                            height={gridContentHeight}
                            ref={gridRef}
                            cssClass="modern-grid"
                            searchSettings={{
                                fields: ['title'],
                                operator: 'contains',
                                key: searchQuery,
                                ignoreCase: true
                            }}
                            dataBound={() => {
                                const count = filteredSummaries.length;
                                const gridElement = gridRef.current?.element;
                                if (gridElement) {
                                    const toolbar = gridElement.querySelector('.e-toolbar');
                                    if (toolbar) {
                                        const existingCounter = toolbar.querySelector('.document-counter') as HTMLElement;
                                        if (existingCounter) {
                                            existingCounter.textContent = `Summaries found: ${count}`;
                                        }
                                    }
                                }
                            }}
                        >
                            <ColumnsDirective>
                                <ColumnDirective field="title" headerText="Title" width="200" />
                                <ColumnDirective
                                    field="dateAttended_Completed"
                                    headerText="Date Attended/Completed"
                                    width="180"
                                    textAlign="Left"
                                    headerTextAlign="Left"
                                    template={(props: Record<string, unknown>) => (
                                        <div style={{ textAlign: 'left', width: '100%' }}>
                                            {formatUploadDate(props.dateAttended_Completed as string)}
                                        </div>
                                    )}
                                />
                                <ColumnDirective
                                    field="totalDocuments"
                                    headerText="Total Documents"
                                    width="150"
                                    textAlign="Left"
                                    headerTextAlign="Left"
                                    template={(props: Record<string, unknown>) => (
                                        <div style={{ textAlign: 'left', width: '100%' }}>{props.totalDocuments as number}</div>
                                    )}
                                />
                                <ColumnDirective
                                    field="workshopVideos"
                                    headerText="Videos"
                                    width="120"
                                    textAlign="Left"
                                    headerTextAlign="Left"
                                    template={(props: Record<string, unknown>) => (
                                        <div style={{ textAlign: 'left', width: '100%' }}>{props.workshopVideos as number}</div>
                                    )}
                                />
                            </ColumnsDirective>
                            <Inject services={[Page, Sort, Toolbar, Search]} />
                        </GridComponent>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkshopDocumentsGrid;
