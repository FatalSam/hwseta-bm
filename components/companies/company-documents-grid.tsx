import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GridComponent, ColumnsDirective, ColumnDirective, Inject, Page, Sort, Toolbar, Search } from '@syncfusion/ej2-react-grids';
import Button from '@/components/ui/button';
import { getDocumentsByCompanyID2, getDocumentByID2, deleteCompanyDocument2 } from '@/api/companies';
import { getAllUsers } from '@/api/users';
import { enableRipple } from '@syncfusion/ej2-base';
import { useAuthStore } from '@/store/authStore';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import CompanyDocumentEditModal from './company-document-edit-modal';
import { Eye, Trash2, Loader2, Edit } from 'lucide-react';

// Enable ripple effect
enableRipple(true);

interface Document {
    documentID: string;
    companyID: string;
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
    TaxClearanceExpiry?: string;
    BeeCertificateExpiry?: string;
    // Legacy fields for backward compatibility
    expiryDate?: string;
    ExpiryDate?: string;
    expiry_date?: string;
    // Handle case variations from API
    taxClearanceExpiry?: string;
    beeCertificateExpiry?: string;
    [key: string]: unknown; // Allow additional properties
}

interface CompanyDocumentsGridProps {
    companyId: string;
    onRefresh?: () => void;
    refreshTrigger?: number;
}

const CompanyDocumentsGrid: React.FC<CompanyDocumentsGridProps> = ({ companyId, onRefresh, refreshTrigger }) => {
    const { user } = useAuthStore();
    const [allDocuments, setAllDocuments] = useState<Document[]>([]);
    const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; documentId: string | null }>({ isOpen: false, documentId: null });
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
    const [editModal, setEditModal] = useState<{ isOpen: boolean; document: Document | null }>({ isOpen: false, document: null });
    const gridRef = useRef<GridComponent>(null);

    // Load users to create name mapping
    // This is a non-critical operation - if it fails, we just won't show user names
    const loadUsers = useCallback(async () => {
        try {
            const users = await getAllUsers();
            const nameMap: Record<string, string> = {};
            
            if (Array.isArray(users)) {
                users.forEach((user) => {
                    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                    if (fullName && user.userID) {
                        nameMap[user.userID] = fullName;
                    }
                });
            }
            
            setUserNameMap(nameMap);
        } catch (error) {
            // Silently handle errors - this is a non-critical feature
            // User names will just show as IDs if this fails
            // Only log in development mode for debugging
            if (process.env.NODE_ENV === 'development') {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                // Use console.warn for non-critical errors instead of console.error
                console.warn('Could not load user names for display (non-critical):', errorMessage);
            }
            // Set empty map so we don't break the UI
            setUserNameMap({});
        }
    }, []);

    const loadDocuments = useCallback(async () => {
        if (!companyId) return;
        
        setIsLoading(true);
        setError('');
        
        try {
            console.log('Loading documents for company:', companyId);
            const response = await getDocumentsByCompanyID2(companyId);
            console.log('Documents response:', response);
            
            // Handle different response formats
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
            setAllDocuments(docsArray);
            setFilteredDocuments(docsArray);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? error.message : 'Failed to load documents. Please try again.');
            setError(errorMessage);
            setAllDocuments([]);
            setFilteredDocuments([]);
            if (process.env.NODE_ENV === 'development') {
                console.error('Error loading documents:', error);
            }
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    // Load users on component mount
    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        loadDocuments();
    }, [companyId, refreshTrigger, loadDocuments]);

    // Filter documents based on search query
    useEffect(() => {
        if (!searchQuery || !searchQuery.trim()) {
            setFilteredDocuments(allDocuments);
        } else {
        const query = searchQuery.toLowerCase().trim();
        const filtered = allDocuments.filter(doc => {
            const displayName = (doc.displayName || '').toLowerCase();
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
            console.log('Viewing document:', documentId);
            const response = await getDocumentByID2(documentId);
            console.log('Document data response:', response);
            
            // Handle different response formats
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
            
            // Extract file data and metadata
            const fileData = documentData.fileData || documentData.FileData;
            const contentType = documentData.contentType || documentData.ContentType || 'application/octet-stream';
            
            if (!fileData) {
                throw new Error('No file data found in the response');
            }
            
            // Validate base64 data
            try {
                // Test if the base64 string is valid
                atob(fileData);
            } catch {
                throw new Error('Invalid file data format');
            }
            
            // Create blob from base64 data
            const byteCharacters = atob(fileData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: contentType });
            
            // Create object URL and open in new tab
            const url = URL.createObjectURL(blob);
            const newWindow = window.open(url, '_blank');
            
            if (!newWindow) {
                throw new Error('Popup blocked. Please allow popups for this site and try again.');
            }
            
            // Clean up the URL after a delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
        } catch (error) {
            console.error('Error viewing document:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to open document. Please try again.';
            setAlertModal({ isOpen: true, message: errorMessage });
        } finally {
            setActionLoading(null);
        }
    }, [setActionLoading, setAlertModal]);

    const handleEditDocument = useCallback((documentId: string) => {
        const document = allDocuments.find(doc => doc.documentID === documentId);
        if (document) {
            setEditModal({ isOpen: true, document });
        }
    }, [allDocuments, setEditModal]);

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
            console.log('Deleting document:', deleteConfirmModal.documentId);
            const response = await deleteCompanyDocument2(deleteConfirmModal.documentId, user.userID);
            console.log('Document deleted successfully:', response);
            
            // Refresh the documents list
            await loadDocuments();
            
            // Call parent refresh if provided
            if (onRefresh) {
                onRefresh();
            }
            
        } catch (error: unknown) {
            console.error('Error deleting document:', error);
            
            // Extract more detailed error information
            let errorMessage = 'Failed to delete document. Please try again.';
            
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as Record<string, unknown>;
                if (axiosError.response && typeof axiosError.response === 'object' && 'data' in axiosError.response) {
                    const responseData = axiosError.response.data as Record<string, unknown>;
                    if (responseData.message && typeof responseData.message === 'string') {
                        errorMessage = responseData.message;
                    }
                } else if (axiosError.response && typeof axiosError.response === 'object' && 'status' in axiosError.response) {
                    const status = axiosError.response.status as number;
                    switch (status) {
                    case 400:
                        errorMessage = 'Bad request. The document may not exist or you may not have permission to delete it.';
                        break;
                    case 401:
                        errorMessage = 'Unauthorized. Please log in again.';
                        break;
                    case 403:
                        errorMessage = 'Forbidden. You do not have permission to delete this document.';
                        break;
                    case 404:
                        errorMessage = 'Document not found. It may have already been deleted.';
                        break;
                    case 500:
                        errorMessage = 'Server error. Please try again later.';
                        break;
                    default:
                        errorMessage = `Error ${status}: Unknown error`;
                    }
                }
            } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
                errorMessage = error.message;
            }
            
            setAlertModal({ isOpen: true, message: errorMessage });
        } finally {
            setActionLoading(null);
            setDeleteConfirmModal({ isOpen: false, documentId: null });
        }
    };

    const handleSaveDocument = async (documentId: string, updatedData: {
        displayName: string;
        TaxClearanceExpiry?: string | null;
        BeeCertificateExpiry?: string | null;
        expiryDate?: string | null;
    }) => {
        // TODO: Implement API integration for updating document
        // For now, just log the data and refresh the list
        console.log('Updating document:', documentId, updatedData);
        
        // Refresh the documents list after update
        await loadDocuments();
        
        // Call parent refresh if provided
        if (onRefresh) {
            onRefresh();
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
                    className="cursor-pointer"
                    onClick={() => handleEditDocument(docId)}
                    disabled={isActionLoading}
                    title="Edit Document"
                >
                    {isActionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Edit className="w-4 h-4" />
                    )}
                </Button>
                <Button variant="secondary" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
    }, [actionLoading, handleEditDocument, handleDeleteDocument]);

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
        // Determine which expiry date field to use based on document category
        const documentCategory = (props.documentCategory || props.DocumentCategory) as string;
        let expiryDate: string | null = null;
        
        // Use specific expiry fields based on document category
        if (documentCategory === 'Tax Clearance') {
            expiryDate = (props.TaxClearanceExpiry || props.taxClearanceExpiry) as string;
        } else if (documentCategory === 'B-BBEE Certificate-Affidavit' || documentCategory === 'B-BBEE Certificate') {
            expiryDate = (props.BeeCertificateExpiry || props.beeCertificateExpiry) as string;
        } else {
            // For other documents or legacy support, check all possible fields
            expiryDate = (props.TaxClearanceExpiry || props.BeeCertificateExpiry || 
                         props.expiryDate || props.ExpiryDate || props.expiry_date) as string;
        }
        
        if (!expiryDate) return 'N/A';
        
        try {
            const date = new Date(expiryDate);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'N/A';
        }
    };

    const gridContentHeight = 500;
    const gridMinHeight = gridContentHeight + 60;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8" style={{ minHeight: gridMinHeight }}>
                <div className="text-center">
                    <span className="e-icons e-loading e-spin" style={{ fontSize: '32px', color: '#3b82f6' }}></span>
                    <p className="text-gray-600 mt-2">Loading documents...</p>
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
                <p>No documents found for this company.</p>
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
                    fields: ['displayName', 'documentCategory', 'createdBy'],
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
                        template={(props: Record<string, unknown>) => {
                            // Check for different possible field name variations
                            const userId = (props.createdBy || props.CreatedBy || props.created_by) as string;
                            if (!userId) return 'N/A';
                            const userName = userNameMap[userId] || userId;
                            return <span>{userName}</span>;
                        }}
                    />
                    <ColumnDirective
                        field="actions"
                        headerText="Actions"
                        width="150"
                        textAlign="Center"
                        template={actionTemplate}
                        allowSorting={false}
                        allowFiltering={false}
                    />
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

            {/* Edit Document Modal */}
            <CompanyDocumentEditModal
                isOpen={editModal.isOpen}
                onClose={() => setEditModal({ isOpen: false, document: null })}
                document={editModal.document}
                onSave={handleSaveDocument}
            />
        </div>
    );
};

export default CompanyDocumentsGrid;
