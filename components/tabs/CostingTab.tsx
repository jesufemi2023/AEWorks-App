import React, { useState } from 'react';
import TabContent from './TabContent';
import Button from '../ui/Button';
import { useProjectContext } from '../../hooks/useProjectContext';
import { COST_VARS_STRUCTURE } from '../../constants';
import { CostResults, CostingVariables } from '../../types';
import { calculateProjectCost } from '../../services/costingService';
import { useAppContext } from '../../hooks/useAppContext';
import Icon from '../ui/Icon';
import * as db from '../../services/db';

const CostingTab: React.FC = () => {
    const { currentProject, setCurrentProject, framingMaterials, finishMaterials, updateGlobalDefaults } = useProjectContext();
    const { showNotification } = useAppContext();
    const [costResults, setCostResults] = useState<CostResults | null>(null);

    const handleVariableChange = (key: string, value: string) => {
        const numericValue = parseFloat(value) || 0;
        
        // 1. Update Current Project Local State
        const updatedProjectVars = {
            ...currentProject.costingVariables,
            [key]: numericValue,
        };
        
        setCurrentProject(prev => ({
            ...prev,
            costingVariables: updatedProjectVars,
        }));

        // 2. Update System-Wide Global Defaults Immediately
        // This ensures the next project created will use these new values
        const currentGlobal = db.getData<CostingVariables>('defaultCostingVariables')[0] || {};
        const updatedGlobal = { ...currentGlobal, [key]: numericValue, updatedAt: new Date().toISOString() };
        
        // Save to DB (triggers pushToCloud in db.ts)
        db.saveData('defaultCostingVariables', [updatedGlobal]);
    };

    const handleCalculate = () => {
        const results = calculateProjectCost(currentProject, framingMaterials, finishMaterials);
        setCostResults(results);
        showNotification("Production analysis complete.");
    };

    return (
        <TabContent title="Costing Engine" icon="fas fa-calculator">
            <div className="mb-2 flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <Button onClick={handleCalculate} variant="primary" icon="fas fa-play" size="sm" className="py-1 px-3 text-xs">
                    Execute Analysis
                </Button>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Icon name="fas fa-sync" className="text-blue-500" />
                    Auto-Indexing: Changes persist as global defaults
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Costing Variables Section */}
                <section className="bg-white p-3 rounded-xl border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 border-b border-slate-100 pb-1 mb-2 uppercase tracking-widest">Rate Benchmarks</h3>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                        {Object.entries(COST_VARS_STRUCTURE).map(([category, variables]) => (
                            <div key={category}>
                                <h4 className="font-bold text-[10px] text-blue-600 mb-1 uppercase tracking-tight">{category}</h4>
                                <table className="w-full text-[10px]">
                                    <tbody>
                                        {Object.entries(variables).map(([key, [label]]) => (
                                            <tr key={key} className="border-b border-slate-50 group hover:bg-slate-50 transition-colors">
                                                <td className="py-1 pr-2 text-slate-500">{label as string}</td>
                                                <td className="py-1 pl-2 w-24">
                                                    <input
                                                        type="number"
                                                        value={currentProject.costingVariables[key] ?? ''}
                                                        onChange={(e) => handleVariableChange(key, e.target.value)}
                                                        className="w-full p-1 text-right border border-slate-100 rounded bg-slate-50 focus:bg-white focus:border-blue-400 transition-all font-mono font-bold text-slate-800"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Multi-Job Financial Summary */}
                <section className="bg-slate-900 text-slate-300 p-3 rounded-xl border border-slate-800 shadow-lg h-fit overflow-hidden">
                    <h3 className="text-xs font-black text-slate-500 border-b border-slate-800 pb-1 mb-3 uppercase tracking-widest flex items-center gap-2">
                        <Icon name="fas fa-file-invoice-dollar" className="text-emerald-500"/> Consolidated Summary
                    </h3>
                    
                    {costResults ? (
                        <div className="space-y-4 animate-fade-in">
                            {/* Job Breakdowns Table */}
                            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/50">
                                <table className="w-full text-[10px]">
                                    <thead className="bg-slate-800 text-slate-400 uppercase">
                                        <tr>
                                            <th className="p-2 text-left">Job / Element</th>
                                            <th className="p-2 text-right">Materials</th>
                                            <th className="p-2 text-right">Labor</th>
                                            <th className="p-2 text-right">Job Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {costResults.jobBreakdowns.map(job => (
                                            <tr key={job.jobId} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="p-2 font-bold text-slate-100">{job.jobName}</td>
                                                <td className="p-2 text-right text-slate-400">{costResults.formatN(job.materialCost)}</td>
                                                <td className="p-2 text-right text-slate-400">{costResults.formatN(job.laborCost)}</td>
                                                <td className="p-2 text-right font-black text-blue-400">{costResults.formatN(job.totalCost)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Global Total Table */}
                            <table className="w-full text-xs mt-4">
                                <tbody>
                                    <tr className="border-b border-slate-800/50">
                                        <td className="py-1.5 opacity-60 italic">Consolidated Materials</td>
                                        <td className="py-1.5 text-right">{costResults.formatN(costResults.totalMaterialCost)}</td>
                                    </tr>
                                    <tr className="border-b border-slate-800/50">
                                        <td className="py-1.5 opacity-60 italic">Consolidated Production Labor</td>
                                        <td className="py-1.5 text-right">{costResults.formatN(costResults.totalLabor)}</td>
                                    </tr>
                                     <tr className="border-b border-slate-800/50">
                                        <td className="py-1.5 opacity-60 italic">Consumables & Overheads</td>
                                        <td className="py-1.5 text-right">{costResults.formatN(costResults.totalOverhead + costResults.totalConsumableCost)}</td>
                                    </tr>
                                    <tr className="border-t-2 border-slate-700 bg-slate-800/20">
                                        <td className="py-2 px-2 font-black text-white uppercase tracking-wider">Gross Project Cost</td>
                                        <td className="py-2 px-2 text-right font-black text-white">{costResults.formatN(costResults.totalCost)}</td>
                                    </tr>
                                    <tr className="bg-blue-600 text-white rounded-lg">
                                        <td className="p-3 font-black text-sm uppercase tracking-wider rounded-l-lg">Target Contract Quote</td>
                                        <td className="p-3 text-right font-black text-sm rounded-r-lg">{costResults.formatN(costResults.salesPrice)}</td>
                                    </tr>
                                    <tr>
                                        <td className="pt-2 text-[9px] font-bold uppercase text-emerald-500 px-1">Projected Operation Margin</td>
                                        <td className="pt-2 text-right font-bold text-emerald-500 px-1">{costResults.formatN(costResults.profit)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-slate-950/50 rounded-xl text-slate-700">
                            <Icon name="fas fa-chart-pie" className="text-3xl mb-3 opacity-20" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Execute analysis to view job breakdowns</p>
                        </div>
                    )}
                </section>
            </div>
        </TabContent>
    );
};

export default CostingTab;