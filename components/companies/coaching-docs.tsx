import React, { useState, useEffect } from 'react';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';
import Button from '@/components/ui/button';
import {
    preventInvalidDateInputBeforeInput,
    preventInvalidDateInputKeyDown,
    preventInvalidDateInputPaste,
} from '@/components/ui/SyncfusionIsoDatePicker';

import { CompanyBusinessCoachingHeader2 } from '@/types/business-coaching';

interface CoachingDocsProps {
    onSave?: (documents: Record<string, unknown>) => void;
    isEditMode?: boolean;
    initialData?: CompanyBusinessCoachingHeader2 | null;
    headerId?: string | null;
}

const CoachingDocs: React.FC<CoachingDocsProps> = ({ onSave, isEditMode = false, initialData, headerId }) => {
    const [title, setTitle] = useState<string>(initialData?.assignmentTitle || '');
    const [dateAttended, setDateAttended] = useState<Date | null>(
        initialData?.dateSubmitted ? new Date(initialData.dateSubmitted) : new Date()
    );
    const [videos, setVideos] = useState<File[]>([]);
    const [assignments, setAssignments] = useState<File[]>([]);
    const [dragOver, setDragOver] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    // Update form when initialData changes
    useEffect(() => {
        if (initialData) {
            setTitle(initialData.assignmentTitle || '');
            setDateAttended(initialData.dateSubmitted ? new Date(initialData.dateSubmitted) : new Date());
        }
    }, [initialData]);

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
        if (field === 'videos') {
            setVideos(prev => [...prev, ...files]);
        } else if (field === 'assignments') {
            setAssignments(prev => [...prev, ...files]);
        }
    };

    const handleFileChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

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
        if (field === 'videos') {
            setVideos(prev => [...prev, ...fileArray]);
        } else if (field === 'assignments') {
            setAssignments(prev => [...prev, ...fileArray]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            onSave?.({
                title,
                dateAttended,
                video: videos,
                assignment: assignments,
                headerId: headerId,
                isUpdate: !!headerId,
            });
            // Only clear if not in edit mode (new entry)
            if (!headerId) {
                setVideos([]);
                setAssignments([]);
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
                {headerId ? 'Update Business Coaching Assignment' : 'Business Coaching'}
            </h3>
            {errorMessage && (
                <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">{errorMessage}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assignment</label>
                            <TextBoxComponent
                                id="coaching-title"
                                placeholder="Enter assignment title"
                                value={title}
                                change={(args) => setTitle(args.value)}
                                enabled={isEditMode}
                                cssClass="e-outline w-full mb-2"
                                type="text"
                            />
                        </div>
                        <div
                            onBeforeInputCapture={preventInvalidDateInputBeforeInput}
                            onKeyDownCapture={preventInvalidDateInputKeyDown}
                            onPasteCapture={preventInvalidDateInputPaste}
                        >
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date Submitted</label>
                            <DatePickerComponent
                                id="coaching-date"
                                placeholder="Select date"
                                value={dateAttended ?? undefined}
                                change={(args) => setDateAttended(args.value)}
                                enabled={isEditMode}
                                cssClass="e-outline w-full mb-2"
                                format="dd MMMM yyyy"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Coaching Videos</label>
                            <div
                                className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                    dragOver === 'videos' ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                onDragOver={(e) => handleDragOver(e, 'videos')}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'videos')}
                                onClick={() => {
                                    if (isEditMode) {
                                        const input = document.getElementById('coaching-videos-input') as HTMLInputElement;
                                        input?.click();
                                    }
                                }}
                            >
                                <input
                                    id="coaching-videos-input"
                                    type="file"
                                    onChange={handleFileChange('videos')}
                                    disabled={!isEditMode}
                                    multiple
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                />
                                <div className="text-center">
                                    <div className="text-gray-500 text-sm">
                                        {videos.length > 0 ? (
                                            <span className="text-green-600 font-medium">✓ Selected {videos.length} file(s)</span>
                                        ) : (
                                            <span>{isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB each)</div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Coaching Assignments</label>
                            <div
                                className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                    dragOver === 'assignments' ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                onDragOver={(e) => handleDragOver(e, 'assignments')}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'assignments')}
                                onClick={() => {
                                    if (isEditMode) {
                                        const input = document.getElementById('coaching-assignments-input') as HTMLInputElement;
                                        input?.click();
                                    }
                                }}
                            >
                                <input
                                    id="coaching-assignments-input"
                                    type="file"
                                    onChange={handleFileChange('assignments')}
                                    disabled={!isEditMode}
                                    multiple
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                />
                                <div className="text-center">
                                    <div className="text-gray-500 text-sm">
                                        {assignments.length > 0 ? (
                                            <span className="text-green-600 font-medium">✓ Selected {assignments.length} file(s)</span>
                                        ) : (
                                            <span>{isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB each)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {isEditMode && (
                    <div className="flex justify-end">
                        <Button type="submit" variant="primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Details'}
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default CoachingDocs;


