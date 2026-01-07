
import React, { useEffect, useCallback, useRef, useState } from 'react';
import TabContent from './TabContent';
import { useProjectContext } from '../../hooks/useProjectContext';
import { NIGERIAN_CITIES, STATUS_STAGES } from '../../constants';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { useAppContext } from '../../hooks/useAppContext';
import { Project, Job, ManualValuationItem } from '../../types';
import * as db from '../../services/db';

const ProjectSpecTab: React.FC = () => {
    const { currentProject, setCurrentProject, clients, contacts, centres, projects } = useProjectContext();
    const { showNotification } = useAppContext();
    const [isHosting, setIsHosting] = useState(false);
    const [isNewCustomerMode, setIsNewCustomerMode] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        
        if (id === 'clientName') {
            if (value === 'ADD_NEW') {
                setIsNewCustomerMode(true);
                setCurrentProject(prev => ({
                    ...prev,
                    clientName: '',
                    clientMgr: '',
                    clientPhone: '',
                    clientEmail: '',
                    clientAddr: '',
                    destCitySelect: '',
                    destCoords: ''
                }));
                return;
            } else if (e.target.tagName === 'SELECT') {
                setIsNewCustomerMode(false);
            }
        }
        
        setCurrentProject(prev => ({ ...prev, [id]: value }));
    };

    const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setCurrentProject(prev => ({...prev, [id]: value === '' ? 0 : parseInt(value, 10) }));
    }

    useEffect(() => {
        if (isNewCustomerMode) return;
        const selectedClient = clients.find(c => c.name === currentProject.clientName);
        if (selectedClient) {
            setCurrentProject(prev => ({
                ...prev,
                clientMgr: selectedClient.mgr,
                clientPhone: selectedClient.phone,
                clientEmail: selectedClient.email,
                clientAddr: selectedClient.address,
                destCitySelect: selectedClient.destination,
            }));
            const city = NIGERIAN_CITIES.find(c => c.name === selectedClient.destination);
            if(city) setCurrentProject(prev => ({...prev, destCoords: city.coords}));
        }
    }, [currentProject.clientName, clients, setCurrentProject, isNewCustomerMode]);

    useEffect(() => {
        const selectedContact = contacts.find(c => c.name === currentProject.projMgr);
        if (selectedContact) {
            setCurrentProject(prev => ({
                ...prev,
                mgrPhone: selectedContact.phone1,
                mgrEmail: selectedContact.email1,
            }));
        }
    }, [currentProject.projMgr, contacts, setCurrentProject]);

    useEffect(() => {
        const selectedCentre = centres.find(c => c.name === currentProject.prodCentre);
        if (selectedCentre) {
            setCurrentProject(prev => ({ ...prev, prodCoords: selectedCentre.coords }));
        }
    }, [currentProject.prodCentre, centres, setCurrentProject]);
    
    const handleAddJob = () => {
        const newJob: Job = {
            id: db.generateId(),
            name: `New Job ${currentProject.jobs.length + 1}`,
            framingTakeOff: [],
            finishesTakeOff: []
        };
        setCurrentProject(prev => ({ ...prev, jobs: [...prev.jobs, newJob] }));
    };

    const handleUpdateJobName = (id: string, name: string) => {
        setCurrentProject(prev => ({
            ...prev,
            jobs: prev.jobs.map(j => j.id === id ? { ...j, name } : j)
        }));
    };

    const handleDeleteJob = (id: string) => {
        if (currentProject.jobs.length <= 1) {
            showNotification("A project must have at least one job.", "error");
            return;
        }
        if (confirm("Delete this job and all its material lists?")) {
            setCurrentProject(prev => ({
                ...prev,
                jobs: prev.jobs.filter(j => j.id !== id)
            }));
        }
    };

    const handleToggleManualValuation = () => {
        const newState = !currentProject.useManualValuation;
        setCurrentProject(prev => ({
            ...prev,
            useManualValuation: newState,
            manualItems: newState ? (prev.manualItems?.length ? prev.manualItems : [{ id: db.generateId(), scope: 'Base Contract Value', amount: 0 }]) : prev.manualItems
        }));
        showNotification(newState ? "Manual Valuation Mode Active" : "Automatic Costing Active", "warning");
    };

    const handleAddManualItem = () => {
        const newItem: ManualValuationItem = {
            id: db.generateId(),
            scope: '',
            amount: 0
        };
        setCurrentProject(prev => ({
            ...prev,
            manualItems: [...(prev.manualItems || []), newItem]
        }));
    };

    const handleUpdateManualItem = (id: string, field: keyof ManualValuationItem, value: any) => {
        setCurrentProject(prev => ({
            ...prev,
            manualItems: prev.manualItems?.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const handleDeleteManualItem = (id: string) => {
        setCurrentProject(prev => ({
            ...prev,
            manualItems: prev.manualItems?.filter(item => item.id !== id)
        }));
    };

    const renderInputRow = (label: string, id: keyof typeof currentProject, type = 'text', options?: {value: string, label: string}[], readOnly = false) => {
        if (id === 'clientName') {
            return (
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 py-1 border-b border-slate-50 last:border-0">
                    <label htmlFor={id.toString()} className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest md:w-1/3 shrink-0">{label}</label>
                    <div className="md:w-2/3 w-full flex gap-1">
                        {isNewCustomerMode ? (
                            <div className="relative w-full">
                                <input type="text" id="clientName" placeholder="New Customer..." value={currentProject.clientName} onChange={handleChange} autoFocus className="w-full p-1 border border-blue-400 rounded bg-white text-xs font-bold" />
                                <button onClick={() => setIsNewCustomerMode(false)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><Icon name="fas fa-undo-alt" className="text-[10px]"/></button>
                            </div>
                        ) : (
                            <select id={id.toString()} value={currentProject[id] as string} onChange={handleChange} className="w-full p-1 border border-slate-200 rounded text-xs font-bold">
                                <option value="">-- Customer --</option>
                                <option value="ADD_NEW" className="text-blue-600 font-black">+ ADD NEW</option>
                                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        )}
                    </div>
                </div>
            );
        }
        return (
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 py-1 border-b border-slate-50 last:border-0">
                <label htmlFor={id.toString()} className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest md:w-1/3 shrink-0">{label}</label>
                <div className="md:w-2/3 w-full">
                    {type === 'select' ? (
                        <select id={id.toString()} value={currentProject[id] as string} onChange={handleChange} className="w-full p-1 border border-slate-200 rounded text-xs font-bold">
                            <option value="">-- Select --</option>
                            {options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    ) : (
                        <input type={type} id={id.toString()} value={(currentProject[id] as string | number | undefined) ?? ''} onChange={type==='number' ? handleNumericChange : handleChange} readOnly={readOnly} className={`w-full p-1 border border-slate-200 rounded text-xs font-bold ${readOnly ? 'bg-slate-100 font-mono opacity-60' : 'bg-slate-50'}`} />
                    )}
                </div>
            </div>
        );
    }

    return (
        <TabContent title="Specs" icon="fas fa-cogs">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 space-y-4">
                    {/* Basic Info Section */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest border-b pb-1">Administrative Details</h4>
                        <div className="space-y-0.5">
                            {renderInputRow("Project Name", "projName")}
                            <div className="grid grid-cols-1 md:grid-cols-3 md:gap-2">
                                {renderInputRow("Jobs/Yr", "jobsThisYear", "number")}
                                {renderInputRow("Year", "year", "number")}
                                {renderInputRow("Deadline", "deadline", "date")}
                            </div>
                            {renderInputRow("Project Code", "projectCode", "text", [], true)}
                            {renderInputRow("Current Stage", "projectStatus", "select", STATUS_STAGES.map(s => ({ value: s.value.toString(), label: s.name })))}
                        </div>
                    </div>

                    {/* Financial Overrides Section */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 border-l-4 border-l-blue-600">
                        <div className="flex justify-between items-center mb-3 border-b pb-1">
                            <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Financial Overrides</h4>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Manual Valuation</span>
                                <button 
                                    onClick={handleToggleManualValuation}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${currentProject.useManualValuation ? 'bg-blue-600' : 'bg-slate-200'}`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${currentProject.useManualValuation ? 'left-[22px]' : 'left-0.5'}`}></div>
                                </button>
                            </div>
                        </div>

                        {currentProject.useManualValuation ? (
                            <div className="space-y-2 animate-fade-in">
                                <div className="bg-blue-50 p-2 rounded text-[10px] text-blue-700 font-bold mb-2 flex items-center gap-2">
                                    <Icon name="fas fa-info-circle" />
                                    Manual Mode active: The values below will be used for Invoicing instead of calculated costs.
                                </div>
                                <div className="space-y-1">
                                    {currentProject.manualItems?.map((item, index) => (
                                        <div key={item.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100 group">
                                            <div className="w-6 h-6 flex items-center justify-center bg-slate-800 text-white rounded text-[10px] font-bold shrink-0">{index + 1}</div>
                                            <input 
                                                type="text" 
                                                value={item.scope} 
                                                onChange={(e) => handleUpdateManualItem(item.id, 'scope', e.target.value)}
                                                className="flex-grow bg-white border border-slate-200 p-1 rounded text-xs font-bold text-slate-800"
                                                placeholder="Scope Description (e.g. Design & Install)..."
                                            />
                                            <div className="relative w-32 shrink-0">
                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">₦</span>
                                                <input 
                                                    type="number" 
                                                    value={item.amount || ''} 
                                                    onChange={(e) => handleUpdateManualItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                                                    className="w-full pl-5 p-1 border border-slate-200 rounded text-xs font-black text-right text-blue-600"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <button onClick={() => handleDeleteManualItem(item.id)} className="text-slate-300 hover:text-red-500 p-1 transition-all shrink-0"><Icon name="fas fa-trash-alt" className="text-xs"/></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end mt-2">
                                    <Button onClick={handleAddManualItem} variant="outline" size="sm" className="py-1 px-3 text-[9px]" icon="fas fa-plus">Add Scope Item</Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[10px] text-slate-400 italic">Project is currently using the automated material/labor costing engine.</p>
                        )}
                    </div>

                    {/* Job Management Section */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                        <div className="flex justify-between items-center mb-3 border-b pb-1">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Project Structure / Sub-Jobs</h4>
                            <Button onClick={handleAddJob} variant="primary" size="sm" icon="fas fa-plus" className="py-1 px-2 text-[9px]">Add Sub-Job</Button>
                        </div>
                        <div className="space-y-2">
                            {currentProject.jobs.map((job, index) => (
                                <div key={job.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100 group">
                                    <div className="w-6 h-6 flex items-center justify-center bg-slate-800 text-white rounded text-[10px] font-bold">{index + 1}</div>
                                    <input 
                                        type="text" 
                                        value={job.name} 
                                        onChange={(e) => handleUpdateJobName(job.id, e.target.value)}
                                        className="flex-grow bg-transparent border-none focus:ring-0 font-bold text-sm text-slate-800"
                                        placeholder="Job Description..."
                                    />
                                    <div className="text-[10px] text-slate-400 font-mono px-2 hidden sm:block">Items: {job.framingTakeOff.length + job.finishesTakeOff.length}</div>
                                    <button onClick={() => handleDeleteJob(job.id)} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"><Icon name="fas fa-trash-alt"/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Customer Info Section */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest border-b pb-1">Customer & Logistics</h4>
                        <div className="space-y-0.5">
                            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-4">
                                {renderInputRow("Facility", "prodCentre", "select", centres.map(c => ({ value: c.name, label: c.name })))}
                                {renderInputRow("Customer", "clientName")}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-4">
                                {renderInputRow("Manager", "clientMgr")}
                                {renderInputRow("Destination", "destCitySelect", "select", NIGERIAN_CITIES.map(c => ({ value: c.name, label: c.name })))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-4">
                                {renderInputRow("Phone", "clientPhone")}
                                {renderInputRow("Email", "clientEmail", "email")}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-lg text-white">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] mb-3 opacity-60">System Context</h4>
                        <div className="space-y-2">
                             {renderInputRow("Project Lead", "projMgr", "select", contacts.map(c => ({ value: c.name, label: c.name })))}
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-700 flex flex-col gap-2">
                             <Button onClick={() => window.print()} variant="outline" size="sm" className="w-full border-slate-700 text-[10px]" icon="fas fa-print">Quick Print Page</Button>
                        </div>
                    </div>
                </div>
            </div>
        </TabContent>
    );
};

export default ProjectSpecTab;
