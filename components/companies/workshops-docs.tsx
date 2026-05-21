import React, { useState, useEffect, useCallback } from 'react';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';
import Button from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { saveCompleteBusinessWorkshops, getBusinessWorkshopsHeadersByCompanyID } from '@/api/companies';

interface WorkshopDocsProps {
    onSave?: (documents: Record<string, unknown>) => void;
    isEditMode?: boolean;
}

const WorkshopDocs: React.FC<WorkshopDocsProps> = ({
    onSave,
    isEditMode = false
}) => {
    const { user } = useAuthStore();
    const [title, setTitle] = useState<string>('');
    const [dateAttended, setDateAttended] = useState<Date | null>(new Date());
    const [workshopVideos, setWorkshopVideos] = useState<File[]>([]);
    const [workshopAssignments, setWorkshopAssignments] = useState<File[]>([]);
    const [dragOver, setDragOver] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string>('');

    const loadWorkshopHeaders = useCallback(async () => {
        if (!user?.companyID) return;
        try {
            console.log('Loading workshop headers for company:', user.companyID);
            const response = await getBusinessWorkshopsHeadersByCompanyID(user.companyID);
            console.log('Workshop headers response:', response);
            if (response && Array.isArray(response) && response.length > 0) {
                const latestHeader = response[0] as Record<string, unknown>;
                setTitle(typeof latestHeader.title === 'string' ? latestHeader.title : '');
                const dateAttendedCompleted = (latestHeader as Record<string, unknown>)['dateAttended_Completed'];
                setDateAttended(
                    typeof dateAttendedCompleted === 'string'
                        ? new Date(dateAttendedCompleted)
                        : new Date()
                );
                console.log('Workshop header loaded:', latestHeader);
            }
        } catch (error) {
            console.error('Error loading workshop headers:', error);
        }
    }, [user?.companyID]);

    // Load existing headers when component mounts
    useEffect(() => {
        loadWorkshopHeaders();
    }, [user?.companyID, loadWorkshopHeaders]);

    // Helper function to convert File to base64
    const fileToBase64 = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    

    const handleDragOver = (e: React.DragEvent, field: string) => {
        e.preventDefault();
        setDragOver(field);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(null);
    };

    const handleDrop = (e: React.DragEvent, field: string) => {
        e.preventDefault();
        setDragOver(null);
        
        const files = Array.from(e.dataTransfer.files);
        if (field === 'workshopVideos') {
            setWorkshopVideos(prev => [...prev, ...files]);
        } else if (field === 'workshopAssignments') {
            setWorkshopAssignments(prev => [...prev, ...files]);
        }
    };

    const handleFileChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const files = event.target.files;
            if (files && files.length > 0) {
                const maxSize = 10 * 1024 * 1024; // 10MB
                const oversizedFiles = Array.from(files).filter(file => file.size > maxSize);
                
                if (oversizedFiles.length > 0) {
                    setErrorMessage(`File(s) too large. Maximum size is 10MB. Large files: ${oversizedFiles.map(f => f.name).join(', ')}`);
                    return;
                }
                
                const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
                const invalidFiles = Array.from(files).filter(file => {
                    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
                    return !allowedTypes.includes(extension);
                });
                
                if (invalidFiles.length > 0) {
                    setErrorMessage(`Invalid file type(s). Allowed types: ${allowedTypes.join(', ')}. Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`);
                    return;
                }
                
                setErrorMessage('');
                
                const fileArray = Array.from(files);
                if (field === 'workshopVideos') {
                    setWorkshopVideos(prev => [...prev, ...fileArray]);
                } else if (field === 'workshopAssignments') {
                    setWorkshopAssignments(prev => [...prev, ...fileArray]);
                }
            }
        } catch (error) {
            console.error('Error handling file change:', error);
            setErrorMessage('Error processing files. Please try again.');
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Direct validation
        if (!user || !user.companyID || !user.userID) {
            setErrorMessage('User authentication data is missing. Please refresh the page and try again.');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');
        setSaveMessage('');

        try {
            const documents: Array<{
                documentCategory: string;
                name_File: string;
                displayName: string;
                extension: string;
                contentType: string;
                fileData: string;
                fileSize: number;
                uploadDate: string;
                documentScore: number;
            }> = [];

            // Process Workshop Videos files
            for (const file of workshopVideos) {
                const fileData = await fileToBase64(file);
                const extension = file.name.split('.').pop()?.toLowerCase() || '';
                documents.push({
                    documentCategory: 'Workshop Video',
                    name_File: file.name,
                    displayName: file.name,
                    extension: extension ? `.${extension}` : '',
                    contentType: file.type,
                    fileData: fileData,
                    fileSize: file.size,
                    uploadDate: new Date().toISOString(),
                    documentScore: 0 // Default score, can be updated later
                });
            }

            // Process Workshop Assignments files
            for (const file of workshopAssignments) {
                const fileData = await fileToBase64(file);
                const extension = file.name.split('.').pop()?.toLowerCase() || '';
                documents.push({
                    documentCategory: 'Workshop Assignment',
                    name_File: file.name,
                    displayName: file.name,
                    extension: extension ? `.${extension}` : '',
                    contentType: file.type,
                    fileData: fileData,
                    fileSize: file.size,
                    uploadDate: new Date().toISOString(),
                    documentScore: 0 // Default score, can be updated later
                });
            }

            // Create payload with flattened structure for new API
            const payload = {
                companyID: user.companyID,
                createdBy: user.userID,
                title: title || 'Untitled Workshop',
                dateAttended_Completed: dateAttended ? dateAttended.toISOString() : new Date().toISOString(),
                documents: documents
            };

            console.log('=== WORKSHOP DOCUMENTS SAVE DEBUG ===');
            console.log('Payload being sent:', JSON.stringify(payload, null, 2));
            console.log('Number of documents:', documents.length);
            console.log('Company ID:', user.companyID);
            console.log('User ID:', user.userID);
            
            const saveResponse = await saveCompleteBusinessWorkshops(payload);
            console.log('=== SAVE RESPONSE ===');
            console.log('Full response:', saveResponse);
            console.log('Response status:', saveResponse?.status);
            console.log('Response data:', saveResponse?.data);
            console.log('Response message:', saveResponse?.message);
            
            if (documents.length > 0) {
                setSaveMessage('Workshop documents saved successfully!');
            } else {
                setSaveMessage('Workshop information saved successfully!');
            }
            setErrorMessage('');
            
            // Reset form
            setWorkshopVideos([]);
            setWorkshopAssignments([]);
            
            // Call onSave callback if provided to refresh the grid
            if (onSave) {
                onSave({
                    title,
                    dateAttended,
                    workshopVideos: [],
                    workshopAssignments: []
                });
            }
            
        } catch (error: unknown) {
            console.error('Error saving workshop documents:', error);
            let friendlyMessage = 'Failed to save workshop documents. Please try again.';
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as Record<string, unknown>;
                if (axiosError.response && typeof axiosError.response === 'object') {
                    const response = axiosError.response as Record<string, unknown>;
                    if (response.data && typeof response.data === 'object') {
                        const data = response.data as Record<string, unknown>;
                        if (typeof data.message === 'string') {
                            friendlyMessage = data.message;
                        }
                    } else if (typeof response.status === 'number') {
                        const statusText = typeof response.statusText === 'string' ? response.statusText : 'Unknown error';
                        friendlyMessage = `API Error ${response.status}: ${statusText}`;
                    }
                }
            }
            setErrorMessage(friendlyMessage);
            setSaveMessage('');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Tasks & Assignments</h3>
            
            {saveMessage && (
                <div className="mb-4 p-3 rounded border border-green-300 bg-green-50 text-green-800 text-sm">
                    {saveMessage}
                </div>
            )}

            {errorMessage && (
                <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">
                    {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Title
                            </label>
                            <TextBoxComponent
                                id="title"
                                placeholder="Enter task or assignment title"
                                value={title}
                                change={(args) => setTitle(args.value)}
                                enabled={isEditMode}
                                cssClass="e-outline w-full mb-2"
                                type="text"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date Attended/Completed
                            </label>
                            <DatePickerComponent
                                id="dateAttended"
                                placeholder="Select date"
                                value={dateAttended ?? undefined}
                                change={(args) => setDateAttended(args.value)}
                                enabled={isEditMode}
                                cssClass="e-outline w-full mb-2"
                                format="dd MMMM yyyy"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Workshop Videos
                            </label>
                            <div
                                className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                    dragOver === 'workshopVideos'
                                        ? 'border-blue-400 bg-blue-50'
                                        : 'border-gray-300 hover:border-gray-400'
                                } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                onDragOver={(e) => handleDragOver(e, 'workshopVideos')}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'workshopVideos')}
                                onClick={() => {
                                    if (isEditMode) {
                                        const input = document.getElementById('workshopVideos-input') as HTMLInputElement;
                                        input?.click();
                                    }
                                }}
                            >
                                <input
                                    id="workshopVideos-input"
                                    type="file"
                                    onChange={handleFileChange('workshopVideos')}
                                    disabled={!isEditMode}
                                    multiple
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                />
                                <div className="text-center">
                                    <div className="text-gray-500 text-sm">
                                        {workshopVideos.length > 0 ? (
                                            <span className="text-green-600 font-medium">
                                                ✓ Selected {workshopVideos.length} file(s): {workshopVideos.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                            </span>
                                        ) : (
                                            <span>
                                                {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB each)
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Workshop Assignments
                            </label>
                            <div
                                className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                    dragOver === 'workshopAssignments'
                                        ? 'border-blue-400 bg-blue-50'
                                        : 'border-gray-300 hover:border-gray-400'
                                } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                onDragOver={(e) => handleDragOver(e, 'workshopAssignments')}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'workshopAssignments')}
                                onClick={() => {
                                    if (isEditMode) {
                                        const input = document.getElementById('workshopAssignments-input') as HTMLInputElement;
                                        input?.click();
                                    }
                                }}
                            >
                                <input
                                    id="workshopAssignments-input"
                                    type="file"
                                    onChange={handleFileChange('workshopAssignments')}
                                    disabled={!isEditMode}
                                    multiple
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                />
                                <div className="text-center">
                                    <div className="text-gray-500 text-sm">
                                        {workshopAssignments.length > 0 ? (
                                            <span className="text-green-600 font-medium">
                                                ✓ Selected {workshopAssignments.length} file(s): {workshopAssignments.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                            </span>
                                        ) : (
                                            <span>
                                                {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB each)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {isEditMode && (
                    <div className="flex justify-end">
                        <Button type="submit" variant="primary"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Details'}
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default WorkshopDocs;