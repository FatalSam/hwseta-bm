import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GridComponent, ColumnsDirective, ColumnDirective, Inject, Page, Sort, Toolbar, Search } from '@syncfusion/ej2-react-grids';
import Button from '@/components/ui/button';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';
import { TextAreaComponent } from '@syncfusion/ej2-react-inputs';
import { getBusinessCoachingSummaryByCompanyId, verifyAssignment, getCoachingHeaderById } from '@/api/business-services';
import { useAuthStore } from '@/store/authStore';
import { Spinner } from '@/components/ui/spinner';

interface CoachingDocumentsGridAdminProps {
    companyId: string;
    refreshTrigger?: number;
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
    dateVerified?: string | null;
    verifiedBy?: string | null;
}

interface ApprovalModalData {
    headerId: string;
    assignmentTitle: string;
    action: 'approve' | 'decline';
}

const CoachingDocumentsGridAdmin: React.FC<CoachingDocumentsGridAdminProps> = ({ companyId, refreshTrigger }) => {
    const [headers, setHeaders] = useState<CoachingHeader[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState<ApprovalModalData | null>(null);
    const [comments, setComments] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const toastInstanceRef = useRef<ToastComponent | null>(null);
    const { user } = useAuthStore();

    const loadHeaders = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getBusinessCoachingSummaryByCompanyId(companyId);
            const headersData = Array.isArray(data) ? data : [];
            setHeaders(headersData as CoachingHeader[]);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? error.message : 'Failed to load coaching assignments. Please try again.');
            setError(errorMessage);
            setHeaders([]);
            
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

    const handleApprove = (headerId: string, assignmentTitle: string) => {
        setModalData({
            headerId,
            assignmentTitle,
            action: 'approve'
        });
        setComments('');
        setShowModal(true);
    };

    const handleDecline = (headerId: string, assignmentTitle: string) => {
        setModalData({
            headerId,
            assignmentTitle,
            action: 'decline'
        });
        setComments('');
        setShowModal(true);
    };

    const handleView = async (headerId: string) => {
        try {
            const headerData = await getCoachingHeaderById(headerId);
            // TODO: Open a modal or navigate to view the assignment details
            // For now, just show a toast
            if (toastInstanceRef.current) {
                toastInstanceRef.current.show({
                    title: 'Assignment Details',
                    content: `Viewing assignment: ${headerData.assignmentTitle || 'N/A'}`,
                    timeOut: 3000,
                    position: { X: 'Right', Y: 'Top' },
                    cssClass: 'e-toast-info'
                });
            }
        } catch (error) {
            console.error('Error loading assignment details:', error);
            if (toastInstanceRef.current) {
                toastInstanceRef.current.show({
                    title: 'Error',
                    content: 'Failed to load assignment details',
                    timeOut: 5000,
                    position: { X: 'Right', Y: 'Top' },
                    cssClass: 'e-toast-error'
                });
            }
        }
    };

    const handleConfirmAction = async () => {
        if (!modalData || !user?.userID) {
            return;
        }

        setIsProcessing(true);
        try {
            if (modalData.action === 'approve') {
                // Get header details to find associated documents
                const headerData = await getCoachingHeaderById(modalData.headerId);
                
                // The verifyAssignment endpoint requires a documentId
                // If headerData contains documents, verify each one
                // Otherwise, try using the headerId as documentId (API might accept it)
                if (headerData && typeof headerData === 'object') {
                    // Check if header has documents array
                    const headerDataObj = headerData as Record<string, unknown>;
                    const documentsArray = Array.isArray(headerDataObj.documents) 
                        ? headerDataObj.documents 
                        : (Array.isArray(headerDataObj.coachingDocuments) ? headerDataObj.coachingDocuments : []);
                    
                    if (Array.isArray(documentsArray) && documentsArray.length > 0) {
                        // Verify all documents in the header
                        for (const doc of documentsArray) {
                            const docObj = doc as Record<string, unknown>;
                            const docId = docObj.documentID || docObj.id || docObj.businessCoachingDocumentID;
                            if (docId && typeof docId === 'string') {
                                await verifyAssignment(docId, user.userID);
                            }
                        }
                    } else {
                        // Try using headerId directly (API might accept it)
                        await verifyAssignment(modalData.headerId, user.userID);
                    }
                } else {
                    // Fallback: try using headerId
                    await verifyAssignment(modalData.headerId, user.userID);
                }
                
                if (toastInstanceRef.current) {
                    toastInstanceRef.current.show({
                        title: 'Success',
                        content: 'Assignment approved successfully',
                        timeOut: 3000,
                        position: { X: 'Right', Y: 'Top' },
                        cssClass: 'e-toast-success'
                    });
                }
            } else {
                // For decline, we might need a separate endpoint or update the status
                // For now, we'll show a message that decline functionality needs to be implemented
                if (toastInstanceRef.current) {
                    toastInstanceRef.current.show({
                        title: 'Info',
                        content: 'Decline functionality will be implemented with the appropriate API endpoint',
                        timeOut: 5000,
                        position: { X: 'Right', Y: 'Top' },
                        cssClass: 'e-toast-info'
                    });
                }
            }
            
            setShowModal(false);
            setModalData(null);
            setComments('');
            await loadHeaders();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? error.message : 'Failed to process assignment. Please try again.');
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
            setIsProcessing(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setModalData(null);
        setComments('');
    };

    const gridContentHeight = 500;
    const gridMinHeight = gridContentHeight + 60;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: gridMinHeight }}>
                <Spinner size="large" />
            </div>
        );
    }

    return (
        <div>
            <ToastComponent ref={toastInstanceRef} />
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Submitted Assignments</h4>
                
                {error ? (
                    <div className="text-center py-8 flex items-center justify-center" style={{ minHeight: gridMinHeight }}>
                        <div>
                            <div className="text-red-600 mb-2 font-medium">Error loading assignments</div>
                            <div className="text-gray-600 text-sm mb-4">{error}</div>
                            <Button variant="primary" 
                                onClick={() => loadHeaders()}
                            >
                                Retry
                            </Button>
                        </div>
                    </div>
                ) : headers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 flex items-center justify-center" style={{ minHeight: gridMinHeight }}>
                        No assignments found
                    </div>
                ) : (
                    <div className="w-full" style={{ minHeight: gridMinHeight }}>
                        <GridComponent
                            dataSource={headers}
                            allowPaging={true}
                            pageSettings={{ pageSize: 10 }}
                            allowSorting={true}
                            allowFiltering={false}
                            toolbar={['Search']}
                            height={gridContentHeight}
                            cssClass="modern-grid"
                        >
                            <ColumnsDirective>
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
                                    field="isVerified" 
                                    headerText="Status" 
                                    width="150" 
                                    textAlign="Center"
                                    template={(props: Record<string, unknown>) => {
                                        const isVerified = props.isVerified as boolean;
                                        return (
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                isVerified 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {isVerified ? 'Approved' : 'Pending'}
                                            </span>
                                        );
                                    }}
                                />
                                <ColumnDirective 
                                    field="dateVerified" 
                                    headerText="Date Verified" 
                                    width="150" 
                                    textAlign="Center"
                                    template={(props: Record<string, unknown>) => formatDate(props.dateVerified as string)}
                                />
                                <ColumnDirective 
                                    field="verifiedBy" 
                                    headerText="Verified By" 
                                    width="150" 
                                    textAlign="Left"
                                    template={(props: Record<string, unknown>) => props.verifiedBy || '—'}
                                />
                                <ColumnDirective 
                                    headerText="Actions" 
                                    width="250" 
                                    textAlign="Center"
                                    template={(props: Record<string, unknown>) => {
                                        const headerId = props.businessCoachingCompanyHeaderID as string;
                                        const assignmentTitle = props.assignmentTitle as string;
                                        const isVerified = props.isVerified as boolean;
                                        
                                        return (
                                            <div className="flex items-center gap-2 justify-center">
                                                <Button 
                                                    variant="primary" 
                                                    size="sm"
                                                    onClick={() => handleView(headerId)}
                                                    title="View Assignment"
                                                >
                                                    <span className="e-icons e-eye"></span>
                                                </Button>
                                                {!isVerified && (
                                                    <>
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                            onClick={() => handleApprove(headerId, assignmentTitle)}
                                                            title="Approve Assignment"
                                                        >
                                                            <span className="e-icons e-check"></span>
                                                        </Button>
                                                        <Button 
                                                            variant="secondary" 
                                                            size="sm" 
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDecline(headerId, assignmentTitle)}
                                                            title="Decline Assignment"
                                                        >
                                                            <span className="e-icons e-close"></span>
                                                        </Button>
                                                    </>
                                                )}
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

            {/* Approval/Decline Modal */}
            {showModal && modalData && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {modalData.action === 'approve' ? 'Approve' : 'Decline'} Assignment
                                </h3>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">
                                    <span className="font-medium">Assignment:</span> {modalData.assignmentTitle}
                                </p>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Comments {modalData.action === 'decline' && '(Optional)'}
                                </label>
                                <TextAreaComponent
                                    placeholder={modalData.action === 'approve' ? 'Add approval comments (optional)' : 'Add reason for decline (optional)'}
                                    value={comments}
                                    change={(args) => setComments(args.value as string)}
                                    cssClass="e-outline w-full"
                                    width="100%"
                                    rows={4}
                                />
                            </div>
                            
                            <div className="flex justify-end gap-3">
                                <Button variant="secondary"
                                    onClick={handleCloseModal}
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    className={modalData.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                                    onClick={handleConfirmAction}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Processing...' : modalData.action === 'approve' ? 'Approve' : 'Decline'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoachingDocumentsGridAdmin;

