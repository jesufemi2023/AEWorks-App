import React from 'react';
import Button from '../ui/Button';

interface ManagePageProps {
    title: string;
    icon: string;
    goBack: () => void;
    children: React.ReactNode;
}

const ManagePage: React.FC<ManagePageProps> = ({ title, icon, goBack, children }) => {
    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex-shrink-0 bg-white z-10">
                <Button onClick={goBack} variant="primary" size="sm" icon="fas fa-arrow-left" className="mb-4">
                    Back to Project
                </Button>
                <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <i className={icon}></i> {title}
                </h2>
            </div>
            <div className="flex-grow p-6 overflow-auto">
                {children}
            </div>
        </div>
    );
};

export default ManagePage;