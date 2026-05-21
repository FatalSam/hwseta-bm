import React from 'react';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import { cn } from '@/lib/utils';
import { DropdownOption } from '@/types/dropdown-options';

interface DropdownSelectProps {
    options: DropdownOption[];
    value?: number;
    onChange: (value: number) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    error?: string;
}

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = "Select an option",
    label,
    required = false,
    disabled = false,
    className = "",
    error
}) => {
    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <select
                value={value || ""}
                onChange={(e) => onChange(Number(e.target.value))}
                disabled={disabled}
                className={cn(
                    adminFormTheme.select,
                    error && 'border-red-500 focus:border-red-500 focus:ring-red-500/15',
                )}
            >
                <option value="" disabled>
                    {placeholder}
                </option>
                {options.map((option) => (
                    <option key={option.Id} value={option.Id}>
                        {option.Name}
                    </option>
                ))}
            </select>
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}; 