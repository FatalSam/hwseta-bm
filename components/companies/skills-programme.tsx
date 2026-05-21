import React, { useState } from 'react';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { UploaderComponent } from '@syncfusion/ej2-react-inputs';
// Removed unused PageSettingsModel import
import { useDropdownStoreHook } from '@/hooks/useDropdownStore';

interface SkillsProgrammeProps {
    onSave?: (data: Record<string, unknown>) => void;
    isEditMode?: boolean;
}

const SkillsProgramme: React.FC<SkillsProgrammeProps> = ({
    onSave,
    isEditMode = false
}) => {
    const [selectedModule, setSelectedModule] = useState<number | null>(null);
    const [uploadData, setUploadData] = useState<{ video: unknown; assignment: unknown }>({ video: null, assignment: null });
    // Mock data for the grid
    // const [moduleUploads] = useState([]);
    // const pageSettings = { pageSize: 5 };

    const { options } = useDropdownStoreHook();

    // Transform module options to match expected format
    const moduleOptions = options.modules.map(item => ({
        id: item.Id,
        name: item.Name
    }));

    const handleModuleChange = (args: Record<string, unknown>) => {
        setSelectedModule(args.value as number);
        setUploadData({ video: null, assignment: null });
    };

    const handleUploadSuccess = (field: 'video' | 'assignment', args: Record<string, unknown>) => {
        setUploadData(prev => ({ ...prev, [field]: args.file }));
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Module
                    </label>
                    <DropDownListComponent
                        dataSource={moduleOptions}
                        fields={{ text: 'name', value: 'id' }}
                        placeholder="Select Module"
                        change={handleModuleChange}
                        disabled={!isEditMode}
                        cssClass="e-outline w-full"
                    />
                </div>

                {selectedModule && (
                    <>
                        <div className="flex flex-col md:flex-row gap-6 mt-6">
                            <div className="flex-1 p-4 rounded-lg border border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Video Upload</label>
                                <UploaderComponent
                                    autoUpload={false}
                                    multiple={true}
                                    success={handleUploadSuccess.bind(null, 'video')}
                                    disabled={!isEditMode}
                                />
                            </div>
                            <div className="flex-1 p-4 rounded-lg border border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Upload</label>
                                <UploaderComponent
                                    autoUpload={false}
                                    multiple={true}
                                    success={handleUploadSuccess.bind(null, 'assignment')}
                                    disabled={!isEditMode}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button
                                type="button"
                                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                onClick={() => onSave && onSave(uploadData)}
                                disabled={!uploadData.video && !uploadData.assignment || !isEditMode}
                            >
                                Save
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Removed Uploaded Modules Grid in favor of Existing Skills Programme Documents list on the page */}
        </div>
    );
};

export default SkillsProgramme;
