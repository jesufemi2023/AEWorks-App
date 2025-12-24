import React, { useState, useEffect, useMemo } from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import * as db from '../../services/db';
import { Project, WorkTeamSpec, FramingMaterial, Contact, TaskAdjustment, ProductionLog } from '../../types';
import { useAppContext } from '../../hooks/useAppContext';
import { calculateProjectCost } from '../../services/costingService';

interface WorkManagerProps {
    onBack: () => void;
}

const FAB_RATES = {
    STEEL: {
        CUTTING_MIN_PER_METER: 6.0,
        FITTING_PER_PART: 12.0,
        WELDING_MIN_PER_METER: 15.0,
        GRINDING_MIN_PER_METER: 12.0,
        ASSEMBLY_MIN_PER_PART: 25.0,
        DRILLING_MIN_PER_HOLE: 5.0,
        PAINTING_MIN_PER_SQM: 15.0,
    },
    WOOD: {
        SAWING_MIN_PER_METER: 5.0,
        FITTING_PER_JOINT: 8.0,
        PLANING_MIN_PER_SQM: 10.0,
        JOINTING_MIN_PER_JOINT: 15.0,
        SANDING_MIN_PER_SQM: 25.0,
        FINISHING_MIN_PER_SQM: 45.0,
    }
};

interface DerivedTask {
    id: string;
    category: 'Steel' | 'Wood' | 'General';
    name: string;
    qty: number;
    unit: string;
    trade: 'FAB' | 'FIT' | 'WELD' | 'FIN' | 'PKG';
    standardMins: number;
}

const WorkManager: React.FC<WorkManagerProps> = ({ onBack }) => {
    const { showNotification } = useAppContext();
    const [projects, setProjects] = useState<Project[]>([]);
    const [allStaff, setAllStaff] = useState<Contact[]>([]);
    const [framingMaterials, setFramingMaterials] = useState<FramingMaterial[]>([]);
    const [selectedProjectCode, setSelectedProjectCode] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'simulation' | 'floor_log' | 'parameters'>('simulation');
    const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
    
    const [logEntry, setLogEntry] = useState<Partial<ProductionLog>>({
        date: new Date().toISOString().split('T')[0],
        taskId: '',
        outputValue: 0,
        manHours: 0,
        notes: ''
    });

    const [teamSpec, setTeamSpec] = useState<WorkTeamSpec>({
        welders: 2, fitters: 2, painters: 1, helpers: 2,
        efficiencyRate: 0.85, dailyShiftHours: 8, targetDays: 7,
        manualAdjustments: [], assignedStaffIds: []
    });

    useEffect(() => {
        const loadedProjects = db.getData<Project>('projects');
        const loadedFraming = db.getData<FramingMaterial>('framingMaterials');
        const loadedStaff = db.getData<Contact>('contacts').filter(c => c.category.startsWith('Staff') || c.category === 'Sub Contractor');
        const loadedLogs = db.getData<ProductionLog>('productionLogs');
        
        setProjects(loadedProjects);
        setFramingMaterials(loadedFraming);
        setAllStaff(loadedStaff);
        setProductionLogs(loadedLogs);
        
        if (loadedProjects.length > 0) {
            const latest = [...loadedProjects].sort((a,b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0];
            setSelectedProjectCode(latest.projectCode);
            if (latest.workTeamSpec) setTeamSpec(latest.workTeamSpec);
        }
    }, []);

    const selectedProject = useMemo(() => 
        projects.find(p => p.projectCode === selectedProjectCode), 
    [projects, selectedProjectCode]);

    const analysis = useMemo(() => {
        if (!selectedProject) return null;

        const tasks: DerivedTask[] = [];
        let steelLM = 0, steelParts = 0, steelSQM = 0;
        let woodLM = 0, woodSQM = 0;

        selectedProject.jobs.forEach(job => {
            job.framingTakeOff.forEach(item => {
                const matInfo = framingMaterials.find(m => m['FRAMING MATERIALS'] === item.material);
                const matGroup = (matInfo?.['MATERIAL / GROUP'] || '').toUpperCase();
                const isWood = matGroup.includes('TIMBER') || matGroup.includes('WOOD') || matGroup.includes('HDF') || matGroup.includes('MDF');
                const saFactor = parseFloat(matInfo?.['Surface Area'] || '0');

                if (isWood) {
                    woodLM += (item.length || 0) * (item.qty || 0);
                    woodSQM += (item.width > 0) ? (item.length * item.width * item.qty * 2) : (item.length * item.qty * 0.4);
                } else {
                    steelLM += (item.length || 0) * (item.qty || 0);
                    steelParts += item.qty;
                    steelSQM += (item.width > 0) ? (item.length * item.width * item.qty * 2) : (item.length * item.qty * saFactor);
                }
            });
        });

        const taskDefs = [
            { id: 's_cut', category: 'Steel', name: 'Section Cutting', qty: steelLM, unit: 'LM', trade: 'FAB', mins: steelLM * FAB_RATES.STEEL.CUTTING_MIN_PER_METER },
            { id: 's_fit', category: 'Steel', name: 'Parts Fitting', qty: steelParts, unit: 'Parts', trade: 'FIT', mins: steelParts * FAB_RATES.STEEL.FITTING_PER_PART },
            { id: 's_weld', category: 'Steel', name: 'Welding', qty: steelLM * 0.8, unit: 'LM', trade: 'WELD', mins: steelLM * 0.8 * FAB_RATES.STEEL.WELDING_MIN_PER_METER },
            { id: 's_assm', category: 'Steel', name: 'Assembly', qty: steelParts, unit: 'Parts', trade: 'FAB', mins: steelParts * FAB_RATES.STEEL.ASSEMBLY_MIN_PER_PART },
            { id: 'w_saw', category: 'Wood', name: 'Wood Preparation', qty: woodLM, unit: 'LM', trade: 'FAB', mins: woodLM * FAB_RATES.WOOD.SAWING_MIN_PER_METER },
            { id: 'f_coat', category: 'General', name: 'Finishing & Coats', qty: steelSQM + woodSQM, unit: 'SQM', trade: 'FIN', mins: (steelSQM * FAB_RATES.STEEL.PAINTING_MIN_PER_SQM) + (woodSQM * FAB_RATES.WOOD.FINISHING_MIN_PER_SQM) }
        ];

        taskDefs.forEach(def => {
            if (def.qty > 0) {
                tasks.push({ ...def, category: def.category as any, trade: def.trade as any, standardMins: def.mins });
            }
        });

        const totalHours = tasks.reduce((acc, t) => acc + t.standardMins, 0) / 60;
        return { tasks, totalHours };
    }, [selectedProject, framingMaterials]);

    const handleSaveLog = () => {
        if (!selectedProjectCode || !logEntry.taskId) {
            showNotification("Task and Project selection required.", "warning");
            return;
        }
        const newLog: ProductionLog = {
            id: db.generateId(),
            projectCode: selectedProjectCode,
            date: logEntry.date || '',
            taskId: logEntry.taskId || '',
            outputValue: logEntry.outputValue || 0,
            manHours: logEntry.manHours || 0,
            notes: logEntry.notes
        };
        const updated = [newLog, ...productionLogs];
        db.saveData('productionLogs', updated);
        setProductionLogs(updated);
        showNotification("Daily floor log committed.");
        setLogEntry({ ...logEntry, outputValue: 0, manHours: 0, notes: '' });
    };

    const handleUpdateParam = (key: string, value: number) => {
        if (!selectedProject) return;
        const updatedVars = { ...selectedProject.costingVariables, [key]: value };
        const updatedProj = { ...selectedProject, costingVariables: updatedVars, updatedAt: new Date().toISOString() };
        
        const updatedProjects = projects.map(p => p.projectCode === selectedProjectCode ? updatedProj : p);
        db.saveData('projects', updatedProjects);
        setProjects(updatedProjects);
        showNotification("Project production parameter synchronized.");
    };

    return (
        <div className="flex flex-col h-screen bg-slate-100 font-sans">
            <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg shrink-0">
                <div className="flex items-center gap-4">
                    <Button onClick={onBack} size="sm" variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                        <Icon name="fas fa-arrow-left" /> Dashboard
                    </Button>
                    <h2 className="text-xl font-black uppercase tracking-tighter">Operational Analytics</h2>
                </div>
                <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('simulation')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'simulation' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}>Simulation</button>
                    <button onClick={() => setActiveTab('floor_log')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'floor_log' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}>Floor Log</button>
                    <button onClick={() => setActiveTab('parameters')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'parameters' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}>Parameters</button>
                </div>
            </header>

            <div className="flex-grow flex flex-col md:flex-row overflow-hidden p-4 gap-4">
                {/* Project Selector Sidebar */}
                <div className="w-full md:w-80 flex flex-col gap-4 shrink-0 overflow-hidden">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-grow flex flex-col">
                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500">Live Active Board</h3>
                        </div>
                        <div className="p-2 space-y-1 overflow-y-auto custom-scrollbar flex-grow">
                            {projects.filter(p => parseInt(p.projectStatus) < 100).map(p => (
                                <button key={p.projectCode} onClick={() => setSelectedProjectCode(p.projectCode)} className={`w-full text-left p-3 rounded-xl border transition-all ${selectedProjectCode === p.projectCode ? 'bg-blue-50 border-blue-300' : 'border-transparent hover:bg-slate-50'}`}>
                                    <span className={`text-[9px] font-black uppercase ${selectedProjectCode === p.projectCode ? 'text-blue-700' : 'text-slate-400'}`}>#{p.projectCode}</span>
                                    <h4 className="font-bold text-xs text-slate-800 truncate">{p.projName}</h4>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Dashboard Area */}
                <main className="flex-grow flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {!selectedProject ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-slate-300 opacity-50">
                            <Icon name="fas fa-chart-line" className="text-6xl mb-4" />
                            <p className="font-black uppercase tracking-widest text-xs">Select Project to View Performance</p>
                        </div>
                    ) : (
                        <div className="flex-grow overflow-auto p-6 md:p-8 animate-fade-in custom-scrollbar">
                            {activeTab === 'floor_log' && (
                                <div className="space-y-8 max-w-5xl">
                                    <div className="flex justify-between items-start border-b border-slate-100 pb-6">
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Daily Production Capture</h3>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Live Feed: Factory Floor Recording</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <div className="lg:col-span-1">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Reporting Date</label>
                                            <input type="date" value={logEntry.date} onChange={e => setLogEntry({...logEntry, date: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm" />
                                        </div>
                                        <div className="lg:col-span-1">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Active Production Task</label>
                                            <select value={logEntry.taskId} onChange={e => setLogEntry({...logEntry, taskId: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm">
                                                <option value="">-- Choose Task --</option>
                                                {analysis?.tasks.map(t => <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Actual Output</label>
                                                <input type="number" value={logEntry.outputValue || ''} onChange={e => setLogEntry({...logEntry, outputValue: parseFloat(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-blue-600 text-sm" placeholder="0.0" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Man-Hours</label>
                                                <input type="number" value={logEntry.manHours || ''} onChange={e => setLogEntry({...logEntry, manHours: parseFloat(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-emerald-600 text-sm" placeholder="0.0" />
                                            </div>
                                        </div>
                                        <div className="lg:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Production Variance Notes</label>
                                            <input type="text" value={logEntry.notes || ''} onChange={e => setLogEntry({...logEntry, notes: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm" placeholder="e.g. Machine downtime, power issues..." />
                                        </div>
                                        <div className="flex items-end">
                                            <Button onClick={handleSaveLog} variant="success" icon="fas fa-check-circle" className="w-full py-3.5 shadow-xl shadow-emerald-500/20 text-[10px] uppercase font-black">Verify & Post Log</Button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Floor Journal History</h4>
                                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-50 border-b border-slate-100">
                                                    <tr className="font-black text-slate-400 uppercase text-[9px] tracking-widest">
                                                        <th className="p-4">Date</th>
                                                        <th className="p-4">Task Component</th>
                                                        <th className="p-4 text-center">Output Captured</th>
                                                        <th className="p-4 text-center">Time Used</th>
                                                        <th className="p-4">Efficiency Score</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {productionLogs.filter(l => l.projectCode === selectedProjectCode).length === 0 ? (
                                                        <tr><td colSpan={5} className="p-12 text-center text-slate-300 italic">No logs detected for this project period.</td></tr>
                                                    ) : (
                                                        productionLogs.filter(l => l.projectCode === selectedProjectCode).map(log => {
                                                            const task = analysis?.tasks.find(t => t.id === log.taskId);
                                                            const actualIntensity = log.outputValue / (log.manHours || 1);
                                                            return (
                                                                <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                                                                    <td className="p-4 font-mono font-bold text-slate-500">{log.date}</td>
                                                                    <td className="p-4">
                                                                        <p className="font-black text-slate-800 uppercase">{task?.name || log.taskId}</p>
                                                                        <p className="text-[9px] text-slate-400 font-bold">{log.notes || 'No variations recorded.'}</p>
                                                                    </td>
                                                                    <td className="p-4 text-center font-black text-slate-900">{log.outputValue} {task?.unit}</td>
                                                                    <td className="p-4 text-center font-black text-blue-600">{log.manHours}h</td>
                                                                    <td className="p-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-black text-[10px] text-slate-700">{actualIntensity.toFixed(2)}</span>
                                                                            <span className="text-[9px] text-slate-400 uppercase font-bold">{task?.unit}/hr</span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'parameters' && (
                                <div className="space-y-8 max-w-4xl">
                                    <div className="border-b border-slate-100 pb-6">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Project Engine Parameters</h3>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Fine-Tune Local Production Variables</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <section className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6 border-b border-blue-100 pb-2">Resource Utilization Rates</h4>
                                            <div className="space-y-6">
                                                {['general_labor', 'painter_labor', 'support_labor', 'admin_labor'].map(key => (
                                                    <div key={key} className="flex justify-between items-center group">
                                                        <span className="text-xs font-bold text-slate-600 uppercase">{key.replace('_', ' ')} (₦/day)</span>
                                                        <input 
                                                            type="number" 
                                                            value={selectedProject.costingVariables[key] || 0} 
                                                            onChange={e => handleUpdateParam(key, parseFloat(e.target.value))}
                                                            className="w-32 p-2.5 bg-white border border-slate-200 rounded-xl font-black text-right text-xs focus:ring-2 focus:ring-blue-500 shadow-sm"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                            <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-6 border-b border-amber-100 pb-2">Production Benchmarks</h4>
                                            <div className="space-y-6">
                                                {[
                                                    { key: 'fitting_hrs_per_meter', label: 'Fitting (Hrs/M)' },
                                                    { key: 'efficiencyRate', label: 'Global Efficiency %' },
                                                    { key: 'meters_per_cutting_disc', label: 'Disc Usage (M/Disc)' }
                                                ].map(param => (
                                                    <div key={param.key} className="flex justify-between items-center group">
                                                        <span className="text-xs font-bold text-slate-600 uppercase">{param.label}</span>
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            // FIX: Explicitly cast to number to avoid type union errors from WorkTeamSpec keys
                                                            value={(selectedProject.costingVariables[param.key] || (teamSpec as any)[param.key] || 0) as number} 
                                                            onChange={e => handleUpdateParam(param.key, parseFloat(e.target.value))}
                                                            className="w-32 p-2.5 bg-white border border-slate-200 rounded-xl font-black text-right text-xs focus:ring-2 focus:ring-amber-500 shadow-sm"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>

                                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex items-center justify-between shadow-2xl">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20"><Icon name="fas fa-sync" /></div>
                                            <div>
                                                <h5 className="font-black uppercase tracking-tight text-lg leading-none">Parameter Sync Ready</h5>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Changes applied immediately to project board logic</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'simulation' && (
                                <div className="space-y-8">
                                    <div className="border-b border-slate-100 pb-6 flex justify-between items-end">
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Lead Time Forecaster</h3>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Resource vs Complexity Analysis</p>
                                        </div>
                                        <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-xl shadow-blue-500/20">
                                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Estimated Effort</p>
                                            <p className="text-2xl font-black tracking-tighter">{analysis?.totalHours.toFixed(1)} <span className="text-sm">Man-Hours</span></p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Simplified Task List for Summary */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scope Decomposition</h4>
                                            {analysis?.tasks.map(task => (
                                                <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-blue-200 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-1.5 h-8 rounded-full bg-slate-100 group-hover:bg-blue-500 transition-colors"></div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-800 uppercase leading-none">{task.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold mt-1">Units: {task.qty} {task.unit}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-slate-700">{(task.standardMins / 60).toFixed(1)}h</p>
                                                        <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                            <div className="h-full bg-blue-500" style={{ width: `${(task.standardMins / (analysis.totalHours * 60)) * 100}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
                                            <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-8">Simulation Config</h4>
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-3">Welders</label>
                                                        <input type="number" value={teamSpec.welders} onChange={e => setTeamSpec({...teamSpec, welders: parseInt(e.target.value)})} className="w-full bg-slate-800 border-none rounded-2xl p-4 text-xl font-black text-blue-400 focus:ring-2 focus:ring-blue-500" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-3">Fitters</label>
                                                        <input type="number" value={teamSpec.fitters} onChange={e => setTeamSpec({...teamSpec, fitters: parseInt(e.target.value)})} className="w-full bg-slate-800 border-none rounded-2xl p-4 text-xl font-black text-blue-400 focus:ring-2 focus:ring-blue-500" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 text-center">Simulated Efficiency Bias</label>
                                                    <input type="range" min="0.1" max="1.5" step="0.05" value={teamSpec.efficiencyRate} onChange={e => setTeamSpec({...teamSpec, efficiencyRate: parseFloat(e.target.value)})} className="w-full accent-blue-500" />
                                                    <div className="flex justify-between mt-2 font-mono text-[10px] text-slate-400">
                                                        <span>CONSERVATIVE</span>
                                                        <span className="text-white font-black">{Math.round(teamSpec.efficiencyRate * 100)}%</span>
                                                        <span>OPTIMISTIC</span>
                                                    </div>
                                                </div>
                                                <div className="pt-8 mt-4 border-t border-slate-800">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase text-center mb-1">Theoretical Release Date</p>
                                                    <p className="text-3xl font-black text-center text-white tracking-tighter uppercase">
                                                        {analysis ? new Date(Date.now() + (analysis.totalHours / ((teamSpec.welders + teamSpec.fitters) * 8)) * 86400000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '--'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default WorkManager;