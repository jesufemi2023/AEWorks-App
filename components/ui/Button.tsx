
import React from 'react';
import Icon from './Icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'outline' | 'default';
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'default',
    size = 'md',
    icon,
    className = '',
    ...props
}) => {
    const baseClasses = "font-bold rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400',
        success: 'bg-green-700 text-white hover:bg-green-800 focus:ring-green-400',
        warning: 'bg-amber-500 text-black hover:bg-amber-600 focus:ring-amber-300',
        danger: 'bg-red-700 text-white hover:bg-red-800 focus:ring-red-400',
        outline: 'bg-transparent border-2 border-slate-800 text-slate-800 hover:bg-slate-800 hover:text-white',
        default: 'bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-400'
    };

    const sizeClasses = {
        sm: 'py-2 px-3 text-sm',
        md: 'py-3 px-5 text-base',
        lg: 'py-4 px-6 text-lg'
    };
    
    const hoverClasses = "hover:translate-y-[-2px] hover:shadow-md";

    // Corrected spread attribute syntax by wrapping in curly braces
    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${hoverClasses} ${className}`}
            {...props}
        >
            {icon && <Icon name={icon} />}
            {children}
        </button>
    );
};

export default Button;
