import React, { useState } from 'react';
import { UploaderComponent } from '@syncfusion/ej2-react-inputs';
import { GridComponent, ColumnsDirective, ColumnDirective, PageSettingsModel } from '@syncfusion/ej2-react-grids';
import Button from '@/components/ui/button';
import { BusinessCoaching as BusinessCoachingType } from '@/types/business-coaching';

interface AssignmentItem {
    id: string;
    fullName: string;
    assignmentTitle: string;
    isVerified: boolean;
    dateSubmitted: string;
}

interface BusinessCoachingProps {
    onSave?: (data: Record<string, unknown>) => void;
    isEditMode?: boolean;
    documents?: BusinessCoachingType[];
    isSaving?: boolean;
}

const BusinessCoaching: React.FC<BusinessCoachingProps> = ({
    onSave,
    isEditMode = false,
    documents = [],
    isSaving = false
}) => {
    const [uploadData, setUploadData] = useState<{ video: unknown; assignment: unknown }>({ video: null, assignment: null });
    
    // Convert API documents to grid format
    const assignmentList: AssignmentItem[] = documents.map((doc, index) => ({
        id: doc.documentID || `temp-${index}`,
        fullName: doc.fullName || doc.createdbyUserID || 'Unknown User',
        assignmentTitle: doc.assignmentTitle || 'No Assignment',
        isVerified: doc.isVerified || false,
        dateSubmitted: doc.createdDate ? new Date(doc.createdDate).toLocaleDateString() : 'Unknown'
    }));

    const pageSettings: PageSettingsModel = { pageSize: 5 };

    const handleUploadSuccess = (field: 'video' | 'assignment', args: Record<string, unknown>) => {
        setUploadData(prev => ({ ...prev, [field]: args.file }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onSave) {
            onSave(uploadData);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Business Coaching</h3>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Upload Coaching Video
                            </label>
                            <UploaderComponent
                                id="videoUploader"
                                autoUpload={false}
                                multiple={false}
                                allowedExtensions=".mp4,.mov,.avi"
                                success={handleUploadSuccess.bind(null, 'video')}
                                disabled={!isEditMode || isSaving}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Upload Coaching Assignment
                            </label>
                            <UploaderComponent
                                id="assignmentUploader"
                                autoUpload={false}
                                multiple={false}
                                allowedExtensions=".pdf,.docx"
                                success={handleUploadSuccess.bind(null, 'assignment')}
                                disabled={!isEditMode || isSaving}
                            />
                        </div>
                    </div>

                    {isEditMode && (
                        <div className="flex justify-end mt-6">
                            <Button type="submit" variant="primary"
                                disabled={(!uploadData.video && !uploadData.assignment) || isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Documents'}
                            </Button>
                        </div>
                    )}
                </div>
            </form>

            {/* Submitted Assignments Grid */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-8" style={{ minHeight: 560 }}>
                <div className="mb-4">
                    <h4 className="text-lg font-medium text-gray-800">Submitted Assignments</h4>
                </div>
                <GridComponent
                    dataSource={assignmentList}
                    allowPaging={true}
                    pageSettings={pageSettings}
                    id="coachingGrid"
                    height={500}
                    cssClass="e-grid-custom"
                >
                    <ColumnsDirective>
                        <ColumnDirective 
                            field="fullName" 
                            headerText="Full Name" 
                            width="150" 
                            headerTextAlign="Left" 
                        />
                        <ColumnDirective 
                            field="assignmentTitle" 
                            headerText="Assignment" 
                            width="200" 
                            headerTextAlign="Left" 
                        />
                        <ColumnDirective 
                            field="isVerified" 
                            headerText="Verified" 
                            width="100" 
                            textAlign="Center" 
                            type="boolean"
                        />
                        <ColumnDirective 
                            field="dateSubmitted" 
                            headerText="Date Submitted" 
                            width="150" 
                            textAlign="Center"
                        />
                    </ColumnsDirective>
                </GridComponent>
            </div>
        </div>
    );
};

export default BusinessCoaching; 