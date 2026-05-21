import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GridComponent, ColumnsDirective, ColumnDirective, Page, Inject, Toolbar, Search, Sort } from '@syncfusion/ej2-react-grids';
import Button from '@/components/ui/button';
import { getCompleteBusinessDevelopment, deleteBusinessDevelopmentDocument, getBusinessDevelopmentDocumentByID } from '@/api/companies';
import { useAuthStore } from '@/store/authStore';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { Eye, Trash2, Loader2 } from 'lucide-react';

interface BusinessDevelopmentDocumentsGridProps {
    companyId: string;
    refreshTrigger?: number;
    onOpenModal?: () => void;
    allowDelete?: boolean;
    compact?: boolean;
}

const BusinessDevelopmentDocumentsGrid: React.FC<BusinessDevelopmentDocumentsGridProps> = ({
    companyId,
    refreshTrigger = 0,
    onOpenModal,
    allowDelete = true,
    compact = false
}) => {
    const gridRef = useRef<GridComponent>(null);
    const [allDocuments, setAllDocuments] = useState<Record<string, unknown>[]>([]);
    const [filteredDocuments, setFilteredDocuments] = useState<Record<string, unknown>[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [viewingId, setViewingId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [retryCount, setRetryCount] = useState(0);
    const { user } = useAuthStore();
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; documentId: string | null }>({ isOpen: false, documentId: null });
    const abortControllerRef = useRef<AbortController | null>(null);

    const loadDocuments = useCallback(async (retryAttempt = 0) => {
        if (!companyId) {
            setIsLoading(false);
            return;
        }
        
        // Cancel any previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        // Create new abort controller for this request
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        
        setIsLoading(true);
        setError('');
        
        try {
            // Call API (axios already has 30s timeout configured)
            const data = await getCompleteBusinessDevelopment(companyId);
            
            // Check if request was aborted (component unmounted or dependency changed)
            if (abortController.signal.aborted) {
                return;
            }
            
            console.log('Complete business development data:', data);
            
            // Handle different response structures
            let docs: Record<string, unknown>[] = [];
            if (data?.documents?.documents && Array.isArray(data.documents.documents)) {
                docs = data.documents.documents;
            } else if (Array.isArray(data?.documents)) {
                docs = data.documents;
            } else if (Array.isArray(data)) {
                docs = data;
            }
            
            setAllDocuments(docs);
            setFilteredDocuments(docs);
            setRetryCount(0); // Reset retry count on success
            
        } catch (error) {
            // Check if request was aborted
            if (abortController.signal.aborted) {
                return;
            }
            
            console.error('Error loading business development documents:', error);
            
            // Determine if this is a retryable error
            const isRetryableError = 
                (error instanceof Error && (
                    error.message.includes('timeout') || 
                    error.message.includes('network') ||
                    error.message.includes('ECONNABORTED')
                )) ||
                (error && typeof error === 'object' && (
                    ('code' in error && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED')) ||
                    ('message' in error && typeof error.message === 'string' && (
                        error.message.includes('timeout') || 
                        error.message.includes('network')
                    ))
                ));
            
            // Retry logic for network errors or timeouts (max 2 retries)
            if (retryAttempt < 2 && isRetryableError) {
                console.log(`Retrying load documents (attempt ${retryAttempt + 1}/2)...`);
                setRetryCount(retryAttempt + 1);
                
                // Wait before retrying (exponential backoff: 1s, 2s)
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryAttempt + 1)));
                
                // Retry the request
                return loadDocuments(retryAttempt + 1);
            }
            
            // Extract error message
            let errorMessage = 'Failed to load documents. Please try again.';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
                errorMessage = error.message;
            }
            
            setError(errorMessage);
            setAllDocuments([]);
            setFilteredDocuments([]);
        } finally {
            // Only set loading to false if this is still the current request
            if (!abortController.signal.aborted) {
            setIsLoading(false);
            }
        }
    }, [companyId]);

    useEffect(() => {
        loadDocuments();
        
        // Cleanup: abort request if component unmounts or dependencies change
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [companyId, refreshTrigger, loadDocuments]);

    // Filter documents based on search query
    useEffect(() => {
        if (!searchQuery || !searchQuery.trim()) {
            setFilteredDocuments(allDocuments);
            return;
        }

        const query = searchQuery.toLowerCase().trim();
        const filtered = allDocuments.filter(doc => {
            const displayName = ((doc.displayName || '') as string).toLowerCase();
            const category = ((doc.documentCategory || '') as string).toLowerCase();
            
            return displayName.includes(query) || category.includes(query);
        });
        
        setFilteredDocuments(filtered);
    }, [searchQuery, allDocuments]);

    // Update document counter in toolbar
    useEffect(() => {
        const count = filteredDocuments.length;
        
        const updateCounter = () => {
            const gridElement = gridRef.current?.element;
            if (!gridElement) return;
            
            const toolbar = gridElement.querySelector('.e-toolbar');
            if (toolbar) {
                const existingCounter = toolbar.querySelector('.document-counter') as HTMLElement;
                if (existingCounter) {
                    existingCounter.textContent = `Documents found: ${count}`;
                } else {
                const counterDiv = document.createElement('div');
                    counterDiv.className = 'document-counter text-sm text-gray-600 font-medium px-3';
                    counterDiv.textContent = `Documents found: ${count}`;
                toolbar.insertBefore(counterDiv, toolbar.firstChild);
            }
            }
        };
        
        updateCounter();
        const timer = setTimeout(updateCounter, 50);
        
        return () => clearTimeout(timer);
    }, [filteredDocuments.length, searchQuery]);

    // Set up search input listener for real-time filtering
    useEffect(() => {
        if (allDocuments.length === 0) return;
        
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
    }, [allDocuments.length, searchQuery]);

    const handleViewDocument = async (documentId: string) => {
        setViewingId(documentId);
        setError('');

        try {
            const documentData = await getBusinessDevelopmentDocumentByID(documentId);
            console.log('Document data retrieved:', documentData);
            
            // Check if we have file data to display
            if (documentData && documentData.fileData) {
                // Convert base64 to blob and open in new tab
                const byteCharacters = atob(documentData.fileData);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: documentData.contentType || 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                
                // Open in new tab
                window.open(url, '_blank');
                
                // Clean up the URL after a short delay
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else {
                setError('Document data not available for viewing.');
            }
        } catch (error) {
            console.error('Error viewing document:', error);
            setError('Failed to load document for viewing. Please try again.');
        } finally {
            setViewingId(null);
        }
    };

    const handleDeleteDocument = (documentId: string) => {
        if (!user?.userID) {
            setError('User authentication required for deletion.');
            return;
        }

        setDeleteConfirmModal({ isOpen: true, documentId });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmModal.documentId || !user?.userID) return;

        setDeletingId(deleteConfirmModal.documentId);
        setError('');

        try {
            await deleteBusinessDevelopmentDocument(deleteConfirmModal.documentId, user.userID);
            console.log('Document deleted successfully:', deleteConfirmModal.documentId);
            
            setSuccessMessage('Document deleted successfully!');
            setError('');
            
            // Reload documents after successful deletion
            await loadDocuments();
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error deleting document:', error);
            setError('Failed to delete document. Please try again.');
            setSuccessMessage('');
        } finally {
            setDeletingId(null);
            setDeleteConfirmModal({ isOpen: false, documentId: null });
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'Invalid Date';
        }
    };

    const gridContentHeight = compact ? 320 : 500;
    const gridMinHeight = gridContentHeight + 60;

    if (isLoading) {
        return (
            <div>
                <div className="flex justify-end mb-4">
                    {onOpenModal && (
                        <Button type="button" variant="primary" onClick={onOpenModal}>
                            Apply Now
                        </Button>
                    )}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200" style={{ minHeight: gridMinHeight }}>
                    <h4 className="text-lg font-medium text-gray-800 mb-4">Business Development Documents</h4>
                    <div className="flex flex-col items-center justify-center py-8" style={{ minHeight: gridContentHeight }}>
                        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
                        <div className="text-gray-600 font-medium">
                            {retryCount > 0 ? `Loading documents... (Retry ${retryCount})` : 'Loading documents...'}
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                            This may take a few moments
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <div className="flex justify-end mb-4">
                    {onOpenModal && (
                        <Button type="button" variant="primary" onClick={onOpenModal}>
                            Apply Now
                        </Button>
                    )}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200" style={{ minHeight: gridMinHeight }}>
                    <h4 className="text-lg font-medium text-gray-800 mb-4">Business Development Documents</h4>
                    <div className="text-center py-8">
                        <div className="text-red-600 mb-2 font-medium">{error}</div>
                        <div className="flex gap-2 justify-center">
                            <Button 
                                onClick={() => loadDocuments(0)}
                                variant="primary"
                                size="sm"
                        >
                            Retry
                            </Button>
                            {retryCount > 0 && (
                                <Button 
                                    onClick={() => {
                                        setRetryCount(0);
                                        loadDocuments(0);
                                    }}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Reset & Retry
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-end mb-4">
                {onOpenModal && (
                    <Button type="button" variant="primary" onClick={onOpenModal}>
                        Apply Now
                    </Button>
                )}
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Business Development Documents</h4>
                
                {/* Success message */}
                {successMessage && (
                    <div className="mb-4 p-3 rounded border border-green-300 bg-green-50 text-green-800 text-sm">
                        {successMessage}
                    </div>
                )}
                
                {allDocuments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 flex items-center justify-center" style={{ minHeight: gridMinHeight }}>
                        No documents uploaded yet.
                    </div>
                ) : (
                    <div className="w-full" style={{ minHeight: gridMinHeight }}>
                        <GridComponent
                            ref={gridRef}
                            dataSource={filteredDocuments}
                            allowPaging={true}
                            pageSettings={{ pageSize: 10 }}
                            allowSorting={true}
                            allowFiltering={false}
                            toolbar={['Search']}
                            height={gridContentHeight}
                            cssClass="modern-grid"
                            searchSettings={{
                                fields: ['displayName', 'documentCategory'],
                                operator: 'contains',
                                key: searchQuery,
                                ignoreCase: true
                            }}
                            dataBound={() => {
                                const count = filteredDocuments.length;
                                const gridElement = gridRef.current?.element;
                                if (gridElement) {
                                    const toolbar = gridElement.querySelector('.e-toolbar');
                                    if (toolbar) {
                                        const existingCounter = toolbar.querySelector('.document-counter') as HTMLElement;
                                        if (existingCounter) {
                                            existingCounter.textContent = `Documents found: ${count}`;
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
                                        const docId = props.documentID as string;
                                        if (!docId) return null;
                                        const isViewing = viewingId === docId;
                                        
                                        return (
                                            <div className="flex items-center justify-center">
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handleViewDocument(docId)}
                                                    disabled={isViewing}
                                                    title="View Document"
                                                >
                                                    {isViewing ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        );
                                    }}
                                    allowSorting={false}
                                    allowFiltering={false}
                                />
                                <ColumnDirective
                                    field="displayName"
                                    headerText="Document Name"
                                    width="230"
                                    textAlign="Left"
                                    clipMode="EllipsisWithTooltip"
                                />
                                <ColumnDirective
                                    field="documentCategory"
                                    headerText="Category"
                                    width="200"
                                    textAlign="Left"
                                />
                                <ColumnDirective
                                    field="fileSize"
                                    headerText="Size"
                                    width="100"
                                    textAlign="Right"
                                    template={(props: Record<string, unknown>) => formatFileSize(props.fileSize as number)}
                                />
                                <ColumnDirective
                                    field="uploadDate"
                                    headerText="Upload Date"
                                    width="150"
                                    textAlign="Center"
                                    template={(props: Record<string, unknown>) => formatDate(props.uploadDate as string)}
                                />
                                {allowDelete && (
                                    <ColumnDirective
                                        field="actions"
                                        headerText="Actions"
                                        width="120"
                                        textAlign="Center"
                                        template={(props: Record<string, unknown>) => {
                                            const docId = props.documentID as string;
                                            if (!docId) return null;
                                            const isDeleting = deletingId === docId;
                                            
                                            return (
                                                <div className="flex items-center gap-2 justify-center">
                                                    <Button 
                                                        variant="secondary" 
                                                        size="sm" 
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDeleteDocument(docId)}
                                                        disabled={isDeleting}
                                                        title="Delete Document"
                                                    >
                                                        {isDeleting ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            );
                                        }}
                                        allowSorting={false}
                                        allowFiltering={false}
                                    />
                                )}
                            </ColumnsDirective>
                            <Inject services={[Page, Sort, Toolbar, Search]} />
                        </GridComponent>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteConfirmModal.isOpen}
                onClose={() => setDeleteConfirmModal({ isOpen: false, documentId: null })}
                onConfirm={confirmDelete}
                title="Delete Document"
                message="Are you sure you want to delete this document? This action cannot be undone."
                type="confirm"
                confirmLabel="Delete"
                confirmVariant="primary"
            />
        </div>
    );
};

export default BusinessDevelopmentDocumentsGrid;
