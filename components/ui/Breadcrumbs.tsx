import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = "" }) => {
    return (
        <nav className={`flex items-center text-sm font-medium text-brand-power/50 mb-6 ${className}`} aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 flex-wrap">
                <li>
                    <Link to="/" className="flex items-center hover:text-brand-accent transition-colors group">
                        <Home size={16} className="text-brand-power/50 group-hover:text-brand-accent" />
                        <span className="sr-only">Inicio</span>
                    </Link>
                </li>
                {items.map((item, index) => (
                    <li key={index} className="flex items-center">
                        <ChevronRight size={14} className="mx-1 text-brand-power/30" />
                        {item.path ? (
                            <Link to={item.path} className="hover:text-brand-accent transition-colors">
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-brand-power cursor-default font-semibold">{item.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};
