import React, { useState, useMemo } from 'react';
import Icon from '../ui/Icon';
import ProjectSpecTab from './ProjectSpecTab';
import FramingSpecTab from './FramingSpecTab';
import FinishesSpecTab from './FinishesSpecTab';
import DeliverySpecTab from './DeliverySpecTab';
import CostingTab from './CostingTab';
import PreviewTab from './PreviewTab';
import InvoicingTab from './InvoicingTab';
import { useAppContext } from '../../hooks/useAppContext';

const TABS = [
    { id: 'ProjectSpec', label: 'Project', icon: 'fas fa-project-diagram', roles: ['admin', 'manager', 'viewer'] },
    { id: 'FramingSpec', label: 'Framing', icon: 'fas fa-ruler-combined', roles: ['admin', 'manager', 'viewer'] },
    { id: 'FinishesSpec', label: 'Finishes', icon: 'fas fa-paint-roller', roles: ['admin', 'manager', 'viewer'] },
    { id: 'DeliverySpec', label: 'Delivery', icon: 'fas fa-truck', roles: ['admin', 'manager', 'viewer'] },
    { id: 'CostingSpec', label: 'Costing', icon: 'fas fa-calculator', roles: ['admin', 'manager'] },
    { id: 'Preview', label: 'Preview', icon: 'fas fa-eye', roles: ['admin', 'manager', 'viewer'] },
    { id: 'Invoicing', label: 'Invoicing', icon: 'fas fa-file-invoice-dollar', roles: ['admin', 'manager'] },
];

const TabContainer: React.FC = () => {
    const { currentUser } = useAppContext();
    
    const visibleTabs = useMemo(() => {
        return TABS.filter(tab => tab.roles.includes(currentUser?.role || 'viewer'));
    }, [currentUser]);

    const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id || TABS[0].id);

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
            <div className="relative bg-slate-800 flex-shrink-0">
                <div className="flex overflow-x-auto no-scrollbar scroll-smooth">
                    {visibleTabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    py-2 px-3 md:px-5 text-[10px] md:text-xs whitespace-nowrap cursor-pointer transition-all duration-200 flex items-center gap-1.5 font-black uppercase tracking-widest border-b-2
                                    ${isActive 
                                        ? 'bg-white text-blue-900 border-blue-500 shadow-inner' 
                                        : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'
                                    }
                                `}
                            >
                                <Icon name={tab.icon} className={isActive ? 'text-blue-600' : 'text-[9px] opacity-40'} /> {tab.label}
                            </button>
                        );
                    })}
                </div>
                {/* Visual fading indicator for horizontal scroll on mobile */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-800/80 to-transparent pointer-events-none md:hidden"></div>
            </div>
            <div className="flex-grow p-2 md:p-3 overflow-auto bg-slate-50/30 relative">
                <div className="min-h-full">
                    {activeTab === 'ProjectSpec' && <ProjectSpecTab />}
                    {activeTab === 'FramingSpec' && <FramingSpecTab />}
                    {activeTab === 'FinishesSpec' && <FinishesSpecTab />}
                    {activeTab === 'DeliverySpec' && <DeliverySpecTab />}
                    {activeTab === 'CostingSpec' && <CostingTab />}
                    {activeTab === 'Preview' && <PreviewTab />}
                    {activeTab === 'Invoicing' && <InvoicingTab />}
                </div>
            </div>
        </div>
    );
};

export default TabContainer;