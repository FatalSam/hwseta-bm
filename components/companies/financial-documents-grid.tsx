import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GridComponent, ColumnsDirective, ColumnDirective, Inject, Page, Sort, Toolbar, Search } from '@syncfusion/ej2-react-grids';
import Button from '@/components/ui/button';
import { getFinancialInformationDocumentsByCompanyID2, getFinancialInformationDocumentByID2, deleteFinancialInformationDocument2 } from '@/api/companies';
import { enableRipple } from '@syncfusion/ej2-base';
import { useAuthStore } from '@/store/authStore';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { Eye, Trash2, Loader2 } from 'lucide-react';

enableRipple(true);

interface Document {
    documentID: string;
    companyID: string;
    financialCompanyHeaderID?: string;
    financialCompanyHeader2ID?: string;
    companyFinancialInformationHeader2ID?: string;
    financialInformationHeaderID?: string;
    name_File: string;
    displayName: string;
    extension: string;
    contentType: string;
    fileData: string;
    fileSize: number;
    documentCategory: string;
    documentScore: number;
    uploadDate?: string;
    createdDate?: string;
    createdBy?: string;
    // Expiry fields from API
    financialStatementsExpiry?: string | null;
    bankStatementExpiry?: string | null;
    // Legacy / fallback expiry fields
    expiryDate?: string | null;
    ExpiryDate?: string | null;
    expiry_date?: string | null;
}

interface FinancialDocumentsGridProps {
    companyId: string;
    headerId?: string | null;
    onRefresh?: () => void;
    refreshTrigger?: number;
    allowDelete?: boolean;
    compact?: boolean;
}

const FinancialDocumentsGrid: React.FC<FinancialDocumentsGridProps> = ({
    companyId,
    headerId,
    onRefresh,
    refreshTrigger,
    allowDelete = true,
    compact = false
}) => {
    const { user } = useAuthStore();
    const gridRef = useRef<GridComponent>(null);
    const [allDocuments, setAllDocuments] = useState<Document[]>([]);
    const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; documentId: string | null }>({ isOpen: false, documentId: null });
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

    const loadDocuments = useCallback(async () => {
        if (!companyId) return;
        
        setIsLoading(true);
        setError('');
        
        try {
            console.log('Loading financial information documents for company:', companyId);
            const response = await getFinancialInformationDocumentsByCompanyID2(companyId);
            console.log('Financial information documents response:', response);
            
            let docs = response;
            if (response && typeof response === 'object' && !Array.isArray(response)) {
                if (response.data && Array.isArray(response.data)) {
                    docs = response.data;
                } else if (response.documents && Array.isArray(response.documents)) {
                    docs = response.documents;
                } else if (response.result && Array.isArray(response.result)) {
                    docs = response.result;
                }
            }
            
            const docsArray = Array.isArray(docs) ? docs : [];
            const normalizedHeaderId = headerId ? String(headerId) : '';
            const filteredByHeader = normalizedHeaderId
                ? docsArray.filter((doc) => {
                    const docHeaderId = String(
                        doc.financialCompanyHeaderID ||
                        doc.financialCompanyHeader2ID ||
                        doc.companyFinancialInformationHeader2ID ||
                        doc.financialInformationHeaderID ||
                        ''
                    );
                    return docHeaderId === normalizedHeaderId;
                })
                : docsArray;
            setAllDocuments(filteredByHeader);
            setFilteredDocuments(filteredByHeader);
            
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? error.message : 'Failed to load financial information documents. Please try again.');
            setError(errorMessage);
            setAllDocuments([]);
            setFilteredDocuments([]);
            if (process.env.NODE_ENV === 'development') {
                console.error('Error loading financial information documents:', error);
            }
        } finally {
            setIsLoading(false);
        }
    }, [companyId, headerId]);

    useEffect(() => {
        loadDocuments();
    }, [companyId, headerId, refreshTrigger, loadDocuments]);

    // Filter documents based on search query
    useEffect(() => {
        if (!searchQuery || !searchQuery.trim()) {
            setFilteredDocuments(allDocuments);
        } else {
        const query = searchQuery.toLowerCase().trim();
        const filtered = allDocuments.filter(doc => {
            const displayName = (doc.displayName || doc.name_File || '').toLowerCase();
            const category = (doc.documentCategory || '').toLowerCase();
            const createdBy = (doc.createdBy || '').toLowerCase();
            
            return displayName.includes(query) || 
                   category.includes(query) || 
                   createdBy.includes(query);
        });
        setFilteredDocuments(filtered);
        }
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

    const handleViewDocument = useCallback(async (documentId: string) => {
        setActionLoading(documentId);
        try {
            console.log('Viewing financial information document:', documentId);
            const response = await getFinancialInformationDocumentByID2(documentId);
            console.log('Financial information document response:', response);
            
            let documentData = response;
            if (response && typeof response === 'object' && !Array.isArray(response)) {
                if (response.data) {
                    documentData = response.data;
                } else if (response.document) {
                    documentData = response.document;
                } else if (response.result) {
                    documentData = response.result;
                }
            }
            
            const fileData = documentData.fileData || documentData.FileData;
            const contentType = documentData.contentType || documentData.ContentType || 'application/octet-stream';
            
            if (!fileData) {
                throw new Error('No file data found in the response');
            }
            
            // Validate base64 data
            try {
                atob(fileData);
            } catch {
                throw new Error('Invalid file data format');
            }
            
            // Convert base64 to blob and open in new tab
            const byteCharacters = atob(fileData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: contentType });
            const url = URL.createObjectURL(blob);
            
            const newWindow = window.open(url, '_blank');
            if (!newWindow) {
                throw new Error('Popup blocked. Please allow popups for this site and try again.');
            }
            
            // Clean up the URL after a short delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? error.message : 'Failed to open financial information document. Please try again.');
            setAlertModal({ isOpen: true, message: errorMessage });
            if (process.env.NODE_ENV === 'development') {
                console.error('Error viewing financial information document:', error);
            }
        } finally {
            setActionLoading(null);
        }
    }, [setActionLoading, setAlertModal]);

    const handleDeleteDocument = useCallback((documentId: string) => {
        if (!user?.userID) {
            setAlertModal({ isOpen: true, message: 'User not authenticated. Please log in again.' });
            return;
        }
        
        setDeleteConfirmModal({ isOpen: true, documentId });
    }, [user?.userID, setAlertModal, setDeleteConfirmModal]);

    const confirmDelete = async () => {
        if (!deleteConfirmModal.documentId || !user?.userID) return;
        
        setActionLoading(deleteConfirmModal.documentId);
        try {
            console.log('Deleting financial information document:', deleteConfirmModal.documentId);
            const response = await deleteFinancialInformationDocument2(deleteConfirmModal.documentId, user.userID);
            console.log('Financial information document deleted successfully:', response);
            
            await loadDocuments();
            
            if (onRefresh) {
                onRefresh();
            }
            
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? error.message : 'Failed to delete financial information document. Please try again.');
            setAlertModal({ isOpen: true, message: errorMessage });
            if (process.env.NODE_ENV === 'development') {
                console.error('Error deleting financial information document:', error);
            }
        } finally {
            setActionLoading(null);
            setDeleteConfirmModal({ isOpen: false, documentId: null });
        }
    };

    const viewTemplate = useCallback((props: Record<string, unknown>) => {
        const docId = (props.documentID || props.documentId) as string;
        if (!docId) return null;
        
        const isActionLoading = actionLoading === docId;

        return (
            <div className="flex items-center justify-center">
                <Button
                    variant="primary"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => handleViewDocument(docId)}
                    disabled={isActionLoading}
                    title="View Document"
                >
                    {isActionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Eye className="w-4 h-4" />
                    )}
                </Button>
            </div>
        );
    }, [actionLoading, handleViewDocument]);

    const actionTemplate = useCallback((props: Record<string, unknown>) => {
        const docId = (props.documentID || props.documentId) as string;
        if (!docId) return null;
        
        const isActionLoading = actionLoading === docId;

        return (
            <div className="flex items-center gap-2 justify-center">
                <Button
                    variant="secondary"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    onClick={() => handleDeleteDocument(docId)}
                    disabled={isActionLoading}
                    title="Delete Document"
                >
                    {isActionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Trash2 className="w-4 h-4" />
                    )}
                </Button>
            </div>
        );
    }, [actionLoading, handleDeleteDocument]);

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

    const formatExpiryDate = (props: Record<string, unknown>) => {
        const documentCategory = props.documentCategory as string;
        let expiry: string | null = null;

        if (documentCategory === 'Financial Statements') {
            expiry = (props.financialStatementsExpiry as string) || null;
        } else if (documentCategory === '6 Months Bank Statement') {
            expiry = (props.bankStatementExpiry as string) || null;
        } else {
            // Fallback / legacy fields
            expiry = (props.expiryDate || props.ExpiryDate || props.expiry_date) as string;
        }

        if (!expiry) return 'N/A';
        return formatDate(expiry);
    };

    const gridContentHeight = compact ? 320 : 500;
    const gridMinHeight = gridContentHeight + 60; // content + toolbar to prevent layout shift

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8" style={{ minHeight: gridMinHeight }}>
                <div className="text-center">
                    <span className="e-icons e-loading e-spin" style={{ fontSize: '32px', color: '#3b82f6' }}></span>
                    <p className="text-gray-600 mt-2">Loading financial information documents...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg" style={{ minHeight: gridMinHeight }}>
                <div className="flex justify-between items-center">
                    <span className="text-red-800">{error}</span>
                    <Button
                        variant="secondary" size="sm"
                        onClick={loadDocuments}
                    >
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    if (allDocuments.length === 0 && !isLoading) {
        return (
            <div className="p-8 text-center text-gray-600 flex items-center justify-center" style={{ minHeight: gridMinHeight }}>
                <p>No financial information documents found for this company.</p>
            </div>
        );
    }

    return (
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
                    fields: ['displayName', 'name_File', 'documentCategory', 'createdBy'],
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
                        template={viewTemplate}
                        allowSorting={false}
                        allowFiltering={false}
                    />
                    <ColumnDirective
                        field="name_File"
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
                        template={(props: Record<string, unknown>) => formatDate((props.uploadDate || props.createdDate) as string)}
                    />
                    <ColumnDirective
                        field="expiryDate"
                        headerText="Expiry Date"
                        width="150"
                        textAlign="Center"
                        template={formatExpiryDate}
                    />
                    <ColumnDirective
                        field="createdBy"
                        headerText="Created By"
                        width="200"
                        textAlign="Left"
                    />
                    {allowDelete && (
                        <ColumnDirective
                            field="actions"
                            headerText="Actions"
                            width="120"
                            textAlign="Center"
                            template={actionTemplate}
                            allowSorting={false}
                            allowFiltering={false}
                        />
                    )}
                </ColumnsDirective>
                <Inject services={[Page, Sort, Toolbar, Search]} />
            </GridComponent>

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

            {/* Alert Modal */}
            <ConfirmationModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ isOpen: false, message: '' })}
                title="Alert"
                message={alertModal.message}
                type="alert"
            />
        </div>
    );
};

export default FinancialDocumentsGrid;
