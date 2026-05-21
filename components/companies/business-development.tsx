import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TextBoxComponent, TextAreaComponent } from '@syncfusion/ej2-react-inputs';
import { NumericTextBoxComponent } from '@syncfusion/ej2-react-inputs';
import Button from '@/components/ui/button';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { useDropdownStoreHook } from '@/hooks/useDropdownStore';
import { useGetSubmittedQuestionnaireSummariesByCompanyId } from '@/hooks/useQuestionnaire';
import { useAuthStore } from '@/store/authStore';
import {
    saveCompleteBusinessDevelopment,
    getBusinessDevelopmentHeadersByCompanyID,
    getBusinessDevelopmentHeaderByID,
    saveCompanyBusinessDevelopmentHeader,
    updateCompanyBusinessDevelopmentHeader,
    updateCompleteBusinessDevelopment,
    BusinessDevelopmentHeaderResponse,
    BusinessDevelopmentHeaderPayload
} from '@/api/companies';
import BusinessDevelopmentDocumentsGrid from './business-development-documents-grid';
import BusinessDevelopmentHeadersGrid from './business-development-headers-grid';
import { TrendingUp, Target, DollarSign } from 'lucide-react';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';

// ESLint fixes applied - unused variables removed

export interface BusinessDevelopmentData {
    headerId: string | null;
    gapAnalysisScore: number;
    financialYear: string;
    status: string;
    businessPlan: File[];
    foundationalNeeds: string;
    fundingPurpose: string;
    fundingAmount: number;
    fundingMotivation: string;
    comparativeQuotes: File[];
}

interface BusinessDevelopmentProps {
    isEditMode?: boolean;
    onSaveSuccess?: () => void;
}

type BusinessDevelopmentModalMode = 'create' | 'view' | 'edit';

const BusinessDevelopment: React.FC<BusinessDevelopmentProps> = ({ onSaveSuccess }) => {
    const toastInstance = useRef<ToastComponent>(null);
    const createInitialFormData = (): BusinessDevelopmentData => ({
        headerId: null,
        gapAnalysisScore: 0,
        financialYear: '',
        status: 'Pending',
        businessPlan: [],
        foundationalNeeds: 'To be auto-generated...',
        fundingPurpose: '',
        fundingAmount: 0,
        fundingMotivation: '',
        comparativeQuotes: []
    });
    const [formData, setFormData] = useState<BusinessDevelopmentData>({
        ...createInitialFormData()
    });

    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState<string>('');
    const [refreshGrid, setRefreshGrid] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<BusinessDevelopmentModalMode>('create');
    const [isLoadingHeader, setIsLoadingHeader] = useState(false);
    const [dragOver, setDragOver] = useState<string | null>(null);
    const [businessDevelopmentHeaders, setBusinessDevelopmentHeaders] = useState<BusinessDevelopmentHeaderResponse[]>([]);

    const { options } = useDropdownStoreHook();
    const { user } = useAuthStore();
    
    // Fetch gap analysis data
    const { data: questionnaireSummaries } = useGetSubmittedQuestionnaireSummariesByCompanyId(
        user?.companyID || ''
    );

    // Get the latest completed gap analysis score
    const latestCompletedQuestionnaire = questionnaireSummaries
        ?.filter(q => q.status === 'Completed')
        ?.sort((a, b) => new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime())
        ?.[0];
    
    const latestGapAnalysisScore = latestCompletedQuestionnaire?.completionPercentage 
        ? Number(latestCompletedQuestionnaire.completionPercentage) 
        : 0;
    const latestCompletedCost = latestCompletedQuestionnaire?.totalCost || 0;
    const latestCompletedDate = latestCompletedQuestionnaire?.dateSubmitted;
    const statusOptions = [
        { Text: 'Pending', Value: 'Pending' },
        { Text: 'In Review', Value: 'In Review' },
        { Text: 'Submitted', Value: 'Submitted' }
    ];
    const totalFundingRequired = useMemo(
        () => businessDevelopmentHeaders.reduce((sum, header) => sum + Number(header.fundingAmountRequested || 0), 0),
        [businessDevelopmentHeaders]
    );

    const buildHeaderPayload = useCallback((data: BusinessDevelopmentData): BusinessDevelopmentHeaderPayload => ({
        companyID: user?.companyID || '',
        createdBy: user?.userID || '',
        financialYear: data.financialYear.trim(),
        status: data.status || 'Pending',
        fundingPurpose: data.fundingPurpose,
        motivationforFunding: data.fundingMotivation,
        fundingAmountRequested: data.fundingAmount,
        gapAnalysisScore: data.gapAnalysisScore,
    }), [user?.companyID, user?.userID]);

    const applyBaseFormState = useCallback((partial?: Partial<BusinessDevelopmentData>) => {
        setFormData({
            ...createInitialFormData(),
            gapAnalysisScore: latestGapAnalysisScore,
            foundationalNeeds: `R${Number(latestCompletedCost).toLocaleString()}`,
            ...partial,
            businessPlan: [],
            comparativeQuotes: []
        });
    }, [latestCompletedCost, latestGapAnalysisScore]);

    const populateFormFromHeader = useCallback((header: BusinessDevelopmentHeaderResponse) => {
        applyBaseFormState({
            headerId: header.businessDevelopmentCompanyHeaderID || header.companyBusinessDevelopmentHeader2ID || null,
            gapAnalysisScore: Number(header.gapAnalysisScore ?? latestGapAnalysisScore ?? 0),
            financialYear: header.financialYear || '',
            status: header.status || 'Pending',
            fundingPurpose: header.fundingPurpose || '',
            fundingAmount: Number(header.fundingAmountRequested || 0),
            fundingMotivation: header.motivationforFunding || '',
        });
    }, [applyBaseFormState, latestGapAnalysisScore]);

    // Keep Foundational Needs in sync with latest completed questionnaire total cost
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            foundationalNeeds: `R${Number(latestCompletedCost).toLocaleString()}`
        }));
    }, [latestCompletedCost]);

    // Load business development headers
    const loadBusinessDevelopmentHeaders = useCallback(async () => {
        if (!user?.companyID) return;
        
        try {
            const headers = await getBusinessDevelopmentHeadersByCompanyID(user.companyID);
            console.log('Loaded business development headers:', headers);
            const headerItems = Array.isArray(headers) ? headers : [];
            setBusinessDevelopmentHeaders(headerItems);
        } catch (error) {
            console.error('Error loading business development headers:', error);
            // Don't show error to user as this is just for populating existing data
            setBusinessDevelopmentHeaders([]);
        }
    }, [user?.companyID]);

    // Load business development headers when component mounts
    useEffect(() => {
        if (user?.companyID) {
            loadBusinessDevelopmentHeaders();
        }
    }, [user?.companyID, loadBusinessDevelopmentHeaders]);

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

    // Transform funding purpose options to match expected format
    const fundingPurposeOptions = options.fundingPurposes.map(item => ({ 
        Text: item.Name, 
        Value: item.Name 
    }));

    const handleInputChange = (field: keyof BusinessDevelopmentData, value: unknown) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const renderReadOnlyField = (label: string, value: string, className = '') => (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            <div className="min-h-[44px] rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900">
                {value || 'N/A'}
            </div>
        </div>
    );

    const formatCurrency = (value: number) =>
        `R${Number(value || 0).toLocaleString('en-ZA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

    const clearFileInputs = () => {
        const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
        fileInputs.forEach(input => {
            input.value = '';
        });
    };

    const handleSaveDocuments = () => {
        setModalMode('create');
        setApiError('');
        setErrorMessage('');
        applyBaseFormState({
            status: 'Pending',
        });
        clearFileInputs();
        setShowModal(true);
    };

    const loadHeaderIntoModal = async (headerId: string, mode: BusinessDevelopmentModalMode) => {
        if (!headerId) return;

        setIsLoadingHeader(true);
        setApiError('');
        setErrorMessage('');

        try {
            const response = await getBusinessDevelopmentHeaderByID(headerId);
            const header = (response && typeof response === 'object' && 'header' in response)
                ? (response as { header?: BusinessDevelopmentHeaderResponse }).header || response
                : response;

            populateFormFromHeader(header);
            clearFileInputs();
            setModalMode(mode);
            setShowModal(true);
        } catch (error) {
            console.error(`Error loading business development header for ${mode}:`, error);
            setApiError(`Failed to load application details for ${mode}. Please try again.`);
        } finally {
            setIsLoadingHeader(false);
        }
    };

    const handleViewApplication = async (headerId: string) => {
        await loadHeaderIntoModal(headerId, 'view');
    };

    const handleEditApplication = async (headerId: string) => {
        await loadHeaderIntoModal(headerId, 'edit');
    };

    // File upload handlers
    const handleFileChange = (field: 'businessPlan' | 'comparativeQuotes') => (event: React.ChangeEvent<HTMLInputElement>) => {
        if (modalMode === 'view') {
            return;
        }
        try {
            const files = event.target.files;
            if (files && files.length > 0) {
                const maxSize = 10 * 1024 * 1024; // 10MB
                const oversizedFiles = Array.from(files).filter(file => file.size > maxSize);
                
                if (oversizedFiles.length > 0) {
                    setErrorMessage(`File(s) too large. Maximum size is 10MB. Large files: ${oversizedFiles.map(f => f.name).join(', ')}`);
                    return;
                }
                
                const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
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
                setFormData(prev => ({
                    ...prev,
                    [field]: [...prev[field], ...fileArray]
                }));
            }
        } catch (error) {
            console.error('Error handling file change:', error);
            setErrorMessage('Error processing file. Please try again.');
        }
    };

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

    const handleDrop = (e: React.DragEvent, field: 'businessPlan' | 'comparativeQuotes') => {
        if (modalMode === 'view') {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const maxSize = 10 * 1024 * 1024; // 10MB
            const oversizedFiles = Array.from(files).filter(file => file.size > maxSize);
            
            if (oversizedFiles.length > 0) {
                setErrorMessage(`File(s) too large. Maximum size is 10MB. Large files: ${oversizedFiles.map(f => f.name).join(', ')}`);
                return;
            }
            
            const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
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
            setFormData(prev => ({
                ...prev,
                [field]: [...prev[field], ...fileArray]
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (modalMode === 'view') {
            return;
        }
        
        // Direct validation
        if (!user || !user.companyID || !user.userID) {
            setErrorMessage('User authentication data is missing. Please refresh the page and try again.');
            return;
        }

        if (!formData.financialYear.trim()) {
            setErrorMessage('Financial year is required.');
            return;
        }

        if (!Number.isFinite(formData.fundingAmount) || Number(formData.fundingAmount) <= 0) {
            setErrorMessage('Funding amount is required and must be greater than 0.');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');
        setApiError('');

        try {
            const documents: Record<string, unknown>[] = [];
            
            // Process Business Plan files
            for (const file of formData.businessPlan) {
                const fileData = await fileToBase64(file);
                const extension = file.name.split('.').pop()?.toLowerCase() || '';
                documents.push({
                    name_File: file.name,
                    displayName: 'Business Plan',
                    extension: extension ? `.${extension}` : '',
                    contentType: file.type,
                    fileData: fileData,
                    fileSize: file.size,
                    documentCategory: 'Business Plan'
                });
            }
            
            // Process Comparative Quotes files
            for (const file of formData.comparativeQuotes) {
                const fileData = await fileToBase64(file);
                const extension = file.name.split('.').pop()?.toLowerCase() || '';
                documents.push({
                    name_File: file.name,
                    displayName: 'Comparative Quote',
                    extension: extension ? `.${extension}` : '',
                    contentType: file.type,
                    fileData: fileData,
                    fileSize: file.size,
                    documentCategory: 'Comparative Quotes'
                });
            }

            const header = buildHeaderPayload(formData);

            console.log('Saving complete business development:', { header, documents });

            if (modalMode === 'edit' && formData.headerId) {
                const updateHeader = {
                    ...header,
                    lastModifiedUserID: user.userID
                };

                if (documents.length > 0) {
                    await updateCompleteBusinessDevelopment(formData.headerId, updateHeader, documents, user.userID);
                } else {
                    await updateCompanyBusinessDevelopmentHeader(formData.headerId, updateHeader);
                }
            } else if (documents.length > 0) {
                await saveCompleteBusinessDevelopment(header, documents, user.userID);
            } else {
                await saveCompanyBusinessDevelopmentHeader(header);
            }
            
            // Show success toast notification
            if (toastInstance.current) {
                toastInstance.current.show({
                    title: 'Success',
                    content: modalMode === 'edit'
                        ? 'Business development application updated successfully!'
                        : 'Business development application saved successfully!',
                    timeOut: 3000,
                    position: { X: 'Right', Y: 'Top' },
                    cssClass: 'e-toast-success'
                });
            }
            
            setErrorMessage('');
            setApiError('');
            
            // Reload headers to get updated data
            await loadBusinessDevelopmentHeaders();
            
            // Refresh the grids
            setRefreshGrid(prev => prev + 1);
            
            // Reset form after successful save
            resetForm();
            
            // Close modal after successful save
            setShowModal(false);
            
            // Call callback if provided
            if (onSaveSuccess) {
                onSaveSuccess();
            }
            
        } catch (error) {
            console.error('Error saving business development data:', error);
            
            let errorMessage = 'Failed to save business development data. Please try again.';
            
            // Check for specific error types
            if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_NETWORK') {
                errorMessage = 'Network error: Unable to connect to the business development API. The endpoint may not exist on the server.';
            } else if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as Record<string, unknown>;
                if (axiosError.response && typeof axiosError.response === 'object' && 'status' in axiosError.response) {
                    const status = axiosError.response.status as number;
                    if (status === 404) {
                        errorMessage = 'API endpoint not found. Please contact support to verify the business development API is available.';
                    } else if (status === 500) {
                        errorMessage = 'Server error occurred while saving business development data. Please try again later.';
                    }
                }
            }
            
            // Show error toast notification
            if (toastInstance.current) {
                toastInstance.current.show({
                    title: 'Error',
                    content: errorMessage,
                    timeOut: 5000,
                    position: { X: 'Right', Y: 'Top' },
                    cssClass: 'e-toast-error'
                });
            }
            
            setApiError(errorMessage);
            setErrorMessage('');
        } finally {
            setIsSaving(false);
        }
    };

    // Reset form function
    const resetForm = () => {
        applyBaseFormState();
        clearFileInputs();
    };

  const closeModal = () => {
    setShowModal(false);
    setModalMode('create');
    setErrorMessage('');
    setApiError('');
  };

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSaving(true);
//     setTimeout(() => {
//       setIsSaving(false);
//       setSaveMessage('Details saved successfully!');
//     }, 1000);
//   };

    return (
     <div className="max-w-7xl mx-auto p-6">
      <ToastComponent ref={toastInstance} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-teal-600">Business Development</h1>
        <p className="text-gray-600 mt-2">
          Manage your business development assignments and track your progress.
        </p>
      </div>

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

      {user?.companyID && (
        <div className="mt-6 space-y-6">
          {/* TOP STATS GRID: GROWTH NEEDS + FOUNDATIONAL NEEDS + GAP ANALYSIS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* GROWTH NEEDS CARD */}
            {totalFundingRequired > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                {/* Decorative gradient overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full -mr-16 -mt-16"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Growth Needs
                    </h3>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-lg p-5 border border-teal-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="w-4 h-4 text-teal-600" />
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Total Funding Required
                      </label>
                    </div>
                    <div className="text-3xl font-extrabold text-teal-700 tracking-tight">
                      R{Number(totalFundingRequired).toLocaleString('en-ZA', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FOUNDATIONAL NEEDS CARD */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg border border-purple-100 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-full bg-purple-500 text-white">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Foundational Needs
                  </h3>
                </div>
                {latestCompletedDate && (
                  <span className="text-xs px-2 py-1 rounded-full bg-white text-gray-700 border border-gray-200">
                    Completed {new Date(latestCompletedDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="mb-2">
                <div className="text-3xl font-bold text-gray-900 tracking-tight">
                  {formData.foundationalNeeds || 'R0'}
                </div>
              </div>

              <p className="text-xs text-gray-600">
                Latest total cost of formalisation derived from your most recent completed questionnaire.
              </p>
            </div>

            {/* GAP ANALYSIS CARD (moved to last position) */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
              {/* Decorative gradient overlay */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full -ml-16 -mt-16"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md">
                      <Target className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Gap Analysis Score
                    </h3>
                  </div>
                  <span className="text-sm px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border border-blue-200 font-semibold shadow-sm">
                    {typeof latestGapAnalysisScore === 'number' ? `${latestGapAnalysisScore.toFixed(2)}%` : '0.00%'}
                  </span>
                </div>
                
                <div className="relative mt-6">
                  {/* Progress bar container */}
                  <div className="relative w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    {/* Progress fill with gradient and shine effect */}
                    <div
                      className="relative h-full rounded-full transition-all duration-500 ease-out shadow-lg"
                      style={{ 
                        width: `${Math.max(0, Math.min(100, latestGapAnalysisScore))}%`,
                        background: 'linear-gradient(90deg, #10b981 0%, #059669 50%, #047857 100%)',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                      }}
                    >
                      {/* Shine effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse"></div>
                    </div>
                    
                    {/* Current value indicator dot */}
                    {latestGapAnalysisScore > 0 && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-2 border-emerald-500 shadow-lg transform transition-all duration-500 ease-out z-10"
                        style={{ 
                          left: `calc(${Math.max(0, Math.min(100, latestGapAnalysisScore))}% - 12px)`
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
                        className="absolute transform -translate-x-1/2 text-center"
                        style={{ 
                          left: `${Math.max(0, Math.min(100, latestGapAnalysisScore))}%`
                        }}
                      >
                        <div className="px-2 py-1 bg-emerald-500 text-white rounded-md font-bold text-xs shadow-md whitespace-nowrap">
                          {typeof latestGapAnalysisScore === 'number' ? latestGapAnalysisScore.toFixed(2) : '0.00'}%
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
          </div>

          <BusinessDevelopmentHeadersGrid
            companyId={user.companyID}
            refreshTrigger={refreshGrid}
            onCreateApplication={handleSaveDocuments}
            onViewApplication={handleViewApplication}
            onEditApplication={handleEditApplication}
          />

        </div>
      )}

      {/* FORM MODAL */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center lg:justify-start lg:pl-72 bg-black/30 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl lg:ml-6 max-h-[90vh] overflow-y-auto relative">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              onClick={closeModal}
            >
              ✕
            </button>

            <h3 className="text-lg font-medium text-gray-800 mb-4">
              {modalMode === 'view'
                ? 'View Business Development Application'
                : modalMode === 'edit'
                    ? 'Edit Business Development Application'
                    : 'Business Development Form'}
            </h3>

            {isLoadingHeader ? (
              <div className="py-10 text-center text-gray-600">Loading application details...</div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* GAP ANALYSIS */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gap Analysis Score
                    </label>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div
                          className="w-full bg-gray-200 rounded-full h-2 cursor-default"
                        >
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${formData.gapAnalysisScore}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0%</span>
                          <span>{formData.gapAnalysisScore}%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Foundational Needs */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Foundational Needs
                    </label>
                    {modalMode === 'view' ? (
                      <div className="min-h-[44px] rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900">
                        {formData.foundationalNeeds || 'N/A'}
                      </div>
                    ) : (
                      <TextBoxComponent
                        id="foundationalNeeds"
                        readonly={true}
                        value={formData.foundationalNeeds}
                        cssClass="e-outline w-full"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* GROWTH NEEDS */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h4 className="text-md font-medium text-gray-800 mb-4">
                  Growth Needs
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {modalMode === 'view' ? (
                    <>
                      {renderReadOnlyField('Financial Year', formData.financialYear)}
                      {renderReadOnlyField('Status', formData.status)}
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Financial Year *
                        </label>
                        <TextBoxComponent
                          id="financialYear"
                          placeholder="e.g. 2025/2026"
                          value={formData.financialYear}
                          change={(args) => handleInputChange('financialYear', args.value)}
                          cssClass="e-outline w-full"
                          readonly={false}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <DropDownListComponent
                          id="status"
                          dataSource={statusOptions}
                          fields={{ text: 'Text', value: 'Value' }}
                          value={formData.status}
                          change={(args) => handleInputChange('status', args.value)}
                          cssClass="e-outline w-full"
                          enabled={false}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {modalMode === 'view' ? (
                    <>
                      {renderReadOnlyField('Funding Purpose', formData.fundingPurpose)}
                      {renderReadOnlyField('Funding Amount (R)', formatCurrency(formData.fundingAmount))}
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Funding Purpose
                        </label>
                        <DropDownListComponent
                          id="fundingPurpose"
                          dataSource={fundingPurposeOptions}
                          fields={{ text: 'Text', value: 'Value' }}
                          placeholder="Select Purpose"
                          value={formData.fundingPurpose}
                          change={(args) =>
                            handleInputChange('fundingPurpose', args.value)
                          }
                          cssClass="e-outline w-full"
                          enabled={true}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Funding Amount (R) *
                        </label>
                        <NumericTextBoxComponent
                          id="fundingAmount"
                          format="n2"
                          min={0}
                          placeholder="0.00"
                          value={formData.fundingAmount}
                          change={(args) =>
                            handleInputChange('fundingAmount', args.value)
                          }
                          cssClass="e-outline w-full"
                          readonly={false}
                        />
                      </div>
                    </>
                  )}
                </div>

                {modalMode === 'view' ? (
                  renderReadOnlyField('Motivation for Funding', formData.fundingMotivation)
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motivation for Funding
                    </label>
                    <TextAreaComponent
                      id="fundingMotivation"
                      placeholder="Enter motivation"
                      value={formData.fundingMotivation}
                      change={(args) =>
                        handleInputChange('fundingMotivation', args.value)
                      }
                      cssClass="e-outline w-full"
                      width="100%"
                      rows={5}
                      readonly={false}
                    />
                  </div>
                )}

                {modalMode !== 'view' && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Plan
                  </label>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                      dragOver === 'businessPlan'
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    } cursor-pointer`}
                    onDragOver={(e) => handleDragOver(e, 'businessPlan')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'businessPlan')}
                    onClick={() => {
                      const input = document.getElementById('businessPlan-input') as HTMLInputElement;
                      input?.click();
                    }}
                  >
                    <input
                      id="businessPlan-input"
                      type="file"
                      onChange={handleFileChange('businessPlan')}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      multiple
                      disabled={false}
                    />
                    <div className="text-center text-gray-500 text-sm">
                      {formData.businessPlan.length > 0 ? (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-700">Selected files:</div>
                          {formData.businessPlan.map((file, index) => (
                            <div key={index} className="text-xs text-gray-600">
                              {file.name} ({(file.size / 1024).toFixed(2)} KB)
                            </div>
                          ))}
                          <div className="text-xs text-blue-600 mt-2">Click to add more files</div>
                        </div>
                      ) : (
                        'Click or drag to upload'
                      )}
                    </div>
                  </div>
                </div>
                )}
              </div>

              {modalMode !== 'create' && user?.companyID && (
                <BusinessDevelopmentDocumentsGrid
                  companyId={user.companyID}
                  refreshTrigger={refreshGrid}
                  allowDelete={modalMode === 'edit'}
                  compact={true}
                />
              )}

              <div className="flex justify-end mt-4">
                {modalMode === 'view' ? (
                  <Button type="button" variant="secondary" onClick={closeModal}>
                    Close
                  </Button>
                ) : (
                  <Button type="submit" variant="primary"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : modalMode === 'edit' ? 'Update Details' : 'Save Details'}
                  </Button>
                )}
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDevelopment; 