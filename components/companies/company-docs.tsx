import React, { useMemo, useState, useCallback } from 'react';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { DatePickerComponent, ChangedEventArgs } from '@syncfusion/ej2-react-calendars';
import Button from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { getCompanyDocuments } from '@/api/documents';
import { environment } from '@/config/environment';
import CompanyDocumentsGrid from './company-documents-grid';
import { Spinner } from '@/components/ui/spinner';
import { FileCheck, FilePlus, FileStack } from 'lucide-react';
import {
    preventInvalidDateInputBeforeInput,
    preventInvalidDateInputKeyDown,
    preventInvalidDateInputPaste,
} from '@/components/ui/SyncfusionIsoDatePicker';

// Business types that should NOT show Shareholders Certificate
const EXCLUDED_BUSINESS_TYPES = [
    'NPO - Trust',
    'NPO - Voluntary Association',
    'NPC',
    'Cooperative'
];

interface CompanyDocsProps {
    isEditMode?: boolean;
}

const CompanyDocs: React.FC<CompanyDocsProps> = ({
    isEditMode = false
}) => {
    const { user, businessTypeName } = useAuthStore();
    const shouldShowShareholdersCertificate = useMemo(() => {
        if (!businessTypeName) return false;
        return !EXCLUDED_BUSINESS_TYPES.includes(businessTypeName);
    }, [businessTypeName]);
    const companyIdStr = useMemo(() => String(user?.companyID ?? ''), [user?.companyID]);
    const userIdStr = useMemo(() => String(user?.userID ?? ''), [user?.userID]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [apiError, setApiError] = useState<string>('');
    
    const [formDocs, setDocuments] = useState({
        cipcRegistration: [] as File[],
        ownersIds: [] as File[],
        taxClearance: [] as File[],
        taxClearanceExpiry: null as Date | null,
        beeCertificate: [] as File[],
        beeCertificateExpiry: null as Date | null,
        coidStatus: '',
        coidRegistration: [] as File[],
        sectorStatus: '',
        sectorLicenses: [] as File[],
        sectorLicensesExpiry: null as Date | null,
        bankLetter: [] as File[],
        memorandumOfIncorporation: [] as File[],
        shareholdersCertificate: [] as File[]
    });

    const [dragOver, setDragOver] = useState<string | null>(null);
    const [refreshGrid, setRefreshGrid] = useState(0);
    const [addDocumentModalOpen, setAddDocumentModalOpen] = useState(false);
    const [addDocumentTab, setAddDocumentTab] = useState<'required' | 'additional'>('required');

    const openAddDocumentModal = useCallback(() => {
        setAddDocumentTab('required');
        setAddDocumentModalOpen(true);
    }, []);
    const closeAddDocumentModal = useCallback(() => {
        setAddDocumentModalOpen(false);
    }, []);

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
                const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
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
            const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
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

    const handleStatusChange = (field: string, value: string) => {
        setDocuments(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Reset form function
    const resetForm = () => {
        setDocuments({
            cipcRegistration: [],
            ownersIds: [],
            taxClearance: [],
            taxClearanceExpiry: null,
            beeCertificate: [],
            beeCertificateExpiry: null,
            coidStatus: '',
            coidRegistration: [],
            sectorStatus: '',
            sectorLicenses: [],
            sectorLicensesExpiry: null,
            bankLetter: [],
            memorandumOfIncorporation: [],
            shareholdersCertificate: []
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Clear previous messages
        setErrorMessage('');
        setApiError('');
        setSaveMessage('');
        
        // Prevent multiple submissions
        if (isSaving) {
            console.log('Form submission already in progress, ignoring duplicate submission');
            setErrorMessage('Form submission already in progress. Please wait...');
            return;
        }
        
        console.log('Form submission started');
        console.log('User ID:', userIdStr);
        console.log('Company ID:', companyIdStr);
        console.log('Form docs:', formDocs);
        
        if (!userIdStr || !companyIdStr) {
            console.error('Missing user ID or company ID');
            setErrorMessage('Missing user ID or company ID. Please refresh the page and try again.');
            return;
        }
        
        // Check if any files are selected
        const hasFiles = formDocs.cipcRegistration.length > 0 || 
                        formDocs.ownersIds.length > 0 ||
                        formDocs.taxClearance.length > 0 ||
                        formDocs.beeCertificate.length > 0 ||
                        formDocs.coidRegistration.length > 0 ||
                        formDocs.sectorLicenses.length > 0 ||
                        formDocs.bankLetter.length > 0 ||
                        formDocs.memorandumOfIncorporation.length > 0 ||
                        formDocs.shareholdersCertificate.length > 0;
        
        if (!hasFiles) {
            console.log('No files selected for upload');
            return;
        }
        
        setIsSaving(true);
        
        try {
            // Create documents array for the new API
            const documents: Record<string, unknown>[] = [];
            
            // Process CIPC Registration files
            for (const file of formDocs.cipcRegistration) {
                const fileData = await fileToBase64(file);
                documents.push({
                CompanyID: companyIdStr,
                    CreatedBy: userIdStr,
                    Name_File: file.name,
                    DisplayName: `CIPC Registration - ${file.name}`,
                    Extension: file.name.split('.').pop()?.toLowerCase() || '',
                    ContentType: file.type,
                    FileData: fileData,
                    FileSize: file.size,
                    DocumentCategory: 'CIPC Registration',
                    DocumentScore: 100,
                    TaxClearanceExpiry: null,
                    BeeCertificateExpiry: null
                });
            }
            
            // Process Certified copies of owners IDs files
            for (const file of formDocs.ownersIds) {
                const fileData = await fileToBase64(file);
                documents.push({
                    CompanyID: companyIdStr,
                    CreatedBy: userIdStr,
                    Name_File: file.name,
                    DisplayName: `Certified Copy of Owners ID - ${file.name}`,
                    Extension: file.name.split('.').pop()?.toLowerCase() || '',
                    ContentType: file.type,
                    FileData: fileData,
                    FileSize: file.size,
                    DocumentCategory: "Certified copies of owners IDs",
                    DocumentScore: 100,
                    TaxClearanceExpiry: null,
                    BeeCertificateExpiry: null
                });
            }
            
            // Process Tax Clearance files
            for (const file of formDocs.taxClearance) {
                const fileData = await fileToBase64(file);
                documents.push({
                    CompanyID: companyIdStr,
                    CreatedBy: userIdStr,
                    Name_File: file.name,
                    DisplayName: `Tax Clearance - ${file.name}`,
                    Extension: file.name.split('.').pop()?.toLowerCase() || '',
                    ContentType: file.type,
                    FileData: fileData,
                    FileSize: file.size,
                    DocumentCategory: 'Tax Clearance',
                    DocumentScore: 100,
                    TaxClearanceExpiry: formDocs.taxClearanceExpiry ? formDocs.taxClearanceExpiry.toISOString() : null,
                    BeeCertificateExpiry: null
                });
            }
            
            // Process B-BBEE Certificate files
            for (const file of formDocs.beeCertificate) {
                const fileData = await fileToBase64(file);
                documents.push({
                    CompanyID: companyIdStr,
                    CreatedBy: userIdStr,
                    Name_File: file.name,
                    DisplayName: `B-BBEE Certificate - ${file.name}`,
                    Extension: file.name.split('.').pop()?.toLowerCase() || '',
                    ContentType: file.type,
                    FileData: fileData,
                    FileSize: file.size,
                    DocumentCategory: 'B-BBEE Certificate-Affidavit',
                    DocumentScore: 100,
                    TaxClearanceExpiry: null,
                    BeeCertificateExpiry: formDocs.beeCertificateExpiry ? formDocs.beeCertificateExpiry.toISOString() : null
                });
            }
            
            // Process COID Registration files (only if status is Yes)
            if (formDocs.coidStatus === 'Yes') {
                for (const file of formDocs.coidRegistration) {
                    const fileData = await fileToBase64(file);
                    documents.push({
                        CompanyID: companyIdStr,
                        CreatedBy: userIdStr,
                        Name_File: file.name,
                        DisplayName: `COID Registration - ${file.name}`,
                        Extension: file.name.split('.').pop()?.toLowerCase() || '',
                        ContentType: file.type,
                        FileData: fileData,
                        FileSize: file.size,
                        DocumentCategory: 'COID Registration',
                        DocumentScore: 100,
                        TaxClearanceExpiry: null,
                        BeeCertificateExpiry: null
                    });
                }
            }
            
            // Process Other Documents files (only if status is Yes)
            if (formDocs.sectorStatus === 'Yes') {
                for (const file of formDocs.sectorLicenses) {
                    const fileData = await fileToBase64(file);
                    documents.push({
                        CompanyID: companyIdStr,
                        CreatedBy: userIdStr,
                        Name_File: file.name,
                        DisplayName: `Other Document - ${file.name}`,
                        Extension: file.name.split('.').pop()?.toLowerCase() || '',
                        ContentType: file.type,
                        FileData: fileData,
                        FileSize: file.size,
                        DocumentCategory: 'Other Documents',
                        DocumentScore: 100,
                        TaxClearanceExpiry: null,
                        BeeCertificateExpiry: formDocs.sectorLicensesExpiry ? formDocs.sectorLicensesExpiry.toISOString() : null
                    });
                }
            }
            
            // Process Bank Letter files
            for (const file of formDocs.bankLetter) {
                const fileData = await fileToBase64(file);
                documents.push({
                    CompanyID: companyIdStr,
                    CreatedBy: userIdStr,
                    Name_File: file.name,
                    DisplayName: `Business Bank Account Confirmation Letter - ${file.name}`,
                    Extension: file.name.split('.').pop()?.toLowerCase() || '',
                    ContentType: file.type,
                    FileData: fileData,
                    FileSize: file.size,
                    DocumentCategory: 'Business Bank Account Confirmation Letter',
                    DocumentScore: 100,
                    TaxClearanceExpiry: null,
                    BeeCertificateExpiry: null
                });
            }
            
            // Process Memorandum of Incorporation files
            for (const file of formDocs.memorandumOfIncorporation) {
                const fileData = await fileToBase64(file);
                documents.push({
                    CompanyID: companyIdStr,
                    CreatedBy: userIdStr,
                    Name_File: file.name,
                    DisplayName: `Memorandum of Incorporation / Constitution - ${file.name}`,
                    Extension: file.name.split('.').pop()?.toLowerCase() || '',
                    ContentType: file.type,
                    FileData: fileData,
                    FileSize: file.size,
                    DocumentCategory: 'Memorandum of Incorporation / Constitution',
                    DocumentScore: 100,
                    TaxClearanceExpiry: null,
                    BeeCertificateExpiry: null
                });
            }
            
            // Process Shareholders Certificate files
            for (const file of formDocs.shareholdersCertificate) {
                const fileData = await fileToBase64(file);
                documents.push({
                    CompanyID: companyIdStr,
                    CreatedBy: userIdStr,
                    Name_File: file.name,
                    DisplayName: `Shareholders Certificate - ${file.name}`,
                    Extension: file.name.split('.').pop()?.toLowerCase() || '',
                    ContentType: file.type,
                    FileData: fileData,
                    FileSize: file.size,
                    DocumentCategory: 'Shareholders Certificate',
                    DocumentScore: 100,
                    TaxClearanceExpiry: null,
                    BeeCertificateExpiry: null
                });
            }
            
            // Create the payload for the new API
            const payload = {
                CompanyID: companyIdStr,
                CreatedBy: userIdStr,
                Documents: documents
            };
            
            console.log('Saving documents with new API structure:', payload);
            
            // Save using the new API endpoint
            const response = await fetch(`${environment.apiUrl}/api/CompanyDocuments2/SaveMultipleCompanyDocuments2`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('Documents saved successfully:', result);
            
            console.log('Documents saved successfully');
            setSaveMessage('Documents saved successfully!');
            
            // Reset form data
            resetForm();
            
            // Trigger grid refresh
            setRefreshGrid(prev => prev + 1);
            
            // Clear the message after 3 seconds
            setTimeout(() => setSaveMessage(''), 3000);
            
            // Reload existing documents
            await loadExistingDocuments();
            setAddDocumentModalOpen(false);

            // Optional: Refresh the page after a short delay to show the updated documents
            // Uncomment the line below if you want automatic page refresh
            // setTimeout(() => {
            //     window.location.reload();
            // }, 2000);
            
        } catch (error) {
            console.error('Error saving documents:', error);
            console.error('Error type:', typeof error);
            console.error('Error message:', error instanceof Error ? error.message : 'No message');
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
            console.error('Full error object:', JSON.stringify(error, null, 2));
            
            let errorMsg = 'An error occurred while saving documents. Please try again.';
            
            // Check if it's an axios error
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as Record<string, unknown>;
                console.error('Axios error response:', axiosError.response);
                
                if (axiosError.response && typeof axiosError.response === 'object' && 'status' in axiosError.response) {
                    const response = axiosError.response as Record<string, unknown>;
                    console.error('Axios error status:', response.status);
                    console.error('Axios error data:', response.data);
                    
                    // Provide more specific error messages based on status codes
                    if (typeof response.status === 'number') {
                        if (response.status === 400) {
                            errorMsg = 'Invalid data provided. Please check your file selections and try again.';
                        } else if (response.status === 401) {
                            errorMsg = 'Authentication failed. Please log in again.';
                        } else if (response.status === 403) {
                            errorMsg = 'You do not have permission to perform this action.';
                        } else if (response.status === 404) {
                            errorMsg = 'API endpoint not found. Please contact support.';
                        } else if (response.status >= 500) {
                            errorMsg = 'Server error. Please try again later or contact support.';
                        }
                    }
                    
                    if (response.data && typeof response.data === 'object' && 'message' in response.data) {
                        const data = response.data as Record<string, unknown>;
                        errorMsg = data.message as string;
                    }
                }
            } else if (error && typeof error === 'object' && 'message' in error) {
                const errorObj = error as Record<string, unknown>;
                if (typeof errorObj.message === 'string') {
                    if (errorObj.message.includes('Network Error') || errorObj.message.includes('timeout')) {
                        errorMsg = 'Network error. Please check your connection and try again.';
                    } else {
                        errorMsg = errorObj.message;
                    }
                }
            }
            
            setApiError(errorMsg);
        } finally {
            setIsSaving(false);
        }
    };
    
    const loadExistingDocuments = useCallback(async () => {
        if (!companyIdStr) return;
        
        setIsLoading(true);
        setApiError('');
        try {
            console.log('=== LOADING DOCUMENTS DEBUG ===');
            console.log('Company ID:', companyIdStr);
            console.log('API URL:', environment.apiUrl);
            console.log('Full URL:', `${environment.apiUrl}/api/CompanyDocuments/GetDocumentsByCompanyID/${companyIdStr}`);
            
            const response = await getCompanyDocuments(companyIdStr);
            console.log('Raw API Response:', response);
            console.log('Response type:', typeof response);
            console.log('Response is array:', Array.isArray(response));
            
            // Handle different response formats
            let documents = response;
            if (response && typeof response === 'object' && !Array.isArray(response)) {
                console.log('Response is object, checking for nested arrays...');
                console.log('Response keys:', Object.keys(response));
                
                // If response is wrapped in an object, try to extract the array
                if (response.data && Array.isArray(response.data)) {
                    console.log('Found documents in response.data');
                    documents = response.data;
                } else if (response.documents && Array.isArray(response.documents)) {
                    console.log('Found documents in response.documents');
                    documents = response.documents;
                } else if (response.result && Array.isArray(response.result)) {
                    console.log('Found documents in response.result');
                    documents = response.result;
                } else {
                    console.log('No array found in response object, using response as-is');
                }
            }
            
            console.log('Final processed documents:', documents);
            console.log('Documents type:', typeof documents);
            console.log('Documents length:', Array.isArray(documents) ? documents.length : 'Not an array');
            
            if (Array.isArray(documents) && documents.length > 0) {
                console.log('=== DOCUMENT DETAILS ===');
                documents.forEach((doc, index) => {
                    console.log(`Document ${index + 1}:`, doc);
                    console.log(`Document ${index + 1} keys:`, Object.keys(doc));
                    console.log(`Document ${index + 1} DocumentID:`, doc.DocumentID);
                    console.log(`Document ${index + 1} CreatedDate:`, doc.CreatedDate);
                    console.log(`Document ${index + 1} CIPCRegistrationCertificate:`, doc.CIPCRegistrationCertificate);
                    console.log(`Document ${index + 1} OwnersIDs:`, doc.OwnersIDs);
                    console.log(`Document ${index + 1} TaxClearanceCertificate:`, doc.TaxClearanceCertificate);
                    console.log(`Document ${index + 1} BBEECertificate:`, doc.BBEECertificate);
                    console.log(`Document ${index + 1} BankAccountConfirmation:`, doc.BankAccountConfirmation);
                });
            } else {
                console.log('No documents found or documents is not an array');
            }
            
            // setExistingDocuments(documents || []);
        } catch (error) {
            console.error('=== ERROR LOADING DOCUMENTS ===');
            console.error('Error:', error);
            console.error('Error type:', typeof error);
            console.error('Error message:', error instanceof Error ? error.message : 'No message');
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
            console.error('Full error object:', JSON.stringify(error, null, 2));
            
            let errorMsg = 'Failed to load existing documents. Please try again.';
            
            // Check if it's an axios error
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as Record<string, unknown>;
                
                if (axiosError.response && typeof axiosError.response === 'object') {
                    const response = axiosError.response as Record<string, unknown>;
                    console.error('Axios error details:', {
                        status: response.status,
                        statusText: response.statusText,
                        data: response.data,
                        headers: response.headers
                    });
                    
                    if (typeof response.status === 'number') {
                        if (response.status === 404) {
                            errorMsg = 'No documents found for this company.';
                        } else if (response.status >= 500) {
                            errorMsg = 'Server error while loading documents. Please try again later.';
                        }
                    }
                    
                    if (response.data && typeof response.data === 'object' && 'message' in response.data) {
                        const data = response.data as Record<string, unknown>;
                        if (typeof data.message === 'string') {
                            errorMsg = data.message;
                        }
                    }
                }
            }
            
            setApiError(errorMsg);
            // setExistingDocuments([]);
        } finally {
            setIsLoading(false);
        }
    }, [companyIdStr]);


    // Load existing documents on component mount
    React.useEffect(() => {
        if (companyIdStr) {
            loadExistingDocuments();
        }
    }, [companyIdStr, loadExistingDocuments]);

    return (
        <div
            className="max-w-7xl mx-auto p-6"
            onBeforeInputCapture={preventInvalidDateInputBeforeInput}
            onKeyDownCapture={preventInvalidDateInputKeyDown}
            onPasteCapture={preventInvalidDateInputPaste}
        >
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-teal-600">Company Documents</h1>
                <p className="text-gray-600 mt-2">
                    Upload and manage general company documents including certificates, licenses, and registration documents.
                </p>
            </div>
            
            {/* Success message */}
            {saveMessage && (
                <div className="mb-4 p-3 rounded border border-green-300 bg-green-50 text-green-800 text-sm">
                    {saveMessage}
                </div>
            )}
            
            {/* Error message */}
            {errorMessage && (
                <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">
                    {errorMessage}
                </div>
            )}
            
            {/* API Error message */}
            {apiError && (
                <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">
                    <div className="flex justify-between items-center">
                        <span>{apiError}</span>
                        <button
                            onClick={() => {
                                setApiError('');
                                loadExistingDocuments();
                            }}
                            className="ml-4 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}
            
            {/* Loading overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <Spinner size="large" />
                </div>
            )}

            {/* Documents Grid */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative mt-6">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                                <FileStack className="w-5 h-5" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Company Documents</h4>
                        </div>
                        {isEditMode && (
                            <Button
                                type="button"
                                variant="primary"
                                onClick={openAddDocumentModal}
                            >
                                Add New Document
                            </Button>
                        )}
                    </div>
                <CompanyDocumentsGrid 
                    companyId={companyIdStr} 
                    onRefresh={loadExistingDocuments}
                    refreshTrigger={refreshGrid}
                />
                </div>
            </div>

            {addDocumentModalOpen && (
                <div
                    className="fixed inset-0 bg-black/30 flex items-center justify-center lg:justify-start lg:pl-72 z-50"
                    onClick={(e) => e.target === e.currentTarget && closeAddDocumentModal()}
                >
                    <div className="bg-white rounded-xl p-6 w-full max-w-3xl lg:ml-6 max-h-[90vh] overflow-y-auto relative shadow-xl">
                        <button
                            type="button"
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                            onClick={closeAddDocumentModal}
                            aria-label="Close modal"
                        >
                            ✕
                        </button>
                        <div className="mb-4 flex items-center space-x-3">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                                <FileStack className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Add New Document</h3>
                        </div>
                        <div className="border-b border-gray-200 mb-4">
                            <nav className="-mb-px flex space-x-8">
                                <button
                                    type="button"
                                    onClick={() => setAddDocumentTab('required')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                        addDocumentTab === 'required'
                                            ? 'border-teal-500 text-teal-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <FileCheck className="w-4 h-4 inline mr-2" />
                                    Required Documents
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAddDocumentTab('additional')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                        addDocumentTab === 'additional'
                                            ? 'border-teal-500 text-teal-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <FilePlus className="w-4 h-4 inline mr-2" />
                                    Additional Documents
                                </button>
                            </nav>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {addDocumentTab === 'required' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            CIPC Registration Certificate
                                        </label>
                                        <div
                                            className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                                dragOver === 'cipcRegistration'
                                                    ? 'border-blue-400 bg-blue-50'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                            onDragOver={(e) => handleDragOver(e, 'cipcRegistration')}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'cipcRegistration')}
                                            onClick={() => {
                                                if (isEditMode) {
                                                    const input = document.getElementById('cipcRegistration-input') as HTMLInputElement;
                                                    input?.click();
                                                }
                                            }}
                                        >
                                            <input
                                                id="cipcRegistration-input"
                                                type="file"
                                                onChange={handleFileChange('cipcRegistration')}
                                                disabled={!isEditMode}
                                                multiple
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            />
                                            <div className="text-center">
                                                <div className="text-gray-500 text-sm">
                                                    {formDocs.cipcRegistration.length > 0 ? (
                                                        <span className="text-green-600 font-medium">
                                                            ✓ Selected {formDocs.cipcRegistration.length} file(s): {formDocs.cipcRegistration.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Certified copies of owners IDs
                                        </label>
                                        <div
                                            className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                                dragOver === 'ownersIds'
                                                    ? 'border-blue-400 bg-blue-50'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                            onDragOver={(e) => handleDragOver(e, 'ownersIds')}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'ownersIds')}
                                            onClick={() => {
                                                if (isEditMode) {
                                                    const input = document.getElementById('ownersIds-input') as HTMLInputElement;
                                                    input?.click();
                                                }
                                            }}
                                        >
                                            <input
                                                id="ownersIds-input"
                                                type="file"
                                                onChange={handleFileChange('ownersIds')}
                                                disabled={!isEditMode}
                                                multiple
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            />
                                            <div className="text-center">
                                                <div className="text-gray-500 text-sm">
                                                    {formDocs.ownersIds.length > 0 ? (
                                                        <span className="text-green-600 font-medium">
                                                            ✓ Selected {formDocs.ownersIds.length} file(s): {formDocs.ownersIds.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Business Bank Account Confirmation Letter
                                        </label>
                                        <div
                                            className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                                dragOver === 'bankLetter'
                                                    ? 'border-blue-400 bg-blue-50'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                            onDragOver={(e) => handleDragOver(e, 'bankLetter')}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'bankLetter')}
                                            onClick={() => {
                                                if (isEditMode) {
                                                    const input = document.getElementById('bankLetter-input') as HTMLInputElement;
                                                    input?.click();
                                                }
                                            }}
                                        >
                                            <input
                                                id="bankLetter-input"
                                                type="file"
                                                onChange={handleFileChange('bankLetter')}
                                                disabled={!isEditMode}
                                                multiple
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            />
                                            <div className="text-center">
                                                <div className="text-gray-500 text-sm">
                                                    {formDocs.bankLetter.length > 0 ? (
                                                        <span className="text-green-600 font-medium">
                                                            ✓ Selected {formDocs.bankLetter.length} file(s): {formDocs.bankLetter.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Memorandum of Incorporation / Constitution
                                        </label>
                                        <div
                                            className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                                dragOver === 'memorandumOfIncorporation'
                                                    ? 'border-blue-400 bg-blue-50'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                            onDragOver={(e) => handleDragOver(e, 'memorandumOfIncorporation')}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'memorandumOfIncorporation')}
                                            onClick={() => {
                                                if (isEditMode) {
                                                    const input = document.getElementById('memorandumOfIncorporation-input') as HTMLInputElement;
                                                    input?.click();
                                                }
                                            }}
                                        >
                                            <input
                                                id="memorandumOfIncorporation-input"
                                                type="file"
                                                onChange={handleFileChange('memorandumOfIncorporation')}
                                                disabled={!isEditMode}
                                                multiple
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            />
                                            <div className="text-center">
                                                <div className="text-gray-500 text-sm">
                                                    {formDocs.memorandumOfIncorporation.length > 0 ? (
                                                        <span className="text-green-600 font-medium">
                                                            ✓ Selected {formDocs.memorandumOfIncorporation.length} file(s): {formDocs.memorandumOfIncorporation.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tax Clearance Certificate
                                        </label>
                                        <div
                                            className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                                dragOver === 'taxClearance'
                                                    ? 'border-blue-400 bg-blue-50'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                            onDragOver={(e) => handleDragOver(e, 'taxClearance')}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'taxClearance')}
                                            onClick={() => {
                                                if (isEditMode) {
                                                    const input = document.getElementById('taxClearance-input') as HTMLInputElement;
                                                    input?.click();
                                                }
                                            }}
                                        >
                                            <input
                                                id="taxClearance-input"
                                                type="file"
                                                onChange={handleFileChange('taxClearance')}
                                                disabled={!isEditMode}
                                                multiple
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            />
                                            <div className="text-center">
                                                <div className="text-gray-500 text-sm">
                                                    {formDocs.taxClearance.length > 0 ? (
                                                        <span className="text-green-600 font-medium">
                                                            ✓ Selected {formDocs.taxClearance.length} file(s): {formDocs.taxClearance.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Expiry Date
                                            </label>
                                            <DatePickerComponent
                                                id="taxClearanceExpiry-input"
                                                placeholder="Select expiry date"
                                                value={formDocs.taxClearanceExpiry ?? undefined}
                                                change={(e: ChangedEventArgs) => {
                                                    setDocuments(prev => ({
                                                        ...prev,
                                                        taxClearanceExpiry: e.value as Date | null
                                                    }));
                                                }}
                                                enabled={isEditMode}
                                                cssClass="e-outline w-full"
                                                format="dd MMMM yyyy"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            B-BBEE Certificate or Affidavit
                                        </label>
                                        <div
                                            className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                                dragOver === 'beeCertificate'
                                                    ? 'border-blue-400 bg-blue-50'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                            onDragOver={(e) => handleDragOver(e, 'beeCertificate')}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'beeCertificate')}
                                            onClick={() => {
                                                if (isEditMode) {
                                                    const input = document.getElementById('beeCertificate-input') as HTMLInputElement;
                                                    input?.click();
                                                }
                                            }}
                                        >
                                            <input
                                                id="beeCertificate-input"
                                                type="file"
                                                onChange={handleFileChange('beeCertificate')}
                                                disabled={!isEditMode}
                                                multiple
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            />
                                            <div className="text-center">
                                                <div className="text-gray-500 text-sm">
                                                    {formDocs.beeCertificate.length > 0 ? (
                                                        <span className="text-green-600 font-medium">
                                                            ✓ Selected {formDocs.beeCertificate.length} file(s): {formDocs.beeCertificate.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Expiry Date
                                            </label>
                                            <DatePickerComponent
                                                id="beeCertificateExpiry-input"
                                                placeholder="Select expiry date"
                                                value={formDocs.beeCertificateExpiry ?? undefined}
                                                change={(e: ChangedEventArgs) => {
                                                    setDocuments(prev => ({
                                                        ...prev,
                                                        beeCertificateExpiry: e.value as Date | null
                                                    }));
                                                }}
                                                enabled={isEditMode}
                                                cssClass="e-outline w-full"
                                                format="dd MMMM yyyy"
                                            />
                                        </div>
                                    </div>

                                    {shouldShowShareholdersCertificate && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Shareholders Certificate
                                            </label>
                                            <div
                                                className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                                    dragOver === 'shareholdersCertificate'
                                                        ? 'border-blue-400 bg-blue-50'
                                                        : 'border-gray-300 hover:border-gray-400'
                                                } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                onDragOver={(e) => handleDragOver(e, 'shareholdersCertificate')}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, 'shareholdersCertificate')}
                                                onClick={() => {
                                                    if (isEditMode) {
                                                        const input = document.getElementById('shareholdersCertificate-input') as HTMLInputElement;
                                                        input?.click();
                                                    }
                                                }}
                                            >
                                                <input
                                                    id="shareholdersCertificate-input"
                                                    type="file"
                                                    onChange={handleFileChange('shareholdersCertificate')}
                                                    disabled={!isEditMode}
                                                    multiple
                                                    className="hidden"
                                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                />
                                                <div className="text-center">
                                                    <div className="text-gray-500 text-sm">
                                                        {formDocs.shareholdersCertificate.length > 0 ? (
                                                            <span className="text-green-600 font-medium">
                                                                ✓ Selected {formDocs.shareholdersCertificate.length} file(s): {formDocs.shareholdersCertificate.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                            </span>
                                                        ) : (
                                                            <span>
                                                                {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {addDocumentTab === 'additional' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            COID Registration
                                        </label>
                                        <DropDownListComponent
                                            dataSource={['Yes', 'No']}
                                            value={formDocs.coidStatus}
                                            placeholder="Select"
                                            change={(e) => handleStatusChange('coidStatus', e.value)}
                                            disabled={!isEditMode}
                                            cssClass="e-outline w-full mb-2"
                                        />
                                        {formDocs.coidStatus === 'Yes' && (
                                            <div
                                                className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                                    dragOver === 'coidRegistration'
                                                        ? 'border-blue-400 bg-blue-50'
                                                        : 'border-gray-300 hover:border-gray-400'
                                                } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                onDragOver={(e) => handleDragOver(e, 'coidRegistration')}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, 'coidRegistration')}
                                                onClick={() => {
                                                    if (isEditMode) {
                                                        const input = document.getElementById('coidRegistration-input') as HTMLInputElement;
                                                        input?.click();
                                                    }
                                                }}
                                            >
                                                <input
                                                    id="coidRegistration-input"
                                                    type="file"
                                                    onChange={handleFileChange('coidRegistration')}
                                                    disabled={!isEditMode}
                                                    multiple
                                                    className="hidden"
                                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                />
                                                <div className="text-center">
                                                    <div className="text-gray-500 text-sm">
                                                        {formDocs.coidRegistration.length > 0 ? (
                                                            <span className="text-green-600 font-medium">
                                                                ✓ Selected {formDocs.coidRegistration.length} file(s): {formDocs.coidRegistration.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                            </span>
                                                        ) : (
                                                            <span>
                                                                {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Other Documents
                                        </label>
                                        <DropDownListComponent
                                            dataSource={['Yes', 'No']}
                                            value={formDocs.sectorStatus}
                                            placeholder="Select"
                                            change={(e) => handleStatusChange('sectorStatus', e.value)}
                                            disabled={!isEditMode}
                                            cssClass="e-outline w-full mb-2"
                                        />
                                        {formDocs.sectorStatus === 'Yes' && (
                                            <>
                                                <div
                                                    className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                                        dragOver === 'sectorLicenses'
                                                            ? 'border-blue-400 bg-blue-50'
                                                            : 'border-gray-300 hover:border-gray-400'
                                                    } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                    onDragOver={(e) => handleDragOver(e, 'sectorLicenses')}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => handleDrop(e, 'sectorLicenses')}
                                                    onClick={() => {
                                                        if (isEditMode) {
                                                            const input = document.getElementById('sectorLicenses-input') as HTMLInputElement;
                                                            input?.click();
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        id="sectorLicenses-input"
                                                        type="file"
                                                        onChange={handleFileChange('sectorLicenses')}
                                                        disabled={!isEditMode}
                                                        multiple
                                                        className="hidden"
                                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                    />
                                                    <div className="text-center">
                                                        <div className="text-gray-500 text-sm">
                                                            {formDocs.sectorLicenses.length > 0 ? (
                                                                <span className="text-green-600 font-medium">
                                                                    ✓ Selected {formDocs.sectorLicenses.length} file(s): {formDocs.sectorLicenses.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
                                                                </span>
                                                            ) : (
                                                                <span>
                                                                    {isEditMode ? 'Click to browse or drag and drop files here' : 'No files selected'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-1">
                                                            PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-3">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Expiry Date (Optional)
                                                    </label>
                                                    <DatePickerComponent
                                                        id="sectorLicensesExpiry-input"
                                                        placeholder="Select expiry date (optional)"
                                                        value={formDocs.sectorLicensesExpiry ?? undefined}
                                                        change={(e: ChangedEventArgs) => {
                                                            setDocuments(prev => ({
                                                                ...prev,
                                                                sectorLicensesExpiry: e.value as Date | null
                                                            }));
                                                        }}
                                                        enabled={isEditMode}
                                                        cssClass="e-outline w-full"
                                                        format="dd MMMM yyyy"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                <Button type="button" variant="secondary" onClick={closeAddDocumentModal}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Company Documents'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyDocs;

