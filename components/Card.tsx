import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const Card = ({ children, className = "", onClick }: CardProps) => {
    return (
        <div
            onClick={onClick}
            className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 shadow-lg ${onClick ? 'cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors' : ''} ${className}`}
        >
            {children}
        </div>
    );
};
