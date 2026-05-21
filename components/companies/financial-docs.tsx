import React, { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/button';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { NumericTextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { useDropdownStoreHook } from '@/hooks/useDropdownStore';
import { useAuthStore } from '@/store/authStore';
import {
    saveCompleteFinancialInformation,
    getFinancialInformationHeadersByCompanyID,
    getFinancialInformationHeaderByID,
    saveCompanyFinancialInformationHeader,
    updateCompanyFinancialInformationHeader,
    updateCompleteFinancialInformation,
    saveMonthlyFinancialInformation,
    updateMonthlyFinancialInformation
} from '@/api/companies';
import FinancialDocumentsGrid from './financial-documents-grid';
import FinancialInformationHeadersGrid from './financial-information-headers-grid';
import MonthlyExpensesGrid from './monthly-expenses-grid';
import FinancialInformationCard from './financial-information-card';
import { BarChart3, FileStack } from 'lucide-react';

interface FinancialDocsProps {
    isEditMode?: boolean;
}

const FinancialDocs: React.FC<FinancialDocsProps> = ({
    isEditMode = false
}) => {
    const { user } = useAuthStore();
    const companyIdStr = user?.companyID ? String(user.companyID) : '';
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [apiError, setApiError] = useState<string>('');
    
    const [formDocs, setDocuments] = useState({
        financialYear: '',
        profitabilityStatus: '',
        income: '',
        incomeCurrency: 'ZAR',
        costOfSales: '',
        costOfSalesCurrency: 'ZAR',
        operationalExpenses: '',
        operationalExpensesCurrency: 'ZAR',
        averageMonthlyIncome: '',
        averageMonthlyIncomeCurrency: 'ZAR',
        averageMonthlyExpenditure: '',
        averageMonthlyExpenditureCurrency: 'ZAR',
        financialStatements: [] as File[],
        financialStatementsExpiry: null as Date | null,
        bankStatement: [] as File[],
        bankStatementExpiry: null as Date | null
    });


    const [dragOver, setDragOver] = useState<string | null>(null);
    const [refreshGrid, setRefreshGrid] = useState(0);

    // Monthly expenses modal state
    const [showMonthlyModal, setShowMonthlyModal] = useState(false);
    const [isSavingMonthly, setIsSavingMonthly] = useState(false);
    const [monthlySaveMessage, setMonthlySaveMessage] = useState<string>('');
    const [monthlyError, setMonthlyError] = useState<string>('');
    const [monthlyForm, setMonthlyForm] = useState({
        month: 'January',
        year: new Date().getFullYear(),
        income: undefined as number | undefined,
        costOfSales: undefined as number | undefined,
        operationalExpenses: undefined as number | undefined
    });
    const [monthlyRefresh, setMonthlyRefresh] = useState(0);
    const [monthlyEditingId, setMonthlyEditingId] = useState<number | null>(null);

    const [addFinancialDocModalOpen, setAddFinancialDocModalOpen] = useState(false);
    const [financialModalMode, setFinancialModalMode] = useState<'create' | 'view' | 'edit'>('create');
    const [selectedFinancialHeaderId, setSelectedFinancialHeaderId] = useState<string | null>(null);
    const [isLoadingFinancialHeader, setIsLoadingFinancialHeader] = useState(false);

    const [financialGridTab, setFinancialGridTab] = useState<'monthly' | 'documents'>('monthly');

    const { options } = useDropdownStoreHook();

    // Profitability options with description support
    const profitabilityOptions = options.profitabilities;
    const profitabilityNames = profitabilityOptions.map(item => item.Name);
    const [selectedProfitabilityDescription, setSelectedProfitabilityDescription] = useState<string>('');

    // Currency options with major world currencies and BWP
    const currencyOptions = [
        { code: 'ZAR', name: 'ZAR (R)', symbol: 'R' },
        { code: 'USD', name: 'USD ($)', symbol: '$' },
        { code: 'EUR', name: 'EUR (€)', symbol: '€' },
        { code: 'GBP', name: 'GBP (£)', symbol: '£' },
        { code: 'JPY', name: 'JPY (¥)', symbol: '¥' },
        { code: 'AUD', name: 'AUD (A$)', symbol: 'A$' },
        { code: 'CAD', name: 'CAD (C$)', symbol: 'C$' },
        { code: 'CHF', name: 'CHF', symbol: 'CHF' },
        { code: 'CNY', name: 'CNY (¥)', symbol: '¥' },
        { code: 'INR', name: 'INR (₹)', symbol: '₹' },
        { code: 'BWP', name: 'BWP (P)', symbol: 'P' },
        { code: 'NGN', name: 'NGN (₦)', symbol: '₦' },
        { code: 'KES', name: 'KES (KSh)', symbol: 'KSh' },
        { code: 'EGP', name: 'EGP (E£)', symbol: 'E£' },
        { code: 'GHS', name: 'GHS (₵)', symbol: '₵' }
    ];

    // Debug user object on component mount
    useEffect(() => {
        console.log('FinancialDocs component mounted');
        console.log('User object on mount:', user);
        console.log('Company ID on mount:', user?.companyID);
    }, [user]);

    // Load financial headers
    const loadFinancialHeaders = useCallback(async () => {
        if (!companyIdStr) return;
        
        try {
            console.log('Loading financial headers for company:', companyIdStr);
            const response = await getFinancialInformationHeadersByCompanyID(companyIdStr);
            console.log('Financial headers response:', response);
            
            if (response && response.length > 0) {
                // Get the most recent header (assuming they're sorted by date)
                const latestHeader = response[0];
                
                // Format currency values for display
                const formatCurrency = (value: number) => {
                    return value ? value.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }) : '';
                };
                
                // Use currency from header, or default to ZAR
                const currency = latestHeader.currency || latestHeader.incomeCurrency || latestHeader.averageMonthlyIncomeCurrency || 'ZAR';
                
                setDocuments(prev => ({
                    ...prev,
                    financialYear: latestHeader.financialYear || '',
                    income: formatCurrency(latestHeader.income || 0),
                    incomeCurrency: currency,
                    costOfSales: formatCurrency(latestHeader.costOfSales || 0),
                    costOfSalesCurrency: currency,
                    operationalExpenses: formatCurrency(latestHeader.operationalExpenses || 0),
                    operationalExpensesCurrency: currency,
                    averageMonthlyIncome: formatCurrency(latestHeader.averageMonthlyIncome),
                    averageMonthlyIncomeCurrency: currency,
                    averageMonthlyExpenditure: formatCurrency(latestHeader.averageMonthlyExpenditure),
                    averageMonthlyExpenditureCurrency: currency,
                    profitabilityStatus: latestHeader.profitabilityStatus || ''
                }));

                const selected = profitabilityOptions.find(item => item.Name === (latestHeader.profitabilityStatus || ''));
                setSelectedProfitabilityDescription(selected?.Description || '');
                
                // Store the existing header for update operations
                // setExistingHeader(latestHeader);
                // setIsUpdateMode(true);
                
                console.log('Financial header loaded:', latestHeader);
        } else {
                // setIsUpdateMode(false);
                // setExistingHeader(null);
            }
        } catch (error) {
            console.error('Error loading financial headers:', error);
            // setIsUpdateMode(false);
            // setExistingHeader(null);
        }
    }, [companyIdStr, profitabilityOptions]);

    // Load financial headers when component mounts
    useEffect(() => {
        loadFinancialHeaders();
    }, [companyIdStr, loadFinancialHeaders]);

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

    // Native file input handlers
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
            const maxSize = 10 * 1024 * 1024; // 10MB
            const oversizedFiles = files.filter(file => file.size > maxSize);
            
            if (oversizedFiles.length > 0) {
                setErrorMessage(`File(s) too large. Maximum size is 10MB. Large files: ${oversizedFiles.map(f => f.name).join(', ')}`);
                return;
            }
            
            const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
            const invalidFiles = files.filter(file => {
                const extension = '.' + file.name.split('.').pop()?.toLowerCase();
                return !allowedTypes.includes(extension);
            });
            
            if (invalidFiles.length > 0) {
                setErrorMessage(`Invalid file type(s). Allowed types: ${allowedTypes.join(', ')}. Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`);
                return;
            }
            
            setErrorMessage('');
            
        setDocuments(prev => ({
            ...prev,
                [field]: files
        }));
        }
    };

    const handleInputChange = (field: string, value: number | string | null | undefined) => {
        // Fields that should only accept numeric currency values
        const currencyFields = [
            'averageMonthlyIncome',
            'averageMonthlyExpenditure',
            'income',
            'costOfSales',
            'operationalExpenses'
        ];

        if (currencyFields.includes(field)) {
            let numericValue = 0;

            if (typeof value === 'number') {
                numericValue = value;
            } else if (typeof value === 'string') {
                const cleanValue = value.replace(/[^0-9.]/g, '');
                numericValue = parseFloat(cleanValue) || 0;
            }

            const formattedValue =
                numericValue > 0
                    ? numericValue.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                      })
                    : '';

            setDocuments(prev => ({
                ...prev,
                [field]: formattedValue
            }));
        } else {
            setDocuments(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const getNumericFromFormatted = (value: string): number | undefined => {
        if (!value) return undefined;
        const parsed = parseFloat(value.replace(/,/g, ''));
        return isNaN(parsed) ? undefined : parsed;
    };

    const monthOptions = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];

    const handleMonthlyNumericChange = (field: 'income' | 'costOfSales' | 'operationalExpenses', value: number | null | undefined) => {
        setMonthlyForm(prev => ({
            ...prev,
            [field]: typeof value === 'number' ? value : undefined
        }));
    };

    const handleMonthlySubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !user.companyID || !user.userID) {
            setMonthlyError('User information is missing. Please refresh the page and try again.');
            return;
        }

        setMonthlyError('');
        setMonthlySaveMessage('');
        setIsSavingMonthly(true);

        try {
            let result;

            if (monthlyEditingId != null) {
                // Update existing monthly record (use PUT endpoint)
                const updatePayload = {
                    id: monthlyEditingId,
                    companyID: String(user.companyID),
                    month: monthlyForm.month,
                    year: monthlyForm.year,
                    income: monthlyForm.income ?? 0,
                    costOfSales: monthlyForm.costOfSales ?? 0,
                    operationalExpenses: monthlyForm.operationalExpenses ?? 0,
                    createdBy: String(user.userID)
                };
                result = await updateMonthlyFinancialInformation(updatePayload);
                console.log('Monthly financial information updated:', result);
            } else {
                // Create new monthly record
                const payload = {
                    companyID: String(user.companyID),
                    createdBy: String(user.userID),
                    month: monthlyForm.month,
                    year: monthlyForm.year,
                    income: monthlyForm.income ?? 0,
                    costOfSales: monthlyForm.costOfSales ?? 0,
                    operationalExpenses: monthlyForm.operationalExpenses ?? 0
                };
                result = await saveMonthlyFinancialInformation(payload);
                console.log('Monthly financial information saved:', result);
            }

            setMonthlySaveMessage(
                result?.message || (monthlyEditingId != null ? 'Monthly financial information updated successfully.' : 'Monthly financial information saved successfully.')
            );

            // Refresh monthly grid
            setMonthlyRefresh(prev => prev + 1);

            // Clear editing state
            setMonthlyEditingId(null);

            // Auto-hide message and close modal after short delay
            setTimeout(() => {
                setMonthlySaveMessage('');
                setShowMonthlyModal(false);
            }, 2000);
        } catch (error) {
            console.error('Error saving monthly financial information:', error);
            let message = 'Failed to save monthly financial information. Please try again.';
            if (error instanceof Error && error.message) {
                message = error.message;
            }
            setMonthlyError(message);
        } finally {
            setIsSavingMonthly(false);
        }
    };

    const resetForm = () => {
        setDocuments({
            financialYear: '',
            profitabilityStatus: '',
            income: '',
            incomeCurrency: 'ZAR',
            costOfSales: '',
            costOfSalesCurrency: 'ZAR',
            operationalExpenses: '',
            operationalExpensesCurrency: 'ZAR',
            averageMonthlyIncome: '',
            averageMonthlyIncomeCurrency: 'ZAR',
            averageMonthlyExpenditure: '',
            averageMonthlyExpenditureCurrency: 'ZAR',
            financialStatements: [],
            financialStatementsExpiry: null,
            bankStatement: [],
            bankStatementExpiry: null
        });
        
        const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
        fileInputs.forEach(input => {
            input.value = '';
        });
        
        setSelectedProfitabilityDescription('');
        setErrorMessage('');
        setApiError('');
    };

    const openAddFinancialDocModal = useCallback(() => {
        setFinancialModalMode('create');
        setSelectedFinancialHeaderId(null);
        resetForm();
        setAddFinancialDocModalOpen(true);
    }, []);

    const closeAddFinancialDocModal = useCallback(() => {
        setAddFinancialDocModalOpen(false);
        setFinancialModalMode('create');
        setSelectedFinancialHeaderId(null);
        setIsLoadingFinancialHeader(false);
        setErrorMessage('');
        setApiError('');
        setSaveMessage('');
    }, []);

    const populateFinancialFormFromHeader = useCallback((header: Record<string, unknown>) => {
        const formatCurrency = (value: unknown) => {
            const numeric = typeof value === 'number' ? value : Number(value || 0);
            return numeric
                ? numeric.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })
                : '';
        };

        const currency = String(header.currency || header.incomeCurrency || header.averageMonthlyIncomeCurrency || 'ZAR');
        const profitabilityStatus = String(header.profitabilityStatus || '');

        setDocuments(prev => ({
            ...prev,
            financialYear: String(header.financialYear || ''),
            profitabilityStatus,
            income: formatCurrency(header.income),
            incomeCurrency: currency,
            costOfSales: formatCurrency(header.costOfSales),
            costOfSalesCurrency: currency,
            operationalExpenses: formatCurrency(header.operationalExpenses),
            operationalExpensesCurrency: currency,
            averageMonthlyIncome: formatCurrency(header.averageMonthlyIncome),
            averageMonthlyIncomeCurrency: currency,
            averageMonthlyExpenditure: formatCurrency(header.averageMonthlyExpenditure),
            averageMonthlyExpenditureCurrency: currency,
            financialStatements: [],
            financialStatementsExpiry: null,
            bankStatement: [],
            bankStatementExpiry: null
        }));

        const selected = profitabilityOptions.find(item => item.Name === profitabilityStatus);
        setSelectedProfitabilityDescription(selected?.Description || '');
    }, [profitabilityOptions]);

    const loadFinancialHeaderIntoModal = useCallback(async (headerId: string, mode: 'view' | 'edit') => {
        setIsLoadingFinancialHeader(true);
        setFinancialModalMode(mode);
        setSelectedFinancialHeaderId(headerId);
        setErrorMessage('');
        setApiError('');
        setSaveMessage('');
        setAddFinancialDocModalOpen(true);

        try {
            const response = await getFinancialInformationHeaderByID(headerId);
            const header = (response && typeof response === 'object' && 'header' in response)
                ? ((response as { header?: Record<string, unknown> }).header || response)
                : response;
            populateFinancialFormFromHeader(header as Record<string, unknown>);
        } catch (error) {
            console.error(`Error loading financial header for ${mode}:`, error);
            setApiError(`Failed to load financial application for ${mode}. Please try again.`);
        } finally {
            setIsLoadingFinancialHeader(false);
        }
    }, [populateFinancialFormFromHeader]);

    const loadExistingDocuments = async () => {
        console.log('Loading existing financial documents...');
    };

    const handleSubmit = async (e: React.FormEvent, submitOptions?: { onSuccess?: () => void }) => {
        e.preventDefault();

        if (financialModalMode === 'view') {
            return;
        }
        
        // Direct validation
        if (!user || !user.companyID || !user.userID) {
            setErrorMessage('User authentication data is missing. Please refresh the page and try again.');
            return;
        }

        if (!formDocs.financialYear.trim()) {
            setErrorMessage('Financial year is required.');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');
        setApiError('');
        setSaveMessage('');

        try {
            const documents: Record<string, unknown>[] = [];

            // Process Financial Statements files
            for (const file of formDocs.financialStatements) {
                const fileData = await fileToBase64(file);
                const extension = file.name.split('.').pop()?.toLowerCase() || '';
                documents.push({
                    name_File: file.name,
                    displayName: 'Financial Statements',
                    extension: extension ? `.${extension}` : '',
                    contentType: file.type,
                    fileData: fileData,
                    fileSize: file.size,
                    documentCategory: 'Financial Statements',
                    expiryDate: formDocs.financialStatementsExpiry ? formDocs.financialStatementsExpiry.toISOString() : null
                });
            }

            // Process Bank Statement files
            for (const file of formDocs.bankStatement) {
                const fileData = await fileToBase64(file);
                const extension = file.name.split('.').pop()?.toLowerCase() || '';
                documents.push({
                    name_File: file.name,
                    displayName: '6 Months Bank Statement',
                    extension: extension ? `.${extension}` : '',
                    contentType: file.type,
                    fileData: fileData,
                    fileSize: file.size,
                    documentCategory: '6 Months Bank Statement',
                    expiryDate: formDocs.bankStatementExpiry ? formDocs.bankStatementExpiry.toISOString() : null
                });
            }

            // If no files are selected, we can now send empty documents array
            if (documents.length === 0) {
                console.log('No files selected, sending empty documents array for header-only update');
            }

            // Parse currency values (remove commas and convert to number)
            const parseCurrency = (value: string) => {
                return parseFloat(value.replace(/,/g, '')) || 0;
            };

            // Create header object
            // Use a single currency field since all fields use the same currency
            const header = {
                companyID: user.companyID,
                createdBy: user.userID,
                financialYear: formDocs.financialYear.trim(),
                income: parseCurrency(formDocs.income),
                costOfSales: parseCurrency(formDocs.costOfSales),
                operationalExpenses: parseCurrency(formDocs.operationalExpenses),
                averageMonthlyIncome: parseCurrency(formDocs.averageMonthlyIncome),
                averageMonthlyExpenditure: parseCurrency(formDocs.averageMonthlyExpenditure),
                currency: formDocs.incomeCurrency, // Single currency field for all financial values
                profitabilityStatus: formDocs.profitabilityStatus || ''
            };

            console.log('Saving complete financial information:', { header, documents });
            console.log('Header validation:', {
                companyID: header.companyID,
                createdBy: header.createdBy,
                averageMonthlyIncome: header.averageMonthlyIncome,
                averageMonthlyExpenditure: header.averageMonthlyExpenditure
            });
            
            // Log file sizes for debugging
            documents.forEach((doc, index) => {
                console.log(`Document ${index + 1}:`, {
                    name: doc.name_File,
                    size: doc.fileSize,
                    base64Length: typeof doc.fileData === 'string' ? doc.fileData.length : 0,
                    category: doc.documentCategory
                });
            });
            
            // Validate required fields
            if (!header.companyID || !user.userID) {
                throw new Error('Company ID or User ID is missing. Please refresh the page and try again.');
            }

            let result;
            if (financialModalMode === 'edit' && selectedFinancialHeaderId) {
                const updateHeader = {
                    ...header,
                    financialCompanyHeaderID: selectedFinancialHeaderId,
                    lastModifiedUserID: user.userID
                };

                result = documents.length > 0
                    ? await updateCompleteFinancialInformation(updateHeader, documents, user.userID)
                    : await updateCompanyFinancialInformationHeader(selectedFinancialHeaderId, updateHeader);
            } else {
                result = documents.length > 0
                    ? await saveCompleteFinancialInformation(header, documents)
                    : await saveCompanyFinancialInformationHeader(header);
            }
            
            console.log('Financial information saved successfully:', result);
            
            setSaveMessage(financialModalMode === 'edit'
                ? 'Financial information updated successfully!'
                : 'Financial information saved successfully!');
            
            // Reset the upload components
            resetForm();
            
            setRefreshGrid(prev => prev + 1);
            
            setTimeout(() => setSaveMessage(''), 3000);
            
            await loadExistingDocuments();

            submitOptions?.onSuccess?.();
            
        } catch (error) {
            console.error('Error saving financial documents:', error);
            let errorMessage = 'Failed to save financial documents. Please try again.';
            
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (error && typeof error === 'object' && 'response' in error) {
                const apiError = error as Record<string, unknown>;
                
                if (apiError.response && typeof apiError.response === 'object') {
                    const response = apiError.response as Record<string, unknown>;
                    
                    if (response.data && typeof response.data === 'object') {
                        const data = response.data as Record<string, unknown>;
                        if (typeof data.message === 'string') {
                            errorMessage = data.message;
                        }
                    } else if (typeof response.status === 'number') {
                        const statusText = typeof response.statusText === 'string' ? response.statusText : 'Unknown error';
                        errorMessage = `API Error ${response.status}: ${statusText}`;
                    }
                }
            }
            
            console.error('Detailed error:', error);
            setApiError(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-teal-600">Financial Information</h1>
                <p className="text-gray-600 mt-2">
                    Manage your company&apos;s financial documents including statements, tax records, and financial reports.
                </p>
            </div>
            
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

            {apiError && (
                <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">
                    {apiError}
                </div>
            )}

            {/* Monthly expenses modal */}
            {showMonthlyModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
                        <button
                            type="button"
                            onClick={() => {
                                setShowMonthlyModal(false);
                                setMonthlyError('');
                                setMonthlySaveMessage('');
                                setMonthlyEditingId(null);
                            }}
                            className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-lg"
                        >
                            ×
                        </button>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">
                            {monthlyEditingId != null ? 'Edit Monthly Expenses' : 'Add Monthly Expenses'}
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Capture income, cost of sales and operational expenses for a specific month. Existing data for the same month and year will be updated.
                        </p>

                        {monthlySaveMessage && (
                            <div className="mb-3 p-2 rounded border border-green-300 bg-green-50 text-green-800 text-xs">
                                {monthlySaveMessage}
                            </div>
                        )}
                        {monthlyError && (
                            <div className="mb-3 p-2 rounded border border-red-300 bg-red-50 text-red-800 text-xs">
                                {monthlyError}
                            </div>
                        )}

                        <form onSubmit={handleMonthlySubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Month
                                    </label>
                                    <DropDownListComponent
                                        id="monthlyMonth"
                                        dataSource={monthOptions}
                                        value={monthlyForm.month}
                                        change={(e) =>
                                            setMonthlyForm(prev => ({
                                                ...prev,
                                                month: String(e.value || 'January')
                                            }))
                                        }
                                        cssClass="e-outline w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Year
                                    </label>
                                    <NumericTextBoxComponent
                                        id="monthlyYear"
                                        min={2000}
                                        max={2100}
                                        format="####"
                                        value={monthlyForm.year}
                                        change={(e) =>
                                            setMonthlyForm(prev => ({
                                                ...prev,
                                                year: (e.value as number) || new Date().getFullYear()
                                            }))
                                        }
                                        cssClass="e-outline w-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Income
                                </label>
                                <NumericTextBoxComponent
                                    id="monthlyIncome"
                                    format="n2"
                                    min={0}
                                    placeholder="0.00"
                                    value={monthlyForm.income}
                                    change={(e) => handleMonthlyNumericChange('income', e.value)}
                                    cssClass="e-outline w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Cost of Sales
                                </label>
                                <NumericTextBoxComponent
                                    id="monthlyCostOfSales"
                                    format="n2"
                                    min={0}
                                    placeholder="0.00"
                                    value={monthlyForm.costOfSales}
                                    change={(e) => handleMonthlyNumericChange('costOfSales', e.value)}
                                    cssClass="e-outline w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Operational Expenses
                                </label>
                                <NumericTextBoxComponent
                                    id="monthlyOperationalExpenses"
                                    format="n2"
                                    min={0}
                                    placeholder="0.00"
                                    value={monthlyForm.operationalExpenses}
                                    change={(e) => handleMonthlyNumericChange('operationalExpenses', e.value)}
                                    cssClass="e-outline w-full"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setShowMonthlyModal(false);
                                        setMonthlyError('');
                                        setMonthlySaveMessage('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isSavingMonthly}
                                >
                                    {isSavingMonthly ? 'Saving...' : 'Save Monthly Info'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tabs: Monthly Expenses | Financial Documents */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative mt-6">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
                <div className="relative z-10">
                    <nav className="flex space-x-8 px-6 border-b border-gray-200" aria-label="Tabs">
                        <button
                            type="button"
                            onClick={() => setFinancialGridTab('monthly')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                financialGridTab === 'monthly'
                                    ? 'border-teal-600 text-teal-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            Monthly Expenses
                        </button>
                        <button
                            type="button"
                            onClick={() => setFinancialGridTab('documents')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                financialGridTab === 'documents'
                                    ? 'border-teal-600 text-teal-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <FileStack className="w-4 h-4" />
                            Financial Documents
                        </button>
                    </nav>

                    <div className="p-6 min-h-[560px]">
                        <div className={financialGridTab === 'monthly' ? '' : 'hidden'} aria-hidden={financialGridTab !== 'monthly'}>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-bold text-gray-900">Monthly Expenses</h4>
                                {isEditMode && (
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={() => setShowMonthlyModal(true)}
                                    >
                                        Add Monthly Expenses
                                    </Button>
                                )}
                            </div>
                            <MonthlyExpensesGrid
                                companyId={companyIdStr}
                                refreshTrigger={monthlyRefresh}
                                onEdit={(row) => {
                                    setMonthlyEditingId(row.id);
                                    setMonthlyForm({
                                        month: row.month,
                                        year: row.year,
                                        income: row.income,
                                        costOfSales: row.costOfSales,
                                        operationalExpenses: row.operationalExpenses
                                    });
                                    setShowMonthlyModal(true);
                                }}
                            />
                        </div>

                        <div className={financialGridTab === 'documents' ? '' : 'hidden'} aria-hidden={financialGridTab !== 'documents'}>
                            <FinancialInformationHeadersGrid
                                companyId={companyIdStr}
                                refreshTrigger={refreshGrid}
                                onCreateApplication={isEditMode ? openAddFinancialDocModal : undefined}
                                onViewApplication={(headerId) => void loadFinancialHeaderIntoModal(headerId, 'view')}
                                onEditApplication={(headerId) => void loadFinancialHeaderIntoModal(headerId, 'edit')}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {addFinancialDocModalOpen && (
                <div
                    className="fixed inset-0 bg-black/30 flex items-center justify-center lg:justify-start lg:pl-72 z-50"
                    onClick={(e) => e.target === e.currentTarget && closeAddFinancialDocModal()}
                >
                    <div className="bg-white rounded-xl p-6 w-full max-w-5xl lg:ml-6 max-h-[90vh] overflow-y-auto relative shadow-xl">
                        <button
                            type="button"
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                            onClick={closeAddFinancialDocModal}
                            aria-label="Close modal"
                        >
                            ✕
                        </button>
                        <div className="mb-4 flex items-center space-x-3">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                                <FileStack className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">
                                {financialModalMode === 'view'
                                    ? 'View Financial Information'
                                    : financialModalMode === 'edit'
                                        ? 'Edit Financial Information'
                                        : 'Financial Information'}
                            </h3>
                        </div>
                        {isLoadingFinancialHeader ? (
                            <div className="py-10 text-center text-gray-600">Loading financial application...</div>
                        ) : (
                            <form
                                onSubmit={(e) => handleSubmit(e, { onSuccess: closeAddFinancialDocModal })}
                                className="space-y-4"
                            >
                                <FinancialInformationCard
                                    idPrefix="modal-"
                                    formDocs={formDocs}
                                    setDocuments={setDocuments}
                                    handleInputChange={handleInputChange}
                                    handleFileChange={handleFileChange}
                                    handleDragOver={handleDragOver}
                                    handleDragLeave={handleDragLeave}
                                    handleDrop={handleDrop}
                                    dragOver={dragOver}
                                    currencyOptions={currencyOptions}
                                    profitabilityOptions={profitabilityOptions}
                                    profitabilityNames={profitabilityNames}
                                    selectedProfitabilityDescription={selectedProfitabilityDescription}
                                    setSelectedProfitabilityDescription={setSelectedProfitabilityDescription}
                                    isEditMode={isEditMode && financialModalMode !== 'view'}
                                    getNumericFromFormatted={getNumericFromFormatted}
                                    showHeader={false}
                                />

                                {financialModalMode !== 'create' && (
                                    <FinancialDocumentsGrid
                                        companyId={companyIdStr}
                                        headerId={selectedFinancialHeaderId}
                                        onRefresh={loadExistingDocuments}
                                        refreshTrigger={refreshGrid}
                                        allowDelete={financialModalMode === 'edit'}
                                        compact={true}
                                    />
                                )}

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="secondary" onClick={closeAddFinancialDocModal}>
                                        {financialModalMode === 'view' ? 'Close' : 'Cancel'}
                                    </Button>
                                    {financialModalMode !== 'view' && (
                                        <Button type="submit" variant="primary" disabled={isSaving}>
                                            {isSaving ? 'Saving...' : financialModalMode === 'edit' ? 'Update Financial Information' : 'Save Financial Information'}
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

export default FinancialDocs;
