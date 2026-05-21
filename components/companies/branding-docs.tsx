import React, { useMemo, useState, useCallback } from 'react';
import Button from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { environment } from '@/config/environment';
import BrandingDocumentsGrid from './branding-documents-grid';
import { Image as ImageIcon, FileStack } from 'lucide-react';

interface BrandingDocsProps {
    isEditMode?: boolean;
}

const BrandingDocs: React.FC<BrandingDocsProps> = ({
    isEditMode = false
}) => {
    const { user } = useAuthStore();
    const companyIdStr = useMemo(() => String(user?.companyID ?? ''), [user?.companyID]);
    const userIdStr = useMemo(() => String(user?.userID ?? ''), [user?.userID]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [apiError, setApiError] = useState<string>('');
    
    const [formDocs, setDocuments] = useState({
        brandGuidebook: [] as File[],
        logo: [] as File[],
        businessCard: [] as File[],
        letterhead: [] as File[],
        emailSignature: [] as File[],
        brochure: [] as File[]
    });

    const [dragOver, setDragOver] = useState<string | null>(null);
    const [refreshGrid, setRefreshGrid] = useState(0);
    const [addBrandingModalOpen, setAddBrandingModalOpen] = useState(false);

    const openAddBrandingModal = useCallback(() => setAddBrandingModalOpen(true), []);
    const closeAddBrandingModal = useCallback(() => setAddBrandingModalOpen(false), []);

    // Helper function to convert File to base64
    const fileToBase64 = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove the data URL prefix to get just the base64 string
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Native file input handlers
    const handleFileChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const files = event.target.files;
            if (files && files.length > 0) {
                console.log(`File selected for ${field}:`, files[0].name, 'Size:', files[0].size, 'Type:', files[0].type);
                
                // Validate file size (max 10MB)
                const maxSize = 10 * 1024 * 1024; // 10MB
                const oversizedFiles = Array.from(files).filter(file => file.size > maxSize);
                
                if (oversizedFiles.length > 0) {
                    setErrorMessage(`File(s) too large. Maximum size is 10MB. Large files: ${oversizedFiles.map(f => f.name).join(', ')}`);
                    return;
                }
                
                // Validate file types
                const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.svg'];
                const invalidFiles = Array.from(files).filter(file => {
                    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
                    return !allowedTypes.includes(extension);
                });
                
                if (invalidFiles.length > 0) {
                    setErrorMessage(`Invalid file type(s). Allowed types: ${allowedTypes.join(', ')}. Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`);
                    return;
                }
                
                // Clear any previous error messages
                setErrorMessage('');
                
                // Handle multiple files for all fields
                const fileArray = Array.from(files);
        setDocuments(prev => ({
            ...prev,
                    [field]: fileArray
                }));
            }
        } catch (error) {
            console.error('Error handling file change:', error);
            setErrorMessage('Error processing file selection. Please try again.');
        }
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent, field: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(field);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);
    };

    const handleDrop = (e: React.DragEvent, field: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);

        if (!isEditMode) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            const oversizedFiles = files.filter(file => file.size > maxSize);
            
            if (oversizedFiles.length > 0) {
                setErrorMessage(`File(s) too large. Maximum size is 10MB. Large files: ${oversizedFiles.map(f => f.name).join(', ')}`);
                return;
            }
            
            // Validate file types
            const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.svg'];
            const invalidFiles = files.filter(file => {
                const extension = '.' + file.name.split('.').pop()?.toLowerCase();
                return !allowedTypes.includes(extension);
            });
            
            if (invalidFiles.length > 0) {
                setErrorMessage(`Invalid file type(s). Allowed types: ${allowedTypes.join(', ')}. Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`);
                return;
            }
            
            // Clear any previous error messages
            setErrorMessage('');
            
            setDocuments(prev => ({
                ...prev,
                [field]: files
            }));
        }
    };

    const resetForm = () => {
        setDocuments({
            brandGuidebook: [],
            logo: [],
            businessCard: [],
            letterhead: [],
            emailSignature: [],
            brochure: []
        });
        
        // Clear file inputs
        const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
        fileInputs.forEach(input => {
            input.value = '';
        });
        
        // Clear any error messages
        setErrorMessage('');
        setApiError('');
    };

    const loadExistingDocuments = async () => {
        // This will be handled by the BrandingDocumentsGrid component
        console.log('Loading existing branding documents...');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!companyIdStr || !userIdStr) {
            setErrorMessage('Company ID or User ID not found. Please refresh the page and try again.');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');
        setApiError('');
        setSaveMessage('');

        try {
            const documents: Record<string, unknown>[] = [];

            // Process Brand Guidebook files -> Brand Guidelines
            for (const file of formDocs.brandGuidebook) {
                const fileData = await fileToBase64(file);
                documents.push({
                    CompanyID: companyIdStr,
                    CreatedBy: userIdStr,
                    name_File: file.name,
                    displayName: `Company Brand Guidelines`,
                    extension: file.name.split('.').pop()?.toLowerCase() || '',
                    contentType: file.type,
                    fileData: fileData,
                    fileSize: file.size,
                    documentCategory: 'Brand Guidelines',
                    documentScore: 100
                });
            }

            // Process Logo files
            for (const file of formDocs.logo) {
                const fileData = await fileToBase64(file);
                documents.push({
                    CompanyID: companyIdStr,
                    CreatedBy: userIdStr,
                    name_File: file.name,
                    displayName: `Company Logo`,
                    extension: file.name.split('.').pop()?.toLowerCase() || '',
                    contentType: file.type,
                    fileData: fileData,
                    fileSize: file.size,
                    documentCategory: 'Logo',
                    documentScore: 100
                });
            }

            // Process Business Card files
            for (const file of formDocs.businessCard) {
                const fileData = await fileToBase64(file);
                documents.push({
                    CompanyID: companyIdStr,
                    CreatedBy: userIdStr,
                    name_File: file.name,
                    displayName: `Business Card Design`,
                    extension: file.name.split('.').pop()?.toLowerCase() || '',
                    contentType: file.type,
                    fileData: fileData,
                    fileSize: file.size,
                    documentCategory: 'Business Card',
                    documentScore: 100
                });
            }

            // Process Letterhead files
            for (const file of formDocs.letterhead) {
                const fileData = await fileToBase64(file);
                documents.push({
                    CompanyID: companyIdStr,
                    CreatedBy: userIdStr,
                    name_File: file.name,
                    displayName: `Company Letterhead`,
                    extension: file.name.split('.').pop()?.toLowerCase() || '',
                    contentType: file.type,
                    fileData: fileData,
                    fileSize: file.size,
                    documentCategory: 'Letterhead',
                    documentScore: 100
                });
            }

            // Process Email Signature files -> Marketing Materials
            for (const file of formDocs.emailSignature) {
                const fileData = await fileToBase64(file);
                documents.push({
                    CompanyID: companyIdStr,
                    CreatedBy: userIdStr,
                    name_File: file.name,
                    displayName: `Marketing Brochure`,
                    extension: file.name.split('.').pop()?.toLowerCase() || '',
                    contentType: file.type,
                    fileData: fileData,
                    fileSize: file.size,
                    documentCategory: 'Marketing Materials',
                    documentScore: 100
                });
            }

            // Process Brochure files -> Additional Marketing Materials
            for (const file of formDocs.brochure) {
                const fileData = await fileToBase64(file);
                documents.push({
                    CompanyID: companyIdStr,
                    CreatedBy: userIdStr,
                    name_File: file.name,
                    displayName: `Additional Marketing Flyer`,
                    extension: file.name.split('.').pop()?.toLowerCase() || '',
                    contentType: file.type,
                    fileData: fileData,
                    fileSize: file.size,
                    documentCategory: 'Additional Marketing Materials',
                    documentScore: 100
                });
            }

            if (documents.length === 0) {
                setErrorMessage('Please select at least one file to upload.');
                return;
            }

            console.log('Saving branding documents:', documents);
            
            const response = await fetch(`${environment.apiUrl}/api/CompanyBrandingDocuments2/SaveMultipleCompanyBrandingDocuments2`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    companyID: companyIdStr,
                    createdBy: userIdStr,
                    documents: documents
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error Response:', errorData);
                throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
            }
            
            const result = await response.json();
            console.log('Branding documents saved successfully:', result);
            
            console.log('Branding documents saved successfully');
            setSaveMessage('Branding documents saved successfully!');
            
            // Reset form data
            resetForm();
            
            // Trigger grid refresh
            setRefreshGrid(prev => prev + 1);
            
            // Clear the message after 3 seconds
            setTimeout(() => setSaveMessage(''), 3000);
            
            // Reload existing documents
            await loadExistingDocuments();
            setAddBrandingModalOpen(false);

        } catch (error) {
            console.error('Error saving branding documents:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to save branding documents. Please try again.';
            setApiError(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-teal-600">Branding Documents</h1>
                <p className="text-gray-600 mt-2">
                    Upload and manage your company branding documents including logos, marketing materials, and brand guidelines.
                </p>
            </div>
            
            {/* Success Message */}
            {saveMessage && (
                <div className="mb-4 p-3 rounded border border-green-300 bg-green-50 text-green-800 text-sm">
                    {saveMessage}
                </div>
            )}

            {/* Error Messages */}
            {errorMessage && (
                <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">
                    {errorMessage}
                </div>
            )}

            {apiError && (
                <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">
                    {apiError}
                </div>
            )}


            {/* Branding Documents Grid */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative mt-6">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                                <FileStack className="w-5 h-5" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Branding Documents</h4>
                        </div>
                        {isEditMode && (
                            <Button
                                type="button"
                                variant="primary"
                                onClick={openAddBrandingModal}
                            >
                                Add New Document
                            </Button>
                        )}
                    </div>
                <BrandingDocumentsGrid 
                    companyId={companyIdStr} 
                    onRefresh={loadExistingDocuments}
                    refreshTrigger={refreshGrid}
                />
                </div>
            </div>

            {addBrandingModalOpen && (
                <div
                    className="fixed inset-0 bg-black/30 flex items-center justify-center lg:justify-start lg:pl-72 z-50"
                    onClick={(e) => e.target === e.currentTarget && closeAddBrandingModal()}
                >
                    <div className="bg-white rounded-xl p-6 w-full max-w-3xl lg:ml-6 max-h-[90vh] overflow-y-auto relative shadow-xl">
                        <button
                            type="button"
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                            onClick={closeAddBrandingModal}
                            aria-label="Close modal"
                        >
                            ✕
                        </button>
                        <div className="mb-4 flex items-center space-x-3">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                                <ImageIcon className="w-5 h-5" aria-hidden />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Add New Document</h3>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Brand Guidelines
                                    </label>
                                    <div
                                        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                            dragOver === 'brandGuidebook'
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-300 hover:border-gray-400'
                                        } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        onDragOver={(e) => handleDragOver(e, 'brandGuidebook')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'brandGuidebook')}
                                        onClick={() => {
                                            if (isEditMode) {
                                                const input = document.getElementById('brandGuidebook-input') as HTMLInputElement;
                                                input?.click();
                                            }
                                        }}
                                    >
                                        <input
                                            id="brandGuidebook-input"
                                            type="file"
                                            onChange={handleFileChange('brandGuidebook')}
                                        disabled={!isEditMode}
                                            multiple
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.svg"
                                        />
                                        <div className="text-center">
                                            <div className="text-gray-500 text-sm">
                                                {formDocs.brandGuidebook.length > 0 ? (
                                                    <span className="text-green-600 font-medium">
                                                        ✓ Selected {formDocs.brandGuidebook.length} file(s): {formDocs.brandGuidebook.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                    </span>
                                                ) : (
                                                    <span>
                                                        {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                PDF, DOC, DOCX, JPG, PNG, SVG (Max 10MB each)
                                            </div>
                                        </div>
                                    </div>
                                </div>
        
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Logo
                                    </label>
                                    <div
                                        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                            dragOver === 'logo'
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-300 hover:border-gray-400'
                                        } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        onDragOver={(e) => handleDragOver(e, 'logo')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'logo')}
                                        onClick={() => {
                                            if (isEditMode) {
                                                const input = document.getElementById('logo-input') as HTMLInputElement;
                                                input?.click();
                                            }
                                        }}
                                    >
                                        <input
                                            id="logo-input"
                                            type="file"
                                            onChange={handleFileChange('logo')}
                                        disabled={!isEditMode}
                                            multiple
                                            className="hidden"
                                            accept=".jpg,.jpeg,.png,.svg"
                                        />
                                        <div className="text-center">
                                            <div className="text-gray-500 text-sm">
                                                {formDocs.logo.length > 0 ? (
                                                    <span className="text-green-600 font-medium">
                                                        ✓ Selected {formDocs.logo.length} file(s): {formDocs.logo.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                    </span>
                                                ) : (
                                                    <span>
                                                        {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                JPG, PNG, SVG (Max 10MB each)
                                            </div>
                                        </div>
                                    </div>
                                </div>
        
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Business Card
                                    </label>
                                    <div
                                        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                            dragOver === 'businessCard'
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-300 hover:border-gray-400'
                                        } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        onDragOver={(e) => handleDragOver(e, 'businessCard')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'businessCard')}
                                        onClick={() => {
                                            if (isEditMode) {
                                                const input = document.getElementById('businessCard-input') as HTMLInputElement;
                                                input?.click();
                                            }
                                        }}
                                    >
                                        <input
                                            id="businessCard-input"
                                            type="file"
                                            onChange={handleFileChange('businessCard')}
                                        disabled={!isEditMode}
                                            multiple
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.svg"
                                        />
                                        <div className="text-center">
                                            <div className="text-gray-500 text-sm">
                                                {formDocs.businessCard.length > 0 ? (
                                                    <span className="text-green-600 font-medium">
                                                        ✓ Selected {formDocs.businessCard.length} file(s): {formDocs.businessCard.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                    </span>
                                                ) : (
                                                    <span>
                                                        {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                PDF, DOC, DOCX, JPG, PNG, SVG (Max 10MB each)
                                            </div>
                                        </div>
                                    </div>
                                </div>
        
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Letterhead
                                    </label>
                                    <div
                                        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                            dragOver === 'letterhead'
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-300 hover:border-gray-400'
                                        } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        onDragOver={(e) => handleDragOver(e, 'letterhead')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'letterhead')}
                                        onClick={() => {
                                            if (isEditMode) {
                                                const input = document.getElementById('letterhead-input') as HTMLInputElement;
                                                input?.click();
                                            }
                                        }}
                                    >
                                        <input
                                            id="letterhead-input"
                                            type="file"
                                            onChange={handleFileChange('letterhead')}
                                        disabled={!isEditMode}
                                            multiple
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.svg"
                                        />
                                        <div className="text-center">
                                            <div className="text-gray-500 text-sm">
                                                {formDocs.letterhead.length > 0 ? (
                                                    <span className="text-green-600 font-medium">
                                                        ✓ Selected {formDocs.letterhead.length} file(s): {formDocs.letterhead.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                    </span>
                                                ) : (
                                                    <span>
                                                        {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                PDF, DOC, DOCX, JPG, PNG, SVG (Max 10MB each)
                                            </div>
                                        </div>
                                    </div>
                                </div>
        
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Marketing Materials
                                    </label>
                                    <div
                                        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                            dragOver === 'emailSignature'
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-300 hover:border-gray-400'
                                        } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        onDragOver={(e) => handleDragOver(e, 'emailSignature')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'emailSignature')}
                                        onClick={() => {
                                            if (isEditMode) {
                                                const input = document.getElementById('emailSignature-input') as HTMLInputElement;
                                                input?.click();
                                            }
                                        }}
                                    >
                                        <input
                                            id="emailSignature-input"
                                            type="file"
                                            onChange={handleFileChange('emailSignature')}
                                        disabled={!isEditMode}
                                            multiple
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.svg"
                                        />
                                        <div className="text-center">
                                            <div className="text-gray-500 text-sm">
                                                {formDocs.emailSignature.length > 0 ? (
                                                    <span className="text-green-600 font-medium">
                                                        ✓ Selected {formDocs.emailSignature.length} file(s): {formDocs.emailSignature.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                    </span>
                                                ) : (
                                                    <span>
                                                        {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                PDF, DOC, DOCX, JPG, PNG, SVG (Max 10MB each)
                                            </div>
                                        </div>
                                    </div>
                                </div>
        
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Additional Marketing Materials
                                    </label>
                                    <div
                                        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                            dragOver === 'brochure'
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-300 hover:border-gray-400'
                                        } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        onDragOver={(e) => handleDragOver(e, 'brochure')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'brochure')}
                                        onClick={() => {
                                            if (isEditMode) {
                                                const input = document.getElementById('brochure-input') as HTMLInputElement;
                                                input?.click();
                                            }
                                        }}
                                    >
                                        <input
                                            id="brochure-input"
                                            type="file"
                                            onChange={handleFileChange('brochure')}
                                        disabled={!isEditMode}
                                            multiple
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.svg"
                                        />
                                        <div className="text-center">
                                            <div className="text-gray-500 text-sm">
                                                {formDocs.brochure.length > 0 ? (
                                                    <span className="text-green-600 font-medium">
                                                        ✓ Selected {formDocs.brochure.length} file(s): {formDocs.brochure.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                    </span>
                                                ) : (
                                                    <span>
                                                        {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                PDF, DOC, DOCX, JPG, PNG, SVG (Max 10MB each)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                <Button type="button" variant="secondary" onClick={closeAddBrandingModal}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Branding Documents'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrandingDocs;
