import React from 'react';
import { TextBoxComponent, ChangeEventArgs } from '@syncfusion/ej2-react-inputs';
import { DropDownListComponent, DdtChangeEventArgs } from '@syncfusion/ej2-react-dropdowns';
import { DatePickerComponent, ChangedEventArgs } from '@syncfusion/ej2-react-calendars';
import Button from '@/components/ui/button';
import { Company, BusinessType, Industry, Province } from '@/types/companies';
import { Building2, FileText, MapPin, Phone, Share2, AlignLeft } from 'lucide-react';
import { calculateCompanyProfileCompletion } from '@/lib/utils';
import {
    preventInvalidDateInputBeforeInput,
    preventInvalidDateInputKeyDown,
    preventInvalidDateInputPaste,
} from '@/components/ui/SyncfusionIsoDatePicker';

interface CompaniesProfileProps {
    company?: Company;
    businessTypes: BusinessType[];
    industries: Industry[];
    provinces: Province[];
    onSave: (companyData: Partial<Company>) => void;
    isEditMode?: boolean;
}

const CompaniesProfile: React.FC<CompaniesProfileProps> = ({
    company,
    businessTypes,
    industries,
    provinces,
    onSave,
    isEditMode = false
}) => {
    const [formData, setFormData] = React.useState<Partial<Company>>(company || {});
    const [selectedIndustryDescription, setSelectedIndustryDescription] = React.useState<string>('');
    const [animatedCompletion, setAnimatedCompletion] = React.useState(0);
    
    // Update form data when company prop changes
    React.useEffect(() => {
        if (company) {
            setFormData(company);
        }
    }, [company]);

    // Keep industry description in sync with current selection (view + edit)
    React.useEffect(() => {
        if (!industries || industries.length === 0) {
            setSelectedIndustryDescription('');
            return;
        }

        const currentId =
            formData.industryId !== undefined && formData.industryId !== null
                ? Number(formData.industryId)
                : undefined;

        if (currentId === undefined || Number.isNaN(currentId)) {
            setSelectedIndustryDescription('');
            return;
        }

        const industry = industries.find((ind: Industry) => Number(ind.Id) === currentId);
        setSelectedIndustryDescription(industry?.Description || '');
    }, [formData.industryId, industries]);
    
    // Use totalCompletionScore from database only; fallback to calculated score from saved company data when not available
    const completionScore = company?.totalCompletionScore ?? calculateCompanyProfileCompletion(company);

    // Animate the progress bar from 0 to the actual value
    React.useEffect(() => {
        const clamped = Math.max(0, Math.min(100, completionScore || 0));
        // Start from 0 on first render, then transition to the clamped value
        setAnimatedCompletion(0);
        const id = requestAnimationFrame(() => {
            setAnimatedCompletion(clamped);
        });
        return () => cancelAnimationFrame(id);
    }, [completionScore]);

    const handleInputChange = (field: keyof Company, value: unknown) => {
        const updatedFormData = {
            ...formData,
            [field]: value
        };
        setFormData(updatedFormData);
        
        // Recalculate completion score in real-time (commented out for now)
        // const newCompletionScore = calculateCompanyProfileCompletion(updatedFormData);
        // You could add a callback here to update the parent component if needed
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-teal-600">Company Information</h1>
                <p className="text-gray-600 mt-2">
                    View and manage your company profile information and completion status.
                </p>
            </div>
            
            {/* Profile Completion Progress Bar - styled like Gap Analysis Score */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative mb-6">
                {/* Decorative gradient overlay */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16"></div>

                <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">
                                Profile Completion
                            </h3>
                        </div>
                        <span className="text-sm px-3 py-1.5 rounded-full bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border border-teal-200 font-semibold shadow-sm">
                            {completionScore}%
                        </span>
                    </div>

                    <div className="relative mt-6">
                        {/* Progress bar container */}
                        <div className="relative w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            {/* Progress fill with gradient and shine effect */}
                            <div
                                className="relative h-full rounded-full transition-all duration-[2500ms] ease-out shadow-lg"
                                style={{
                                    width: `${animatedCompletion}%`,
                                    background: 'linear-gradient(90deg, #10b981 0%, #059669 50%, #047857 100%)',
                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                                }}
                            >
                                {/* Shine effect overlay */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse"></div>
                            </div>

                            {/* Current value indicator dot */}
                            {animatedCompletion > 0 && (
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-2 border-emerald-500 shadow-lg transform transition-all duration-[2500ms] ease-out z-10"
                                    style={{
                                        left: `calc(${animatedCompletion}% - 12px)`
                                    }}
                                >
                                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                                </div>
                            )}
                        </div>

                        {/* Labels positioned correctly */}
                        <div className="relative mt-3">
                            <div className="flex justify-between items-center text-xs font-medium">
                                <span className="text-gray-500">0%</span>
                                {/* Current value label positioned at the exact progress point */}
                                <div
                                    className="absolute transform -translate-x-1/2 text-center transition-all duration-[2500ms] ease-out"
                                    style={{
                                        left: `${animatedCompletion}%`
                                    }}
                                >
                                    <div className="px-2 py-1 bg-emerald-500 text-white rounded-md font-bold text-xs shadow-md whitespace-nowrap">
                                        {Math.round(animatedCompletion)}%
                                    </div>
                                    {/* Arrow pointing down */}
                                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-emerald-500 mx-auto mt-0.5"></div>
                                </div>
                                <span className="text-gray-500">100%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information Section */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                                <FileText className="w-5 h-5" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Basic Information</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                            <TextBoxComponent
                                value={formData.businessName || ''}
                                placeholder="Enter Business Name"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => handleInputChange('businessName', e.value || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number (CIPC)</label>
                            <TextBoxComponent
                                value={formData.registrationNumber || ''}
                                placeholder="Enter Registration Number"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => handleInputChange('registrationNumber', e.value || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>

                        <div
                            onBeforeInputCapture={preventInvalidDateInputBeforeInput}
                            onKeyDownCapture={preventInvalidDateInputKeyDown}
                            onPasteCapture={preventInvalidDateInputPaste}
                        >
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date Established</label>
                            <DatePickerComponent
                                value={formData.dateEstablished ? new Date(formData.dateEstablished) : undefined}
                                placeholder="Select Date"
                                floatLabelType="Never"
                                onChange={(e: ChangedEventArgs) => handleInputChange('dateEstablished', e.value?.toISOString() || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                            <DropDownListComponent
                                dataSource={businessTypes as unknown as { [key: string]: object }[]}
                                fields={{ text: 'Name', value: 'Id' }}
                                value={formData.businessTypeId}
                                placeholder="Select Business Type"
                                floatLabelType="Never"
                                onChange={(e: DdtChangeEventArgs) => {
                                    const value = typeof e.value === 'number' ? e.value : 0;
                                    handleInputChange('businessTypeId', value);
                                }}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Industry/Sector</label>
                            <DropDownListComponent
                                dataSource={industries as unknown as { [key: string]: object }[]}
                                fields={{ text: 'Name', value: 'Id' }}
                                value={formData.industryId}
                                placeholder="Select Industry"
                                floatLabelType="Never"
                                onChange={(e: DdtChangeEventArgs) => {
                                    const rawValue = e.value;
                                    const value =
                                        typeof rawValue === 'number'
                                            ? rawValue
                                            : rawValue != null
                                            ? Number(rawValue)
                                            : 0;

                                    handleInputChange('industryId', value);

                                    // Prefer description from the selected item data
                                    let description = '';
                                    const maybeItemData = (e as unknown as { itemData?: { Description?: unknown } }).itemData;
                                    if (maybeItemData && typeof maybeItemData === 'object') {
                                        if (typeof maybeItemData.Description === 'string') {
                                            description = maybeItemData.Description;
                                        }
                                    }

                                    // Fallback: look up in industries array by Id
                                    if (!description && industries && industries.length > 0) {
                                        const selectedIndustry = industries.find(
                                            (ind: Industry) => Number(ind.Id) === Number(value)
                                        );
                                        description = selectedIndustry?.Description || '';
                                    }

                                    setSelectedIndustryDescription(description);
                                }}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        {selectedIndustryDescription && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                                <div className="px-3 py-2 bg-emerald-700 border border-emerald-800 rounded-md text-sm text-white min-h-[38px] flex items-center shadow-sm">
                                    <span className="mr-2 text-emerald-100 text-base" aria-hidden="true">★</span>
                                    <span>{selectedIndustryDescription}</span>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>
                </div>

                {/* Address Section */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Address Information</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                            <TextBoxComponent
                                value={formData.address1 || ''}
                                placeholder="Enter Address"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => handleInputChange('address1', e.value || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                            <TextBoxComponent
                                value={formData.address2 || ''}
                                placeholder="Enter Address"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => handleInputChange('address2', e.value || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 3</label>
                            <TextBoxComponent
                                value={formData.address3 || ''}
                                placeholder="Enter Address"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => handleInputChange('address3', e.value || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                            <TextBoxComponent
                                value={formData.addressCode || ''}
                                placeholder="Enter Code"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => handleInputChange('addressCode', e.value || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                            <DropDownListComponent
                                dataSource={provinces as unknown as { [key: string]: object }[]}
                                fields={{ text: 'Name', value: 'Id' }}
                                value={formData.provinceId}
                                placeholder="Select Province"
                                floatLabelType="Never"
                                onChange={(e: DdtChangeEventArgs) => {
                                    const value = typeof e.value === 'number' ? e.value : 0;
                                    handleInputChange('provinceId', value);
                                }}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        </div>
                    </div>
                </div>

                {/* Contact Information Section */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                                <Phone className="w-5 h-5" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Contact Information</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Contact Number</label>
                            <TextBoxComponent
                                value={formData.contactNumber || ''}
                                placeholder="Enter Contact Number"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => handleInputChange('contactNumber', e.value || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
                            <TextBoxComponent
                                value={formData.email || ''}
                                type="email"
                                placeholder="Enter Email Address"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => handleInputChange('email', e.value || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                            <TextBoxComponent
                                value={formData.website || ''}
                                placeholder="Enter Website URL"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => handleInputChange('website', e.value || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Staff Members</label>
                            <TextBoxComponent
                                value={formData.staffCount?.toString() || ''}
                                type="number"
                                placeholder="Enter Number of Staff"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => {
                                    const value = e.value ? Number(e.value) : 0;
                                    handleInputChange('staffCount', value);
                                }}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        </div>
                    </div>
                </div>

                {/* Social Media Section */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                                <Share2 className="w-5 h-5" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Social Media</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Facebook Link</label>
                            <TextBoxComponent
                                value={formData.facebookLink || ''}
                                placeholder="Enter Facebook Link"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => handleInputChange('facebookLink', e.value || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Twitter Link</label>
                            <TextBoxComponent
                                value={formData.twitterLink || ''}
                                placeholder="Enter Twitter Link"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => handleInputChange('twitterLink', e.value || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram Link</label>
                            <TextBoxComponent
                                value={formData.instagramLink || ''}
                                placeholder="Enter Instagram Link"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => handleInputChange('instagramLink', e.value || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Link</label>
                            <TextBoxComponent
                                value={formData.linkedInLink || ''}
                                placeholder="Enter LinkedIn Link"
                                floatLabelType="Never"
                                onChange={(e: ChangeEventArgs) => handleInputChange('linkedInLink', e.value || '')}
                                disabled={!isEditMode}
                                cssClass="e-outline w-full"
                            />
                        </div>
                        </div>
                    </div>
                </div>

                {/* Description Section */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                                <AlignLeft className="w-5 h-5" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Business Description</h4>
                        </div>
                        <div>
                        <TextBoxComponent
                            value={formData.description || ''}
                            multiline={true}
                            placeholder="Describe your business"
                            floatLabelType="Never"
                            cssClass="e-outline w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onChange={(e: ChangeEventArgs) => handleInputChange('description', e.value || '')}
                            disabled={!isEditMode}
                        />
                        </div>
                    </div>
                </div>

                {isEditMode && (
                    <div className="flex justify-end">
                        <Button type="submit" variant="primary">
                            Save Company Details
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default CompaniesProfile;
