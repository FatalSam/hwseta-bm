import React from 'react';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { NumericTextBoxComponent, TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DatePickerComponent, ChangedEventArgs } from '@syncfusion/ej2-react-calendars';
import { DollarSign } from 'lucide-react';
import {
    preventInvalidDateInputBeforeInput,
    preventInvalidDateInputKeyDown,
    preventInvalidDateInputPaste,
} from '@/components/ui/SyncfusionIsoDatePicker';

export interface FinancialInformationFormState {
    financialYear: string;
    profitabilityStatus: string;
    income: string;
    incomeCurrency: string;
    costOfSales: string;
    costOfSalesCurrency: string;
    operationalExpenses: string;
    operationalExpensesCurrency: string;
    averageMonthlyIncome: string;
    averageMonthlyIncomeCurrency: string;
    averageMonthlyExpenditure: string;
    averageMonthlyExpenditureCurrency: string;
    financialStatements: File[];
    financialStatementsExpiry: Date | null;
    bankStatement: File[];
    bankStatementExpiry: Date | null;
}

interface CurrencyOption {
    code: string;
    name: string;
    symbol: string;
}

interface ProfitabilityOption {
    Name: string;
    Description?: string;
}

interface FinancialInformationCardProps {
    idPrefix?: string;
    formDocs: FinancialInformationFormState;
    setDocuments: React.Dispatch<React.SetStateAction<FinancialInformationFormState>>;
    handleInputChange: (field: string, value: number | string | null | undefined) => void;
    handleFileChange: (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleDragOver: (e: React.DragEvent, field: string) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, field: string) => void;
    dragOver: string | null;
    currencyOptions: CurrencyOption[];
    profitabilityOptions: ProfitabilityOption[];
    profitabilityNames: string[];
    selectedProfitabilityDescription: string;
    setSelectedProfitabilityDescription: (value: string) => void;
    isEditMode: boolean;
    getNumericFromFormatted: (value: string) => number | undefined;
    showHeader?: boolean;
}

const FinancialInformationCard: React.FC<FinancialInformationCardProps> = ({
    idPrefix = '',
    formDocs,
    setDocuments,
    handleInputChange,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    dragOver,
    currencyOptions,
    profitabilityOptions,
    profitabilityNames,
    selectedProfitabilityDescription,
    setSelectedProfitabilityDescription,
    isEditMode,
    getNumericFromFormatted,
    showHeader = true
}) => {
    return (
        <div
            className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative"
            onBeforeInputCapture={preventInvalidDateInputBeforeInput}
            onKeyDownCapture={preventInvalidDateInputKeyDown}
            onPasteCapture={preventInvalidDateInputPaste}
        >
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/10 to-emerald-400/10 rounded-full -ml-16 -mt-16" />
            <div className="relative z-10">
                {showHeader && (
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">Financial Information</h4>
                    </div>
                )}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Financial Year
                        </label>
                        <TextBoxComponent
                            id={`${idPrefix}financialYear`}
                            placeholder="e.g. 2025/2026"
                            value={formDocs.financialYear}
                            change={(e) => handleInputChange('financialYear', e.value)}
                            readonly={!isEditMode}
                            cssClass="e-outline w-full"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Average Monthly Income
                            </label>
                            <div className="flex gap-2">
                                <div className="w-[20%]">
                                    <DropDownListComponent
                                        id={`${idPrefix}averageMonthlyIncomeCurrency`}
                                        dataSource={currencyOptions as unknown as { [key: string]: object }[]}
                                        fields={{ text: 'name', value: 'code' }}
                                        value={formDocs.averageMonthlyIncomeCurrency}
                                        change={(e) => {
                                            const selectedCurrency = e.value;
                                            handleInputChange('incomeCurrency', selectedCurrency);
                                            handleInputChange('costOfSalesCurrency', selectedCurrency);
                                            handleInputChange('operationalExpensesCurrency', selectedCurrency);
                                            handleInputChange('averageMonthlyIncomeCurrency', selectedCurrency);
                                            handleInputChange('averageMonthlyExpenditureCurrency', selectedCurrency);
                                        }}
                                        enabled={isEditMode}
                                        cssClass="e-outline w-full"
                                    />
                                </div>
                                <div className="w-[80%]">
                                    <NumericTextBoxComponent
                                        id={`${idPrefix}averageMonthlyIncome`}
                                        format="n2"
                                        min={0}
                                        placeholder="0.00"
                                        value={getNumericFromFormatted(formDocs.averageMonthlyIncome)}
                                        change={(e) => handleInputChange('averageMonthlyIncome', e.value)}
                                        enabled={isEditMode}
                                        cssClass="e-outline w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Average Monthly Expenditure
                            </label>
                            <div className="flex gap-2">
                                <div className="w-[20%]">
                                    <DropDownListComponent
                                        id={`${idPrefix}averageMonthlyExpenditureCurrency`}
                                        dataSource={currencyOptions as unknown as { [key: string]: object }[]}
                                        fields={{ text: 'name', value: 'code' }}
                                        value={formDocs.averageMonthlyExpenditureCurrency}
                                        change={(e) => {
                                            const selectedCurrency = e.value;
                                            handleInputChange('incomeCurrency', selectedCurrency);
                                            handleInputChange('costOfSalesCurrency', selectedCurrency);
                                            handleInputChange('operationalExpensesCurrency', selectedCurrency);
                                            handleInputChange('averageMonthlyIncomeCurrency', selectedCurrency);
                                            handleInputChange('averageMonthlyExpenditureCurrency', selectedCurrency);
                                        }}
                                        enabled={isEditMode}
                                        cssClass="e-outline w-full"
                                    />
                                </div>
                                <div className="w-[80%]">
                                    <NumericTextBoxComponent
                                        id={`${idPrefix}averageMonthlyExpenditure`}
                                        format="n2"
                                        min={0}
                                        placeholder="0.00"
                                        value={getNumericFromFormatted(formDocs.averageMonthlyExpenditure)}
                                        change={(e) => handleInputChange('averageMonthlyExpenditure', e.value)}
                                        enabled={isEditMode}
                                        cssClass="e-outline w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Profitability Status
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <DropDownListComponent
                                id={`${idPrefix}profitabilityStatus`}
                                dataSource={profitabilityNames}
                                placeholder="Select profitability status"
                                value={formDocs.profitabilityStatus}
                                change={(e) => {
                                    const value = String(e.value || '');
                                    handleInputChange('profitabilityStatus', value);
                                    const selected = profitabilityOptions.find(p => p.Name === value);
                                    setSelectedProfitabilityDescription(selected?.Description || '');
                                }}
                                enabled={isEditMode}
                                cssClass="e-outline w-full font-bold"
                            />
                            {selectedProfitabilityDescription && (
                                <div className="px-3 py-2 bg-emerald-700 border border-emerald-800 rounded-md text-sm text-white min-h-[38px] flex items-center shadow-sm">
                                    <span className="mr-2 text-emerald-100 text-base" aria-hidden="true">★</span>
                                    <span>{selectedProfitabilityDescription}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            6 Months Bank Statement
                        </label>
                        <div
                            className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                dragOver === 'bankStatement'
                                    ? 'border-blue-400 bg-blue-50'
                                    : 'border-gray-300 hover:border-gray-400'
                            } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            onDragOver={(e) => handleDragOver(e, 'bankStatement')}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, 'bankStatement')}
                            onClick={() => {
                                if (isEditMode) {
                                    const input = document.getElementById(`${idPrefix}bankStatement-input`) as HTMLInputElement;
                                    input?.click();
                                }
                            }}
                        >
                            <input
                                id={`${idPrefix}bankStatement-input`}
                                type="file"
                                onChange={handleFileChange('bankStatement')}
                                disabled={!isEditMode}
                                multiple
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            />
                            <div className="text-center">
                                <div className="text-gray-500 text-sm">
                                    {formDocs.bankStatement.length > 0 ? (
                                        <span className="text-green-600 font-medium">
                                            ✓ Selected {formDocs.bankStatement.length} file(s): {formDocs.bankStatement.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
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
                        <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Expiry Date (Optional)
                            </label>
                            <DatePickerComponent
                                id={`${idPrefix}bankStatementExpiry-input`}
                                placeholder="Select expiry date (optional)"
                                value={formDocs.bankStatementExpiry ?? undefined}
                                change={(e: ChangedEventArgs) => {
                                    setDocuments(prev => ({
                                        ...prev,
                                        bankStatementExpiry: e.value as Date | null
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
                            Financial Statements
                        </label>
                        <div
                            className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                                dragOver === 'financialStatements'
                                    ? 'border-blue-400 bg-blue-50'
                                    : 'border-gray-300 hover:border-gray-400'
                            } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            onDragOver={(e) => handleDragOver(e, 'financialStatements')}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, 'financialStatements')}
                            onClick={() => {
                                if (isEditMode) {
                                    const input = document.getElementById(`${idPrefix}financialStatements-input`) as HTMLInputElement;
                                    input?.click();
                                }
                            }}
                        >
                            <input
                                id={`${idPrefix}financialStatements-input`}
                                type="file"
                                onChange={handleFileChange('financialStatements')}
                                disabled={!isEditMode}
                                multiple
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            />
                            <div className="text-center">
                                <div className="text-gray-500 text-sm">
                                    {formDocs.financialStatements.length > 0 ? (
                                        <span className="text-green-600 font-medium">
                                            ✓ Selected {formDocs.financialStatements.length} file(s): {formDocs.financialStatements.map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join(', ')}
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
                        <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Expiry Date (Optional)
                            </label>
                            <DatePickerComponent
                                id={`${idPrefix}financialStatementsExpiry-input`}
                                placeholder="Select expiry date (optional)"
                                value={formDocs.financialStatementsExpiry ?? undefined}
                                change={(e: ChangedEventArgs) => {
                                    setDocuments(prev => ({
                                        ...prev,
                                        financialStatementsExpiry: e.value as Date | null
                                    }));
                                }}
                                enabled={isEditMode}
                                cssClass="e-outline w-full"
                                format="dd MMMM yyyy"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialInformationCard;
