import React from 'react';
import Icon from '../ui/Icon';

interface TabContentProps {
    title: string;
    icon: string;
    children: React.ReactNode;
}

const TabContent: React.FC<TabContentProps> = ({ title, icon, children }) => {
    return (
        <div>
            <h2 className="text-sm md:text-lg font-black mb-2 pb-1 border-b border-slate-200 flex items-center gap-2 text-slate-800 uppercase tracking-tight">
                <Icon name={icon} className="text-blue-500 opacity-60" />
                {title}
            </h2>
            {children}
        </div>
    );
};

export default TabContent;