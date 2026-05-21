import React, { useEffect, useCallback, useMemo } from 'react';
import { TextBoxComponent, ChangeEventArgs } from '@syncfusion/ej2-react-inputs';
import { DropDownListComponent, DdtChangeEventArgs } from '@syncfusion/ej2-react-dropdowns';
import Button from '@/components/ui/button';
import { GridComponent, ColumnsDirective, ColumnDirective, PageSettingsModel, RowSelectEventArgs, Inject, Page } from '@syncfusion/ej2-react-grids';
import { Owner } from '@/types/companies';
import { Eye, User, Users } from 'lucide-react';

interface OwnershipInfoProps {
    genderOptions: { text: string; value: string }[];
    raceOptions: { text: string; value: string }[];
    yesNoOptions: { text: string; value: string }[];
    educationLevels: { text: string; value: string }[];
    onSave?: (owner: Owner) => void;
    isEditMode?: boolean;
    owners: Owner[];
    selectedOwner: Owner | null;
    onRowSelect: (owner: Owner) => void;
    modalOpen: boolean;
    onCloseModal: () => void;
    onOpenForNew: () => void;
}

const OwnershipInfo: React.FC<OwnershipInfoProps> = ({
    genderOptions,
    raceOptions,
    yesNoOptions,
    educationLevels,
    onSave,
    isEditMode = false,
    owners,
    selectedOwner,
    onRowSelect,
    modalOpen,
    onCloseModal,
    onOpenForNew
}) => {
    const initialFormState = useMemo(() => ({
        ownershipID: '',
        companyID: '',
        firstName: '',
        lastName: '',
        fullName: '',
        idNumber: '',
        contactNumber: '',
        emailAddress: '',
        gender: '',
        race: '',
        disabilityStatus: '',
        youthOwned: '',
        educationLevel: '',
        createdbyUserID: '',
        lastModifiedUserID: '',
        isActive: true
    }), []);

    const [formData, setFormData] = React.useState<Owner>(initialFormState);

    const resetForm = useCallback(() => {
        setFormData(initialFormState);
    }, [initialFormState]);

    useEffect(() => {
        if (selectedOwner) {
            setFormData(selectedOwner);
        } else {
            resetForm();
        }
    }, [selectedOwner, resetForm]);

    const handleInputChange = useCallback((field: keyof Owner, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const handleSave = useCallback(() => {
        if (onSave) {
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();
            onSave({
                ...formData,
                fullName
            });
        }
    }, [formData, onSave]);

    const handleRowSelect = useCallback((args: RowSelectEventArgs) => {
        const selectedData = args.data as Owner;
        onRowSelect(selectedData);
    }, [onRowSelect]);

    const pageSettings: PageSettingsModel = useMemo(() => ({ pageSize: 5 }), []);

    const actionTemplate = useCallback((props: Owner) => (
        <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onRowSelect(props)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
        >
            <Eye className="w-4 h-4" />
        </button>
    ), [onRowSelect]);

    const renderFormFields = useMemo(() => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <TextBoxComponent
                        value={formData.firstName}
                        placeholder="Enter First Name"
                        floatLabelType="Never"
                        onChange={(e: ChangeEventArgs) => handleInputChange('firstName', String(e.value || ''))}
                        disabled={!isEditMode}
                        cssClass="e-outline w-full"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <TextBoxComponent
                        value={formData.lastName}
                        placeholder="Enter Last Name"
                        floatLabelType="Never"
                        onChange={(e: ChangeEventArgs) => handleInputChange('lastName', String(e.value || ''))}
                        disabled={!isEditMode}
                        cssClass="e-outline w-full"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                    <TextBoxComponent
                        value={formData.idNumber}
                        placeholder="Enter ID Number"
                        floatLabelType="Never"
                        onChange={(e: ChangeEventArgs) => handleInputChange('idNumber', String(e.value || ''))}
                        disabled={!isEditMode}
                        cssClass="e-outline w-full"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                    <TextBoxComponent
                        value={formData.contactNumber}
                        placeholder="Enter Contact Number"
                        floatLabelType="Never"
                        onChange={(e: ChangeEventArgs) => handleInputChange('contactNumber', String(e.value || ''))}
                        disabled={!isEditMode}
                        cssClass="e-outline w-full"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <TextBoxComponent
                        value={formData.emailAddress}
                        placeholder="Enter Email Address"
                        floatLabelType="Never"
                        onChange={(e: ChangeEventArgs) => handleInputChange('emailAddress', String(e.value || ''))}
                        disabled={!isEditMode}
                        cssClass="e-outline w-full"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <DropDownListComponent
                        dataSource={genderOptions}
                        fields={{ text: 'text', value: 'value' }}
                        value={formData.gender}
                        placeholder="Select Gender"
                        floatLabelType="Never"
                        onChange={(e: DdtChangeEventArgs) => handleInputChange('gender', String(e.value || ''))}
                        disabled={!isEditMode}
                        cssClass="e-outline w-full"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Race</label>
                    <DropDownListComponent
                        dataSource={raceOptions}
                        fields={{ text: 'text', value: 'value' }}
                        value={formData.race}
                        placeholder="Select Race"
                        floatLabelType="Never"
                        onChange={(e: DdtChangeEventArgs) => handleInputChange('race', String(e.value || ''))}
                        disabled={!isEditMode}
                        cssClass="e-outline w-full"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Disability Status</label>
                    <DropDownListComponent
                        dataSource={yesNoOptions}
                        fields={{ text: 'text', value: 'value' }}
                        value={formData.disabilityStatus}
                        placeholder="Select Option"
                        floatLabelType="Never"
                        onChange={(e: DdtChangeEventArgs) => handleInputChange('disabilityStatus', String(e.value || ''))}
                        disabled={!isEditMode}
                        cssClass="e-outline w-full"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Youth-Owned Business</label>
                    <DropDownListComponent
                        dataSource={yesNoOptions}
                        fields={{ text: 'text', value: 'value' }}
                        value={formData.youthOwned}
                        placeholder="Select Option"
                        floatLabelType="Never"
                        onChange={(e: DdtChangeEventArgs) => handleInputChange('youthOwned', String(e.value || ''))}
                        disabled={!isEditMode}
                        cssClass="e-outline w-full"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Highest Level of Education</label>
                    <DropDownListComponent
                        dataSource={educationLevels}
                        fields={{ text: 'text', value: 'value' }}
                        value={formData.educationLevel}
                        placeholder="Select Education Level"
                        floatLabelType="Never"
                        onChange={(e: DdtChangeEventArgs) => handleInputChange('educationLevel', String(e.value || ''))}
                        disabled={!isEditMode}
                        cssClass="e-outline w-full"
                    />
                </div>
            </div>
        </>
    ), [formData, handleInputChange, isEditMode, genderOptions, raceOptions, yesNoOptions, educationLevels]);

    const gridMinHeight = 560;
    const renderGrid = useMemo(() => (
        <GridComponent
            dataSource={owners}
            allowPaging={true}
            pageSettings={pageSettings}
            rowSelected={handleRowSelect}
            id="ownership-grid"
            height={500}
            cssClass="e-grid-custom"
        >
            <Inject services={[Page]} />
            <ColumnsDirective>
                {/* Actions column with eye icon as first column */}
                <ColumnDirective headerText="Actions" width="100" textAlign="Center" template={actionTemplate} />
                <ColumnDirective field="firstName" headerText="First Name" width="150" headerTextAlign="Left" />
                <ColumnDirective field="lastName" headerText="Last Name" width="150" headerTextAlign="Left" />
                <ColumnDirective field="idNumber" headerText="ID Number" width="150" headerTextAlign="Left" />
                <ColumnDirective field="contactNumber" headerText="Contact Number" width="150" headerTextAlign="Left" />
                <ColumnDirective field="emailAddress" headerText="Email" width="180" headerTextAlign="Left" />
                <ColumnDirective field="gender" headerText="Gender" width="100" headerTextAlign="Left" />
                <ColumnDirective field="race" headerText="Race" width="100" headerTextAlign="Left" />
                <ColumnDirective field="disabilityStatus" headerText="Disability" width="100" headerTextAlign="Left" />
                <ColumnDirective field="youthOwned" headerText="Youth-Owned" width="100" headerTextAlign="Left" />
                <ColumnDirective field="educationLevel" headerText="Education" width="150" headerTextAlign="Left" />
            </ColumnsDirective>
        </GridComponent>
    ), [owners, pageSettings, handleRowSelect, actionTemplate]);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onCloseModal();
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-teal-600">Ownership Information</h1>
                <p className="text-gray-600 mt-2">
                    Manage ownership details including owner information, equity distribution, and ownership structure.
                </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                                <Users className="w-5 h-5" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Owners List</h4>
                        </div>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={onOpenForNew}
                        >
                            Add owner
                        </Button>
                    </div>
                    <div style={{ minHeight: gridMinHeight }}>{renderGrid}</div>
                </div>
            </div>

            {modalOpen && (
                <div
                    className="fixed inset-0 bg-black/30 flex items-center justify-center lg:justify-start lg:pl-72 z-50"
                    onClick={handleBackdropClick}
                >
                    <div className="bg-white rounded-xl p-6 w-full max-w-3xl lg:ml-6 max-h-[90vh] overflow-y-auto relative shadow-xl">
                        <button
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                            onClick={onCloseModal}
                            aria-label="Close modal"
                        >
                            ✕
                        </button>

                        <div className="mb-4 flex items-center space-x-3">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                                <User className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">
                                {selectedOwner ? 'Edit Owner' : 'Add Owner'}
                            </h3>
                        </div>

                        {renderFormFields}

                        {isEditMode && (
                            <div className="mt-4 flex justify-end space-x-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={onCloseModal}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleSave}
                                >
                                    {selectedOwner ? 'Update Owner Details' : 'Save Owner Details'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(OwnershipInfo);
