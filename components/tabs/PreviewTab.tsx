import React, { useState, useEffect, useMemo } from 'react';
import TabContent from './TabContent';
import { useProjectContext } from '../../hooks/useProjectContext';
import { calculateProjectCost } from '../../services/costingService';
import { CostResults } from '../../types';
import Icon from '../ui/Icon';

const DetailsSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-lg shadow-lg mb-6 p-5">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                <button className="text-blue-500 font-bold">{isOpen ? 'Hide Details' : 'Show Details'}</button>
            </div>
            {isOpen && <div className="mt-4 border-t border-slate-200 pt-4">{children}</div>}
        </div>
    );
};

const PreviewTab: React.FC = () => {
    const { currentProject, framingMaterials, finishMaterials } = useProjectContext();
    const [costResults, setCostResults] = useState<CostResults | null>(null);

    useEffect(() => {
        // Automatically calculate costs when switching to this tab or when project data changes
        const results = calculateProjectCost(currentProject, framingMaterials, finishMaterials);
        setCostResults(results);
    }, [currentProject, framingMaterials, finishMaterials]);

    const projectStatusMap: { [key: string]: string } = {
        '0': 'Quote Request', '5': 'Submit Quotation', '15': 'Started - Deposit', '35': 'Procurement',
        '55': 'Work In Progress - Parts', '75': 'Assembly', '85': 'Finishes', '90': 'Package',
        '95': 'Shipped', '100': 'Closeout'
    };

    const statusText = projectStatusMap[currentProject.projectStatus] || 'Unknown';

    if (!costResults) {
        return <TabContent title="Project Preview" icon="fas fa-eye"><p>Loading preview...</p></TabContent>;
    }
    
    return (
        <TabContent title="Project Preview & Cost Summary" icon="fas fa-eye">
            <div className="bg-white rounded-lg shadow-lg mb-6">
                <header className="p-5 flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-slate-800">{currentProject.projName || 'Unnamed Project'}</h3>
                    <div className="bg-slate-100 text-slate-700 font-mono py-1 px-3 rounded-full text-sm">{currentProject.projectCode || 'No Code'}</div>
                </header>
                <div className="p-5 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><span className="block text-sm text-slate-600">Client</span><span className="font-semibold">{currentProject.clientName || 'N/A'}</span></div>
                    <div><span className="block text-sm text-slate-600">Manager</span><span className="font-semibold">{currentProject.projMgr || 'N/A'}</span></div>
                    <div><span className="block text-sm text-slate-600">Center</span><span className="font-semibold">{currentProject.prodCentre || 'N/A'}</span></div>
                    <div><span className="block text-sm text-slate-600">Status</span><span className="font-semibold">{statusText}</span></div>
                </div>
            </div>

            <DetailsSection title="Cost & Quote Summary" defaultOpen={true}>
                 <table className="w-full text-left">
                    <tbody>
                        <tr className="bg-slate-800 text-white text-lg">
                            <td className="p-3 font-bold rounded-l-lg">Recommended Sales Price</td>
                            <td className="p-3 font-bold text-right rounded-r-lg">{costResults.formatN(costResults.salesPrice)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="p-3 font-bold border-t-2 border-slate-800">Total Estimated Cost</td>
                            <td className="p-3 font-bold text-right border-t-2 border-slate-800">{costResults.formatN(costResults.totalCost)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="p-3">Target Profit</td>
                            <td className="p-3 text-right">{costResults.formatN(costResults.profit)}</td>
                        </tr>
                    </tbody>
                </table>
            </DetailsSection>

            <DetailsSection title="Materials Cost Breakdown">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="p-2 text-left">Description</th>
                                <th className="p-2 text-left">Material</th>
                                <th className="p-2 text-left">Qty</th>
                                <th className="p-2 text-right">Unit Price</th>
                                <th className="p-2 text-right">Total Price</th>
                            </tr>
                        </thead>
                        <tbody dangerouslySetInnerHTML={{ __html: costResults.materialDetailsHTML }}></tbody>
                    </table>
                </div>
            </DetailsSection>

            <DetailsSection title="Other Costs Breakdown">
                <table className="w-full text-sm" dangerouslySetInnerHTML={{ __html: costResults.otherCostsHTML }}></table>
            </DetailsSection>
        </TabContent>
    );
};

export default PreviewTab;