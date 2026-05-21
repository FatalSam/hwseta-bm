import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GridComponent, ColumnsDirective, ColumnDirective, Inject, Page, Sort, Toolbar, Search } from '@syncfusion/ej2-react-grids';
import Button from '@/components/ui/button';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';
import { getBusinessCoachingSummaryByCompanyId, deleteCoachingHeader } from '@/api/business-services';
import { useAuthStore } from '@/store/authStore';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { Eye, Trash2, Edit } from 'lucide-react';

interface CoachingDocumentsGridProps {
    companyId: string;
    refreshTrigger?: number;
    onOpenModal?: () => void;
    onView?: (headerId: string) => void;
    onUpdate?: (headerId: string) => void;
}

interface CoachingHeader {
    businessCoachingCompanyHeaderID: string;
    assignmentTitle: string;
    dateSubmitted: string;
    companyID: string;
    createdBy: string;
    dateCreated: string;
    modifiedDate?: string | null;
    lastModifiedUserID?: string;
    isVerified?: boolean;
    verifiedDate?: string | null;
    verifiedBy?: string | null;
}

const CoachingDocumentsGrid: React.FC<CoachingDocumentsGridProps> = ({ companyId, refreshTrigger, onOpenModal, onView, onUpdate }) => {
    const [allHeaders, setAllHeaders] = useState<CoachingHeader[]>([]);
    const [filteredHeaders, setFilteredHeaders] = useState<CoachingHeader[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const toastInstanceRef = useRef<ToastComponent | null>(null);
    const gridRef = useRef<GridComponent>(null);
    const { user } = useAuthStore();
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; headerId: string | null }>({ isOpen: false, headerId: null });

    const loadHeaders = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getBusinessCoachingSummaryByCompanyId(companyId);
            const headersData = Array.isArray(data) ? data : [];
            setAllHeaders(headersData as CoachingHeader[]);
            setFilteredHeaders(headersData as CoachingHeader[]);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? error.message : 'Failed to load coaching assignments. Please try again.');
            setError(errorMessage);
            setAllHeaders([]);
            setFilteredHeaders([]);
            
            // Show user-friendly error notification
            if (toastInstanceRef.current) {
                toastInstanceRef.current.show({
                    title: 'Error',
                    content: errorMessage,
                    timeOut: 5000,
                    position: { X: 'Right', Y: 'Top' },
                    cssClass: 'e-toast-error'
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        if (companyId) {
            loadHeaders();
        }
    }, [companyId, refreshTrigger, loadHeaders]);

    // Filter headers based on search query
    useEffect(() => {
        if (!searchQuery || !searchQuery.trim()) {
            setFilteredHeaders(allHeaders);
            return;
        }

        const query = searchQuery.toLowerCase().trim();
        const filtered = allHeaders.filter(header => {
            const title = (header.assignmentTitle || '').toLowerCase();
            return title.includes(query);
        });
        
        setFilteredHeaders(filtered);
    }, [searchQuery, allHeaders]);

    // Update document counter in toolbar
    useEffect(() => {
        const count = filteredHeaders.length;
        
        const updateCounter = () => {
            const gridElement = gridRef.current?.element;
            if (!gridElement) return;
            
            const toolbar = gridElement.querySelector('.e-toolbar');
            if (toolbar) {
                const existingCounter = toolbar.querySelector('.document-counter') as HTMLElement;
                if (existingCounter) {
                    existingCounter.textContent = `Assignments found: ${count}`;
                } else {
                const counterDiv = document.createElement('div');
                    counterDiv.className = 'document-counter text-sm text-gray-600 font-medium px-3';
                    counterDiv.textContent = `Assignments found: ${count}`;
                toolbar.insertBefore(counterDiv, toolbar.firstChild);
            }
            }
        };
        
        updateCounter();
        const timer = setTimeout(updateCounter, 50);
        
        return () => clearTimeout(timer);
    }, [filteredHeaders.length, searchQuery]);

    // Set up search input listener for real-time filtering
    useEffect(() => {
        if (allHeaders.length === 0) return;
        
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
    }, [allHeaders.length, searchQuery]);

    const handleDelete = (headerId: string) => {
        if (!user?.userID) {
            if (toastInstanceRef.current) {
                toastInstanceRef.current.show({
                    title: 'Error',
                    content: 'User information not found. Please log in again.',
                    timeOut: 5000,
                    position: { X: 'Right', Y: 'Top' },
                    cssClass: 'e-toast-error'
                });
            }
            return;
        }

        setDeleteConfirmModal({ isOpen: true, headerId });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmModal.headerId || !user?.userID) return;

        try {
            await deleteCoachingHeader(deleteConfirmModal.headerId, user.userID);
            if (toastInstanceRef.current) {
                toastInstanceRef.current.show({
                    title: 'Success',
                    content: 'Assignment deleted successfully',
                    timeOut: 3000,
                    position: { X: 'Right', Y: 'Top' },
                    cssClass: 'e-toast-success'
                });
            }
            loadHeaders();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? error.message : 'Failed to delete assignment. Please try again.');
            if (toastInstanceRef.current) {
                toastInstanceRef.current.show({
                    title: 'Error',
                    content: errorMessage,
                    timeOut: 5000,
                    position: { X: 'Right', Y: 'Top' },
                    cssClass: 'e-toast-error'
                });
            }
        } finally {
            setDeleteConfirmModal({ isOpen: false, headerId: null });
        }
    };

    const formatDate = (value?: string) => {
        if (!value) return 'N/A';
        try {
            const date = new Date(value);
            return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'Invalid Date';
        }
    };

    if (isLoading) {
        return (
            <div>
                <div className="flex justify-end mb-4">
                    {onOpenModal && (
                        <Button type="button" variant="primary" onClick={onOpenModal}>
                            Add New
                        </Button>
                    )}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h4 className="text-lg font-medium text-gray-800 mb-4">Submitted Assignments</h4>
                    <div className="flex items-center justify-center min-h-[200px]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading assignments...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <ToastComponent ref={toastInstanceRef} />
            <div className="flex justify-end mb-4">
                <Button type="button" variant="primary" onClick={onOpenModal}>
                    Add New
                </Button>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Submitted Assignments</h4>
                
                {error ? (
                    <div className="text-center py-8">
                        <div className="text-red-600 mb-2 font-medium">Error loading assignments</div>
                        <div className="text-gray-600 text-sm mb-4">{error}</div>
                        <Button 
                            variant="primary"
                            onClick={() => loadHeaders()}
                        >
                            Retry
                        </Button>
                    </div>
                ) : allHeaders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No assignments found
                    </div>
                ) : (
                    <div className="w-full">
                        <GridComponent
                            ref={gridRef}
                            dataSource={filteredHeaders}
                            allowPaging={true}
                            pageSettings={{ pageSize: 10 }}
                            allowSorting={true}
                            allowFiltering={false}
                            toolbar={['Search']}
                            height={400}
                            cssClass="modern-grid"
                            searchSettings={{
                                fields: ['assignmentTitle'],
                                operator: 'contains',
                                key: searchQuery,
                                ignoreCase: true
                            }}
                            dataBound={() => {
                                const count = filteredHeaders.length;
                                const gridElement = gridRef.current?.element;
                                if (gridElement) {
                                    const toolbar = gridElement.querySelector('.e-toolbar');
                                    if (toolbar) {
                                        const existingCounter = toolbar.querySelector('.document-counter') as HTMLElement;
                                        if (existingCounter) {
                                            existingCounter.textContent = `Assignments found: ${count}`;
                                        }
                                    }
                                }
                            }}
                        >
                            <ColumnsDirective>
                                <ColumnDirective
                                    field="view"
                                    headerText="View"
                                    width="80"
                                    textAlign="Center"
                                    template={(props: Record<string, unknown>) => {
                                        const headerId = props.businessCoachingCompanyHeaderID as string;
                                        if (!headerId || !onView) return null;
                                        
                                        return (
                                            <div className="flex items-center justify-center">
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => onView(headerId)}
                                                    title="View Assignment"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        );
                                    }}
                                    allowSorting={false}
                                    allowFiltering={false}
                                />
                                <ColumnDirective 
                                    field="assignmentTitle" 
                                    headerText="Assignment" 
                                    width="230"
                                    textAlign="Left"
                                    clipMode="EllipsisWithTooltip"
                                />
                                <ColumnDirective 
                                    field="dateSubmitted" 
                                    headerText="Date Submitted" 
                                    width="200"
                                    textAlign="Left"
                                    template={(props: Record<string, unknown>) => formatDate(props.dateSubmitted as string)} 
                                />
                                <ColumnDirective 
                                    headerText="Verified" 
                                    width="150" 
                                    textAlign="Center"
                                    template={(props: Record<string, unknown>) => {
                                        const isVerified = props.isVerified as boolean | undefined;
                                        return isVerified ? (
                                            <span className="text-green-600 font-medium">✓ Verified</span>
                                        ) : (
                                            <span className="text-gray-400">Not Verified</span>
                                        );
                                    }}
                                    allowSorting={false}
                                    allowFiltering={false}
                                />
                                <ColumnDirective 
                                    headerText="Date Verified" 
                                    width="150" 
                                    textAlign="Center"
                                    template={(props: Record<string, unknown>) => formatDate(props.verifiedDate as string)}
                                    allowSorting={false}
                                    allowFiltering={false}
                                />
                                <ColumnDirective 
                                    headerText="Verified By" 
                                    width="150" 
                                    textAlign="Left"
                                    template={(props: Record<string, unknown>) => {
                                        const verifiedBy = props.verifiedBy as string | undefined;
                                        return verifiedBy || '—';
                                    }}
                                    allowSorting={false}
                                    allowFiltering={false}
                                />
                                <ColumnDirective 
                                    headerText="Actions" 
                                    width="150" 
                                    textAlign="Center"
                                    template={(props: Record<string, unknown>) => {
                                        const headerId = props.businessCoachingCompanyHeaderID as string;
                                        if (!headerId) return null;
                                        
                                        return (
                                        <div className="flex items-center gap-2 justify-center">
                                            {onUpdate && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                        onClick={() => onUpdate(headerId)}
                                                    title="Update Assignment"
                                                >
                                                        <Edit className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDelete(headerId)}
                                                title="Delete Assignment"
                                            >
                                                    <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        );
                                    }}
                                    allowSorting={false}
                                    allowFiltering={false}
                                />
                            </ColumnsDirective>
                            <Inject services={[Page, Sort, Toolbar, Search]} />
                        </GridComponent>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteConfirmModal.isOpen}
                onClose={() => setDeleteConfirmModal({ isOpen: false, headerId: null })}
                onConfirm={confirmDelete}
                title="Delete Assignment"
                message="Are you sure you want to delete this assignment?"
                type="confirm"
                confirmLabel="Delete"
                confirmVariant="primary"
            />
        </div>
    );
};

export default CoachingDocumentsGrid;


