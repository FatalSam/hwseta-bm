'use client';

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
    size?: 'sm' | 'md';
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    disabled = false,
    className = '',
    children,
    ...props
}) => {
    // Base classes
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer';
    
    // Variant classes
    const variantClasses = {
        primary: 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500',
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
    };
    
    // Size classes
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm rounded',
        md: 'px-4 py-2 rounded-lg',
    };
    
    // Disabled classes
    const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed';
    
    // Combine all classes
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`.trim();
    
    // Icon spacing
    const iconSpacing = size === 'sm' ? (iconPosition === 'left' ? 'mr-1' : 'ml-1') : (iconPosition === 'left' ? 'mr-2' : 'ml-2');
    const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
    
    return (
        <button
            className={classes}
            disabled={disabled}
            {...props}
        >
            {icon && iconPosition === 'left' && (
                <span className={`${iconSpacing} ${iconSize} flex-shrink-0`}>
                    {icon}
                </span>
            )}
            {children}
            {icon && iconPosition === 'right' && (
                <span className={`${iconSpacing} ${iconSize} flex-shrink-0`}>
                    {icon}
                </span>
            )}
        </button>
    );
};

export default Button;

