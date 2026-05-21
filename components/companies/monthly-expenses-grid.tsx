import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GridComponent, ColumnsDirective, ColumnDirective, Inject, Page, Sort, Toolbar, Search } from '@syncfusion/ej2-react-grids';
import { enableRipple } from '@syncfusion/ej2-base';
import { getMonthlyFinancialInformationByCompanyID, deleteMonthlyFinancialInformation } from '@/api/companies';
import Button from '@/components/ui/button';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { Eye, Trash2, Loader2, Edit } from 'lucide-react';

enableRipple(true);

interface MonthlyExpense {
    id: number;
    companyID: string;
    dateCreated: string;
    createdBy: string;
    month: string;
    year: number;
    income: number;
    costOfSales: number;
    operationalExpenses: number;
}

interface MonthlyExpensesGridProps {
    companyId: string;
    refreshTrigger?: number;
    onEdit?: (row: MonthlyExpense) => void;
}

const MonthlyExpensesGrid: React.FC<MonthlyExpensesGridProps> = ({ companyId, refreshTrigger = 0, onEdit }) => {
    const gridRef = useRef<GridComponent>(null);
    const [allRows, setAllRows] = useState<MonthlyExpense[]>([]);
    const [filteredRows, setFilteredRows] = useState<MonthlyExpense[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; id: number | null }>({
        isOpen: false,
        id: null
    });
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string }>({
        isOpen: false,
        message: ''
    });

    const getErrorMessage = (err: unknown): string => {
        if (err instanceof Error) {
            return err.message;
        }

        if (typeof err === 'object' && err !== null && 'message' in err) {
            const withMessage = err as { message?: unknown };
            if (typeof withMessage.message === 'string') {
                return withMessage.message;
            }
        }

        return 'Failed to load monthly financial information. Please try again.';
    };

    const loadMonthlyExpenses = useCallback(async () => {
        if (!companyId) return;

        setIsLoading(true);
        setError('');

        try {
            console.log('Loading monthly financial information for company:', companyId);
            const response = await getMonthlyFinancialInformationByCompanyID(companyId);
            console.log('Monthly financial information response:', response);

            let data: unknown = response;
            if (response && typeof response === 'object' && !Array.isArray(response)) {
                const maybeWrapped = response as { data?: MonthlyExpense[]; result?: MonthlyExpense[] };
                if (Array.isArray(maybeWrapped.data)) {
                    data = maybeWrapped.data;
                } else if (Array.isArray(maybeWrapped.result)) {
                    data = maybeWrapped.result;
                }
            }

            const normalized = (Array.isArray(data) ? data : []).map((item) => ({
                ...item,
                // Normalise id field from API – prefer "id" but fall back to common alternatives
                id: item.id ?? item.ID ?? item.monthlyFinancialInformationID ?? item.MonthlyFinancialInformationID
            }));

            setAllRows(normalized);
            setFilteredRows(normalized);
            
        } catch (err: unknown) {
            setError(getErrorMessage(err));
            setAllRows([]);
            setFilteredRows([]);
            if (process.env.NODE_ENV === 'development') {
                console.error('Error loading monthly financial information:', err);
            }
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        loadMonthlyExpenses();
    }, [companyId, refreshTrigger, loadMonthlyExpenses]);

    // Filter rows based on search query
    useEffect(() => {
        if (!searchQuery || !searchQuery.trim()) {
            setFilteredRows(allRows);
        } else {
        const query = searchQuery.toLowerCase().trim();
        const filtered = allRows.filter(row => {
            const month = (row.month || '').toLowerCase();
            const year = String(row.year || '').toLowerCase();
            return month.includes(query) || year.includes(query);
        });
        setFilteredRows(filtered);
        }
    }, [searchQuery, allRows]);


    // Update record counter in toolbar
    useEffect(() => {
        const count = filteredRows.length;
        
        const updateCounter = () => {
            const gridElement = gridRef.current?.element;
            if (!gridElement) return;

            const toolbar = gridElement.querySelector('.e-toolbar');
            if (toolbar) {
                const existingCounter = toolbar.querySelector('.document-counter') as HTMLElement;
                if (existingCounter) {
                    existingCounter.textContent = `Records found: ${count}`;
                } else {
                const counterDiv = document.createElement('div');
                    counterDiv.className = 'document-counter text-sm text-gray-600 font-medium px-3';
                    counterDiv.textContent = `Records found: ${count}`;
                toolbar.insertBefore(counterDiv, toolbar.firstChild);
                }
            }
        };

        updateCounter();
        const timer = setTimeout(updateCounter, 50);
        
        return () => clearTimeout(timer);
    }, [filteredRows.length, searchQuery]);

    // Set up search input listener for real-time filtering
    useEffect(() => {
        if (allRows.length === 0) return;
        
        const setupSearchListener = () => {
            const gridElement = gridRef.current?.element;
            if (!gridElement) return null;
            
            const searchBox = gridElement.querySelector('.e-toolbar .e-search input') as HTMLInputElement;
            if (searchBox) {
                const handleSearch = () => {
                    const value = searchBox.value || '';
                    setSearchQuery(value);
                };
                
                searchBox.addEventListener('input', handleSearch);
                searchBox.addEventListener('keyup', handleSearch);
                searchBox.addEventListener('keydown', handleSearch);
                searchBox.addEventListener('change', handleSearch);
                searchBox.addEventListener('paste', handleSearch);
                searchBox.addEventListener('cut', handleSearch);
                
                const clearButton = gridElement.querySelector('.e-toolbar .e-search .e-clear-icon, .e-toolbar .e-search .e-input-group-icon') as HTMLElement;
                if (clearButton) {
                    const handleClear = () => {
                        setSearchQuery('');
                        setTimeout(() => {
                            if (searchBox.value === '') {
                                setSearchQuery('');
                            }
                        }, 10);
                    };
                    clearButton.addEventListener('click', handleClear);
                    
                    return () => {
                        searchBox.removeEventListener('input', handleSearch);
                        searchBox.removeEventListener('keyup', handleSearch);
                        searchBox.removeEventListener('keydown', handleSearch);
                        searchBox.removeEventListener('change', handleSearch);
                        searchBox.removeEventListener('paste', handleSearch);
                        searchBox.removeEventListener('cut', handleSearch);
                        clearButton.removeEventListener('click', handleClear);
                    };
                }
                
                const valueObserver = new MutationObserver(() => {
                    const currentValue = searchBox.value || '';
                    if (currentValue !== searchQuery) {
                        setSearchQuery(currentValue);
                    }
                });
                
                valueObserver.observe(searchBox, {
                    attributes: true,
                    attributeFilter: ['value'],
                    childList: false,
                    subtree: false
                });
                
                const intervalId = setInterval(() => {
                    const currentValue = searchBox.value || '';
                    if (currentValue !== searchQuery) {
                        setSearchQuery(currentValue);
                    }
                }, 200);
                
                return () => {
                    searchBox.removeEventListener('input', handleSearch);
                    searchBox.removeEventListener('keyup', handleSearch);
                    searchBox.removeEventListener('keydown', handleSearch);
                    searchBox.removeEventListener('change', handleSearch);
                    searchBox.removeEventListener('paste', handleSearch);
                    searchBox.removeEventListener('cut', handleSearch);
                    valueObserver.disconnect();
                    clearInterval(intervalId);
                };
            }
            return null;
        };
        
        const cleanup = setupSearchListener();
        const timer = setTimeout(setupSearchListener, 300);
        const timer2 = setTimeout(setupSearchListener, 600);
        const timer3 = setTimeout(setupSearchListener, 1000);
        
        return () => {
            clearTimeout(timer);
            clearTimeout(timer2);
            clearTimeout(timer3);
            if (cleanup) cleanup();
        };
    }, [allRows.length, searchQuery]);

    const formatCurrency = (value: number) => {
        if (value == null) return '0.00';
        return value.toLocaleString('en-ZA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return isNaN(date.getTime())
                ? 'N/A'
                : date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                  });
        } catch {
            return 'N/A';
        }
    };

    const handleView = useCallback((row: MonthlyExpense) => {
        const message = `Month: ${row.month} ${row.year}\nIncome: ${formatCurrency(row.income)}\nCost of Sales: ${formatCurrency(row.costOfSales)}\nOperational Expenses: ${formatCurrency(row.operationalExpenses)}`;
        setAlertModal({
            isOpen: true,
            message
        });
    }, [setAlertModal]);

    const handleEdit = useCallback((row: MonthlyExpense) => {
        if (onEdit) {
            onEdit(row);
        } else {
            handleView(row);
        }
    }, [onEdit, handleView]);

    const handleDelete = useCallback((row: MonthlyExpense) => {
        setDeleteConfirmModal({
            isOpen: true,
            id: row.id
        });
    }, [setDeleteConfirmModal]);

    const confirmDelete = async () => {
        if (!companyId || deleteConfirmModal.id == null) return;

        const key = String(deleteConfirmModal.id);
        setActionLoading(key);

        try {
            console.log('Deleting monthly financial information:', {
                companyId,
                id: deleteConfirmModal.id
            });
            await deleteMonthlyFinancialInformation(deleteConfirmModal.id, companyId);
            await loadMonthlyExpenses();
        } catch (err) {
            console.error('Error deleting monthly financial information:', err);
            const message =
                err instanceof Error
                    ? err.message
                    : 'Failed to delete monthly financial information. Please try again.';
            setAlertModal({ isOpen: true, message: message });
        } finally {
            setActionLoading(null);
            setDeleteConfirmModal({ isOpen: false, id: null });
        }
    };

    const viewTemplate = useCallback((props: MonthlyExpense) => {
        const key = String(props.id);
        const isRowLoading = actionLoading === key;

        return (
            <div className="flex items-center justify-center">
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleView(props)}
                    disabled={isRowLoading}
                    title="View Monthly Details"
                >
                    {isRowLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Eye className="w-4 h-4" />
                    )}
                </Button>
            </div>
        );
    }, [actionLoading, handleView]);

    const actionTemplate = useCallback((props: MonthlyExpense) => {
        const key = String(props.id);
        const isRowLoading = actionLoading === key;

        return (
            <div className="flex items-center gap-2 justify-center">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEdit(props)}
                    disabled={isRowLoading}
                    title="Edit Monthly Record"
                >
                    {isRowLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Edit className="w-4 h-4" />
                    )}
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(props)}
                    disabled={isRowLoading}
                    title="Delete Monthly Record"
                >
                    {isRowLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Trash2 className="w-4 h-4" />
                    )}
                </Button>
            </div>
        );
    }, [actionLoading, handleEdit, handleDelete]);

    const gridContentHeight = 500;
    const gridMinHeight = gridContentHeight + 60; // content + toolbar to prevent layout shift

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8" style={{ minHeight: gridMinHeight }}>
                <div className="text-center">
                    <span className="e-icons e-loading e-spin" style={{ fontSize: '32px', color: '#3b82f6' }}></span>
                    <p className="text-gray-600 mt-2">Loading monthly expenses...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg" style={{ minHeight: gridMinHeight }}>
                <span className="text-red-800 text-sm">{error}</span>
            </div>
        );
    }

    if (allRows.length === 0 && !isLoading) {
        return (
            <div className="p-8 text-center text-gray-600 flex items-center justify-center" style={{ minHeight: gridMinHeight }}>
                <p>No monthly expenses captured yet.</p>
            </div>
        );
    }

    return (
        <div className="w-full" style={{ minHeight: gridMinHeight }}>
            <GridComponent
                ref={gridRef}
                dataSource={filteredRows}
                allowPaging={true}
                pageSettings={{ pageSize: 10 }}
                allowSorting={true}
                allowFiltering={false}
                toolbar={['Search']}
                height={gridContentHeight}
                cssClass="modern-grid"
                searchSettings={{
                    fields: ['month', 'year'],
                    operator: 'contains',
                    key: searchQuery,
                    ignoreCase: true
                }}
                dataBound={() => {
                    const count = filteredRows.length;
                    const gridElement = gridRef.current?.element;
                    if (gridElement) {
                        const toolbar = gridElement.querySelector('.e-toolbar');
                        if (toolbar) {
                            const existingCounter = toolbar.querySelector('.document-counter') as HTMLElement;
                            if (existingCounter) {
                                existingCounter.textContent = `Records found: ${count}`;
                            }
                        }
                    }
                }}
            >
                <ColumnsDirective>
                    <ColumnDirective
                        field="view"
                        headerText="View"
                        width="80"
                        textAlign="Center"
                        template={viewTemplate}
                        allowSorting={false}
                        allowFiltering={false}
                    />
                    <ColumnDirective field="month" headerText="Month" width="130" textAlign="Left" />
                    <ColumnDirective field="year" headerText="Year" width="100" textAlign="Center" />
                    <ColumnDirective
                        field="income"
                        headerText="Income"
                        width="130"
                        textAlign="Right"
                        template={(props: MonthlyExpense) => formatCurrency(props.income)}
                    />
                    <ColumnDirective
                        field="costOfSales"
                        headerText="Cost of Sales"
                        width="150"
                        textAlign="Right"
                        template={(props: MonthlyExpense) => formatCurrency(props.costOfSales)}
                    />
                    <ColumnDirective
                        field="operationalExpenses"
                        headerText="Operational Expenses"
                        width="180"
                        textAlign="Right"
                        template={(props: MonthlyExpense) => formatCurrency(props.operationalExpenses)}
                    />
                    <ColumnDirective
                        field="dateCreated"
                        headerText="Captured On"
                        width="150"
                        textAlign="Center"
                        template={(props: MonthlyExpense) => formatDate(props.dateCreated)}
                    />
                    <ColumnDirective
                        field="createdBy"
                        headerText="Captured By"
                        width="180"
                        textAlign="Left"
                    />
                    <ColumnDirective
                        field="actions"
                        headerText="Actions"
                        width="150"
                        textAlign="Center"
                        template={actionTemplate}
                        allowSorting={false}
                        allowFiltering={false}
                    />
                </ColumnsDirective>
                <Inject services={[Page, Sort, Toolbar, Search]} />
            </GridComponent>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteConfirmModal.isOpen}
                onClose={() => setDeleteConfirmModal({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Delete Monthly Record"
                message="Are you sure you want to delete this monthly record? This action cannot be undone."
                type="confirm"
                confirmLabel="Delete"
                confirmVariant="primary"
            />

            {/* Alert Modal */}
            <ConfirmationModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ isOpen: false, message: '' })}
                title="Monthly Details"
                message={alertModal.message}
                type="alert"
            />
        </div>
    );
};

export default MonthlyExpensesGrid;


