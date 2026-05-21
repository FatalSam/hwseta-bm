import React, { useEffect, useState } from 'react';
import { getCoachingHeaderById } from '@/api/business-services';
import { CompanyBusinessCoachingHeader2 } from '@/types/business-coaching';
import { Spinner } from '@/components/ui/spinner';
import Button from '@/components/ui/button';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';

interface CoachingViewModalProps {
    headerId: string;
    onClose: () => void;
}

const CoachingViewModal: React.FC<CoachingViewModalProps> = ({ headerId, onClose }) => {
    const [header, setHeader] = useState<CompanyBusinessCoachingHeader2 | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const toastInstanceRef = React.useRef<ToastComponent | null>(null);

    useEffect(() => {
        const loadHeader = async () => {
            if (!headerId) {
                setError('No header ID provided');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const data = await getCoachingHeaderById(headerId);
                
                // Check if data is valid
                if (!data) {
                    throw new Error('No data returned from server');
                }
                
                setHeader(data as CompanyBusinessCoachingHeader2);
            } catch (err: unknown) {
                let errorMessage = 'Failed to load coaching assignment details.';
                
                if (err instanceof Error) {
                    errorMessage = err.message || errorMessage;
                } else if (typeof err === 'object' && err !== null) {
                    // Try to extract message from error object
                    const errorObj = err as Record<string, unknown>;
                    if (errorObj.message && typeof errorObj.message === 'string') {
                        errorMessage = errorObj.message;
                    } else if (errorObj.userMessage && typeof errorObj.userMessage === 'string') {
                        errorMessage = errorObj.userMessage;
                    }
                }
                
                setError(errorMessage);
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
        };

        loadHeader();
    }, [headerId]);

    const formatDate = (value?: string | null) => {
        if (!value) return 'N/A';
        try {
            const date = new Date(value);
            return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'N/A';
        }
    };

    const formatFileSize = (bytes?: number | null) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const downloadFile = (fileData: string | null | undefined, fileName: string | null | undefined, contentType: string | null | undefined) => {
        if (!fileData || !fileName) return;
        
        try {
            const byteCharacters = atob(fileData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: contentType || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading file:', err);
            if (toastInstanceRef.current) {
                toastInstanceRef.current.show({
                    title: 'Error',
                    content: 'Failed to download file',
                    timeOut: 3000,
                    position: { X: 'Right', Y: 'Top' },
                    cssClass: 'e-toast-error'
                });
            }
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-end bg-black/30 z-50 lg:justify-start lg:pl-72">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl h-full lg:h-auto lg:ml-6 lg:mt-4 lg:mb-4 relative overflow-y-auto">
                <ToastComponent ref={toastInstanceRef} />
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                    <h2 className="text-2xl font-bold text-teal-600">Coaching Assignment Details</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center min-h-[400px]">
                            <Spinner size="large" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <div className="text-red-600 mb-2 font-medium">Error loading assignment</div>
                            <div className="text-gray-600 text-sm mb-4">{error}</div>
                            <Button variant="primary" onClick={onClose}>
                                Close
                            </Button>
                        </div>
                    ) : !header ? (
                        <div className="text-center py-8 text-gray-500">
                            No assignment data found
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Basic Information */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Assignment Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Assignment Title</label>
                                        <p className="text-gray-900 mt-1">{header.assignmentTitle || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Date Submitted</label>
                                        <p className="text-gray-900 mt-1">{formatDate(header.dateSubmitted)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Created Date</label>
                                        <p className="text-gray-900 mt-1">{formatDate(header.dateCreated)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Last Modified</label>
                                        <p className="text-gray-900 mt-1">{formatDate(header.modifiedDate)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Verification Status</label>
                                        <p className="text-gray-900 mt-1">
                                            {header.isVerified ? (
                                                <span className="text-green-600 font-medium">✓ Verified</span>
                                            ) : (
                                                <span className="text-gray-400">Not Verified</span>
                                            )}
                                        </p>
                                    </div>
                                    {header.isVerified && (
                                        <>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Verified Date</label>
                                                <p className="text-gray-900 mt-1">{formatDate(header.verifiedDate)}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Verified By</label>
                                                <p className="text-gray-900 mt-1">{header.verifiedBy || 'N/A'}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Coaching Videos */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                    Coaching Videos ({header.coachingVideos?.length || 0})
                                </h3>
                                {header.coachingVideos && header.coachingVideos.length > 0 ? (
                                    <div className="space-y-2">
                                        {header.coachingVideos.map((video, index) => (
                                            <div key={index} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{video.displayName || video.name_File || `Video ${index + 1}`}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {video.extension?.toUpperCase()} • {formatFileSize(video.fileSize)} • {formatDate(video.uploadDate)}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => downloadFile(video.fileData, video.displayName || video.name_File, video.contentType)}
                                                >
                                                    Download
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No videos uploaded</p>
                                )}
                            </div>

                            {/* Coaching Assignments */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                    Coaching Assignments ({header.coachingAssignments?.length || 0})
                                </h3>
                                {header.coachingAssignments && header.coachingAssignments.length > 0 ? (
                                    <div className="space-y-2">
                                        {header.coachingAssignments.map((assignment, index) => (
                                            <div key={index} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{assignment.displayName || assignment.name_File || `Assignment ${index + 1}`}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {assignment.extension?.toUpperCase()} • {formatFileSize(assignment.fileSize)} • {formatDate(assignment.uploadDate)}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => downloadFile(assignment.fileData, assignment.displayName || assignment.name_File, assignment.contentType)}
                                                >
                                                    Download
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No assignments uploaded</p>
                                )}
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-200">
                                <Button variant="primary" onClick={onClose}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoachingViewModal;

