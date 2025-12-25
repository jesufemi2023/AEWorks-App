
import React, { useState, useEffect, useMemo } from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import * as db from '../../services/db';
import { Project, Contact, PayrollRun, PayrollRunItem, DisbursementItem } from '../../types';
import { useAppContext } from '../../hooks/useAppContext';

interface PayrollManagerProps {
    onBack: () => void;
    onNavigate?: (module: any) => void;
}

const DEFAULT_RATES = {
    payePerm: 12,
    payeCont: 5,
    staffPension: 7.5,
    companyPension: 15,
    medicals: 1,
    workmen: 1
};

const DAILY_RATE_DEFAULTS = {
    'Staff - Permanent': 12500,
    'Staff - Contract': 10000,
    'Sub Contractor': 15000,
};

const PayrollManager: React.FC<PayrollManagerProps> = ({ onBack, onNavigate }) => {
    const { currentUser, setCurrentUser, showNotification } = useAppContext();
    const [activeTab, setActiveTab] = useState<'run' | 'history' | 'approvals'>('run');
    
    const [staff, setStaff] = useState<Contact[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [payrollHistory, setPayrollHistory] = useState<PayrollRun[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    
    const [currentRun, setCurrentRun] = useState<PayrollRun>({
        id: db.generateId(),
        paymentDate: new Date().toISOString().split('T')[0],
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        status: 'Pending Approval',
        items: [],
        rates: { ...DEFAULT_RATES },
        totals: { gross: 0, net: 0, personnelCost: 0 },
        processedBy: currentUser?.username || 'Admin',
        savedAt: new Date().toISOString()
    });

    const [selectedHistoryRun, setSelectedHistoryRun] = useState<PayrollRun | null>(null);

    const refreshRegistry = () => {
        const rawContacts = db.getData<Contact>('contacts');
        const loadedStaff = rawContacts.filter(c => {
            const cat = c.category || '';
            return cat.startsWith('Staff') || cat === 'Sub Contractor';
        });

        const loadedProjects = db.getData<Project>('projects');
        const loadedHistory = db.getData<PayrollRun>('payrollRuns').sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        
        setStaff(loadedStaff);
        setProjects(loadedProjects);
        setPayrollHistory(loadedHistory);
        setIsLoaded(true);
    };

    useEffect(() => {
        refreshRegistry();
    }, []);

    const calculateItemFinancials = (item: PayrollRunItem, rates: typeof DEFAULT_RATES) => {
        const grossPay = item.disbursements.reduce((sum, d) => sum + d.amount, 0);
        
        const isPerm = item.category === 'Staff - Permanent';
        const paye = grossPay * ((isPerm ? rates.payePerm : rates.payeCont) / 100);
        const staffPension = isPerm ? (grossPay * (rates.staffPension / 100)) : 0;
        const companyPension = grossPay * (rates.companyPension / 100);
        const medicals = grossPay * (rates.medicals / 100);
        const workmen = grossPay * (rates.workmen / 100);

        const totalDeductions = paye + staffPension + medicals + workmen + (item.iou || 0);
        const netPay = grossPay - totalDeductions;
        const personnelCost = grossPay + companyPension;

        return {
            ...item,
            grossPay,
            netPay,
            deductions: { paye, staffPension, companyPension, medicals, workmen }
        };
    };

    const updateRunTotals = (items: PayrollRunItem[]) => {
        const gross = items.reduce((sum, i) => sum + i.grossPay, 0);
        const net = items.reduce((sum, i) => sum + i.netPay, 0);
        const personnelCost = items.reduce((sum, i) => sum + (i.grossPay + i.deductions.companyPension), 0);
        
        return { gross, net, personnelCost };
    };

    const getAutoDescription = (type: string, projectName?: string) => {
        const monthName = new Date().toLocaleString('default', { month: 'long' });
        if (type === 'Salary') return `${monthName} Monthly Salary`;
        if (projectName) return `${monthName} ${projectName} Payment`;
        return `${monthName} Payment`;
    };

    const createInitialRunItem = (person: Contact): PayrollRunItem => {
        const defaultRate = DAILY_RATE_DEFAULTS[person.category as keyof typeof DAILY_RATE_DEFAULTS] || 5000;
        const isSub = person.category === 'Sub Contractor';
        
        return {
            id: db.generateId(),
            staffId: person.id,
            staffName: person.name,
            category: person.category,
            disbursements: [{
                id: db.generateId(),
                type: isSub ? 'Contract %' : 'Salary',
                description: getAutoDescription(isSub ? 'Contract %' : 'Salary'),
                rate: defaultRate,
                units: isSub ? 0 : 22,
                amount: isSub ? 0 : (defaultRate * 22)
            }],
            iou: 0,
            grossPay: 0,
            netPay: 0,
            deductions: { paye: 0, staffPension: 0, companyPension: 0, medicals: 0, workmen: 0 }
        };
    };

    const handleAddStaffToRun = (person: Contact) => {
        if (currentRun.items.some(i => i.staffId === person.id)) {
            showNotification(`${person.name} already in batch.`, 'warning');
            return;
        }
        const newItem = createInitialRunItem(person);
        const processedItem = calculateItemFinancials(newItem, currentRun.rates);
        const newItems = [...currentRun.items, processedItem];
        setCurrentRun({ ...currentRun, items: newItems, totals: updateRunTotals(newItems) });
    };

    const handleSyncAllStaff = () => {
        const newItems: PayrollRunItem[] = [];
        staff.forEach(person => {
            if (!currentRun.items.some(i => i.staffId === person.id)) {
                const item = createInitialRunItem(person);
                newItems.push(calculateItemFinancials(item, currentRun.rates));
            }
        });

        if (newItems.length === 0) {
            showNotification("Payroll registry is already fully synchronized.", "success");
            return;
        }

        const updatedItems = [...currentRun.items, ...newItems];
        setCurrentRun({ ...currentRun, items: updatedItems, totals: updateRunTotals(updatedItems) });
        showNotification(`Synchronized ${newItems.length} personnel.`, 'success');
    };

    const handleUpdateDisbursement = (runItemId: string, disbId: string, field: keyof DisbursementItem, value: any) => {
        const newItems = currentRun.items.map(item => {
            if (item.id !== runItemId) return item;
            
            const newDisbs = item.disbursements.map(d => {
                if (d.id !== disbId) return d;
                const updated = { ...d, [field]: value };
                
                if (field === 'rate' || field === 'units' || field === 'type') {
                    if (updated.type === 'Contract %') {
                        updated.amount = (updated.rate || 0) * ((updated.units || 0) / 100);
                    } else if (updated.type === 'Lump Sum') {
                        updated.amount = updated.rate;
                    } else {
                        updated.amount = (updated.rate || 0) * (updated.units || 0);
                    }
                }

                if (field === 'refId') {
                    const p = projects.find(proj => proj.projectCode === value);
                    updated.description = getAutoDescription(updated.type, p?.projName);
                    if (updated.type === 'Contract %' && updated.rate === 0) {
                        updated.rate = p?.trackingData?.projectValue || 0;
                        updated.amount = updated.rate * (updated.units / 100);
                    }
                }
                return updated;
            });

            return calculateItemFinancials({ ...item, disbursements: newDisbs }, currentRun.rates);
        });

        setCurrentRun({ ...currentRun, items: newItems, totals: updateRunTotals(newItems) });
    };

    const handleAddDisbursementRow = (runItemId: string) => {
        const newItems = currentRun.items.map(item => {
            if (item.id !== runItemId) return item;
            const newDisb: DisbursementItem = {
                id: db.generateId(),
                type: 'Lump Sum',
                description: getAutoDescription('Lump Sum'),
                rate: 0,
                units: 1,
                amount: 0
            };
            return { ...item, disbursements: [...item.disbursements, newDisb] };
        });
        setCurrentRun({ ...currentRun, items: newItems });
    };

    const handleRemoveStaff = (runItemId: string) => {
        const newItems = currentRun.items.filter(i => i.id !== runItemId);
        setCurrentRun({ ...currentRun, items: newItems, totals: updateRunTotals(newItems) });
    };

    const handleSaveRun = () => {
        if (currentRun.items.length === 0) {
            showNotification("Batch contains no disbursements.", "error");
            return;
        }
        const runToSave = { ...currentRun, savedAt: new Date().toISOString() };
        const newHistory = [runToSave, ...payrollHistory];
        db.saveData('payrollRuns', newHistory);
        setPayrollHistory(newHistory);
        showNotification(`Batch [${currentRun.month}] submitted for approval.`, 'success');
        setCurrentRun({
            ...currentRun,
            id: db.generateId(),
            items: [],
            totals: { gross: 0, net: 0, personnelCost: 0 }
        });
    };

    const handleApproveRun = (runId: string) => {
        const history = db.getData<PayrollRun>('payrollRuns');
        const updated = history.map(r => r.id === runId ? { ...r, status: 'Approved' as const, approvedBy: currentUser?.username } : r);
        db.saveData('payrollRuns', updated);
        setPayrollHistory(updated.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
        showNotification("Payroll approved successfully.");
    };

    const handleDeleteRun = (runId: string) => {
        if (window.confirm("Permanently delete this payroll record from archives?")) {
            const history = db.getData<PayrollRun>('payrollRuns');
            const updated = history.filter(r => r.id !== runId);
            db.saveData('payrollRuns', updated);
            setPayrollHistory(updated.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
            showNotification("Payroll record removed.");
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
    };

    const formatN = (v: number) => `₦${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    const PrintPayslip = ({ run }: { run: PayrollRun }) => (
        <div className="fixed inset-0 bg-white z-[100] overflow-y-auto p-8 font-sans print:p-0">
             <div className="max-w-4xl mx-auto space-y-12">
                <div className="flex justify-between items-center print:hidden mb-8 border-b pb-4">
                    <Button onClick={() => setSelectedHistoryRun(null)} variant="outline" icon="fas fa-times">Close Slips View</Button>
                    <div className="flex gap-2">
                        <Button onClick={() => window.print()} variant="primary" icon="fas fa-print">Authorized Print All</Button>
                    </div>
                </div>
                
                {run.items.map(item => (
                    <div key={item.id} className="grid grid-cols-2 gap-4 border-2 border-slate-900 p-6 rounded-xl page-break-after-always">
                        <div className="border-r border-slate-200 pr-4 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-black uppercase tracking-tighter">AEWorks Ltd</h2>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Office Voucher: Accounting</p>
                                    </div>
                                    <div className="text-right text-[9px] font-mono opacity-60">
                                        <p>REF: {run.id.substring(0,8).toUpperCase()}</p>
                                        <p>{run.paymentDate}</p>
                                    </div>
                                </div>
                                <div className="mb-4 bg-slate-900 text-white p-3 rounded-lg shadow-inner">
                                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Beneficiary</p>
                                    <h3 className="font-black text-sm uppercase tracking-tight">{item.staffName}</h3>
                                    <p className="text-[10px] font-bold opacity-60">{item.category}</p>
                                </div>
                                <table className="w-full text-[9px] mb-4">
                                    <thead className="border-b border-slate-900">
                                        <tr className="uppercase font-black text-slate-400"><th className="text-left pb-1">Particulars</th><th className="text-right pb-1">Units</th><th className="text-right pb-1">Total</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {item.disbursements.map(d => (
                                            <tr key={d.id} className="text-slate-700">
                                                <td className="py-1.5 font-bold uppercase">{d.description || (d.type === 'Salary' ? 'Basic Salary' : 'Custom Job')}</td>
                                                <td className="text-right py-1.5 font-mono">
                                                    {d.type === 'Salary' ? `${d.units}d` : d.type === 'Contract %' ? `${d.units}%` : '1unit'}
                                                </td>
                                                <td className="text-right py-1.5 font-black">{formatN(d.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 mb-4 text-[9px]">
                                    <div>
                                        <span className="block opacity-50 uppercase font-black">Gross Accrual</span>
                                        <span className="font-black text-slate-900">{formatN(item.grossPay)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block opacity-50 uppercase font-black">Total Offsets</span>
                                        <span className="font-black text-red-600">-{formatN(item.grossPay - item.netPay)}</span>
                                    </div>
                                </div>
                                <div className="pt-6 flex justify-between items-end">
                                    <div className="w-32 text-center">
                                        <div className="h-px bg-slate-900 mb-1"></div>
                                        <p className="text-[8px] uppercase font-black">Authorized By</p>
                                        <p className="text-[7px] font-bold text-slate-400">{run.approvedBy || 'PENDING'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-black text-blue-700">Final Disbursement</p>
                                        <p className="text-xl font-black text-slate-900">{formatN(item.netPay)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pl-4 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-black uppercase tracking-tighter text-blue-600">AEWorks Ltd</h2>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pay Advice: Personnel Copy</p>
                                    </div>
                                    <div className="text-right text-[10px] font-mono text-slate-400">
                                        <p>{run.month}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-1.5 text-[9px] text-slate-600 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1 mb-2">Earnings Breakdown</p>
                                    {item.disbursements.map(d => (
                                        <div key={d.id} className="flex justify-between">
                                            <span>{d.description || d.type}:</span>
                                            <span className="font-bold">{formatN(d.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-1 border-t border-slate-200 font-black text-slate-900">
                                        <span>Total Earnings:</span>
                                        <span>{formatN(item.grossPay)}</span>
                                    </div>
                                </div>

                                <div className="space-y-1 text-[9px] text-slate-500 mb-6">
                                    <p className="font-black text-slate-400 uppercase tracking-widest mb-1">Statutory Deductions</p>
                                    <div className="flex justify-between"><span>Income Tax (PAYE):</span><span className="font-bold text-red-600">-{formatN(item.deductions.paye)}</span></div>
                                    <div className="flex justify-between"><span>Staff Pension (7.5%):</span><span className="font-bold text-red-600">-{formatN(item.deductions.staffPension)}</span></div>
                                    <div className="flex justify-between"><span>Health Insurance:</span><span className="font-bold text-red-600">-{formatN(item.deductions.medicals)}</span></div>
                                    <div className="flex justify-between"><span>Liability Cover:</span><span className="font-bold text-red-600">-{formatN(item.deductions.workmen)}</span></div>
                                    {item.iou > 0 && <div className="flex justify-between font-black text-red-700 bg-red-50 p-1 mt-1 rounded"><span>IOU / Advance Repayment:</span><span>-{formatN(item.iou)}</span></div>}
                                </div>
                            </div>
                            <div className="bg-slate-900 text-white p-6 rounded-2xl text-center shadow-xl">
                                <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mb-1">Net Payable Amount</p>
                                <h3 className="text-3xl font-black text-blue-400">{formatN(item.netPay)}</h3>
                            </div>
                        </div>
                    </div>
                ))}
             </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-slate-100 font-sans">
            <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg shrink-0">
                <div className="flex items-center gap-4">
                    <Button onClick={onBack} size="sm" variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                        <Icon name="fas fa-arrow-left" /> Dashboard
                    </Button>
                    <h2 className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter">
                        <Icon name="fas fa-file-invoice-dollar" className="text-amber-400"/> 
                        AEWorks Payroll Manager
                    </h2>
                </div>
                <div className="flex gap-2">
                    {currentUser?.role === 'admin' && (
                        <button 
                            onClick={() => setActiveTab('approvals')} 
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'approvals' ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                            <Icon name="fas fa-gavel" className="mr-2"/> Master Approvals
                        </button>
                    )}
                    <button 
                        onClick={handleLogout} 
                        className="bg-red-600/20 text-red-500 p-2 px-3 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase"
                    >
                        <Icon name="fas fa-power-off" />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </header>

            <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-100">
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                            <button onClick={() => setActiveTab('run')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'run' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>New Batch</button>
                            <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'history' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>History</button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 space-y-6">
                        {activeTab === 'run' && isLoaded && (
                            <>
                                {staff.length > 0 ? (
                                    <>
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Batch Identity</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Payment Date</label>
                                                    <input type="date" value={currentRun.paymentDate} onChange={e => setCurrentRun({...currentRun, paymentDate: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-black bg-slate-50 focus:bg-white outline-none"/>
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Period Descriptor</label>
                                                    <input type="text" value={currentRun.month} onChange={e => setCurrentRun({...currentRun, month: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-black bg-slate-50 focus:bg-white outline-none"/>
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <Button onClick={handleSyncAllStaff} variant="primary" icon="fas fa-users-cog" size="sm" className="w-full py-3 text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/10">Bulk Auto-Fill Staff</Button>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 border-t border-slate-100 pt-4">Manual Selection</h4>
                                            <div className="space-y-1 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                                                {staff.map(person => {
                                                    const inBatch = currentRun.items.some(i => i.staffId === person.id);
                                                    return (
                                                        <button 
                                                            key={person.id}
                                                            onClick={() => handleAddStaffToRun(person)}
                                                            disabled={inBatch}
                                                            className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center group ${inBatch ? 'bg-slate-50 border-slate-100 opacity-40 cursor-default' : 'bg-white border-slate-100 hover:bg-blue-50 hover:border-blue-200'}`}
                                                        >
                                                            <div>
                                                                <p className={`text-xs font-black uppercase tracking-tight ${inBatch ? 'text-slate-400' : 'text-slate-800'}`}>{person.name}</p>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{person.category}</p>
                                                            </div>
                                                            {!inBatch && <Icon name="fas fa-plus-circle" className="text-slate-200 group-hover:text-blue-500 transition-colors"/>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-12 px-4 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                                            <Icon name="fas fa-user-slash" className="text-2xl" />
                                        </div>
                                        <h4 className="font-black text-sm uppercase text-slate-900 mb-2">Registry Empty</h4>
                                        <Button onClick={() => onNavigate && onNavigate('project-board')} variant="primary" size="sm" icon="fas fa-address-card" className="w-full text-[10px] uppercase">Personnel Vault</Button>
                                    </div>
                                )}
                            </>
                        )}

                        {(activeTab === 'history' || activeTab === 'approvals') && (
                            <div className="space-y-3">
                                {payrollHistory
                                    .filter(run => activeTab === 'history' || run.status === 'Pending Approval')
                                    .map(run => (
                                    <div key={run.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${run.status === 'Approved' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>{run.status}</span>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => setSelectedHistoryRun(run)} className="text-[10px] font-black uppercase text-blue-600">Export</button>
                                                <button onClick={() => handleDeleteRun(run.id)} className="text-[10px] font-black uppercase text-red-500">Delete</button>
                                            </div>
                                        </div>
                                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{run.month}</p>
                                        <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-[10px] font-mono">
                                            <span className="text-slate-400">Net Disbursement:</span>
                                            <span className="font-black text-blue-700">{formatN(run.totals.net)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {activeTab === 'run' && (
                        <div className="p-4 bg-slate-900 text-white shrink-0">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Calculated Net</span>
                                <span className="text-xl font-black text-blue-400">{formatN(currentRun.totals.net)}</span>
                            </div>
                            <Button onClick={handleSaveRun} variant="primary" icon="fas fa-upload" className="w-full py-4 text-[10px] uppercase shadow-2xl shadow-blue-500/20">Submit for Approval</Button>
                        </div>
                    )}
                </div>

                <main className="flex-grow overflow-auto p-4 md:p-8 bg-slate-50">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {activeTab === 'approvals' ? (
                            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
                                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter">Master Approval Ledger</h3>
                                        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Awaiting Executive Authorization</p>
                                    </div>
                                    <Icon name="fas fa-shield-alt" className="text-4xl text-amber-500 opacity-50"/>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                                <th className="p-4">Batch ID</th>
                                                <th className="p-4">Period</th>
                                                <th className="p-4 text-center">Staff Count</th>
                                                <th className="p-4 text-right">Total Gross</th>
                                                <th className="p-4 text-right">Total Net Payout</th>
                                                <th className="p-4 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {payrollHistory.filter(r => r.status === 'Pending Approval').length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-slate-400">
                                                        <Icon name="fas fa-check-double" className="text-4xl mb-3 opacity-20"/>
                                                        <p className="font-bold uppercase tracking-widest text-xs">No batches pending approval.</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                payrollHistory.filter(r => r.status === 'Pending Approval').map(run => (
                                                    <tr key={run.id} className="hover:bg-blue-50/50 transition-colors">
                                                        <td className="p-4 font-mono text-[11px] font-bold text-slate-400">#{run.id.substring(0,8).toUpperCase()}</td>
                                                        <td className="p-4 font-black text-slate-800">{run.month}</td>
                                                        <td className="p-4 text-center"><span className="bg-slate-100 px-2 py-1 rounded-lg text-xs font-bold">{run.items.length}</span></td>
                                                        <td className="p-4 text-right font-bold text-slate-600">{formatN(run.totals.gross)}</td>
                                                        <td className="p-4 text-right font-black text-blue-700">{formatN(run.totals.net)}</td>
                                                        <td className="p-4 text-center">
                                                            <div className="flex gap-2 justify-center">
                                                                <button onClick={() => setSelectedHistoryRun(run)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase hover:bg-slate-200 transition-all">Review</button>
                                                                <button onClick={() => handleApproveRun(run.id)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all">Approve</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : currentRun.items.length === 0 ? (
                            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 py-32 flex flex-col items-center justify-center text-slate-300">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                    <Icon name="fas fa-file-invoice-dollar" className="text-4xl opacity-20"/>
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter">Initialize Payroll Batch</h3>
                                <p className="text-sm max-w-xs text-center mt-2 font-bold text-slate-400">Synchronize the staff registry to generate payouts with pre-configured daily rates and statutory logic.</p>
                            </div>
                        ) : (
                            currentRun.items.map((item) => (
                                <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
                                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-lg shadow-lg rotate-3">{item.staffName.charAt(0)}</div>
                                            <div>
                                                <h4 className="font-black text-sm uppercase tracking-tight">{item.staffName}</h4>
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.category}</span>
                                                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Net: {formatN(item.netPay)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveStaff(item.id)} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-red-500 hover:text-white transition-all"><Icon name="fas fa-times"/></button>
                                    </div>

                                    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Earnings Schedule</h5>
                                                <button onClick={() => handleAddDisbursementRow(item.id)} className="text-[10px] font-black text-blue-600 uppercase hover:underline">+ Add Entry</button>
                                            </div>
                                            <div className="space-y-3">
                                                {item.disbursements.map((d) => (
                                                    <div key={d.id} className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
                                                        <div className="flex-grow min-w-[200px]">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1 block">Pay Category / Project</label>
                                                            <div className="flex gap-2">
                                                                <select value={d.type} onChange={e => handleUpdateDisbursement(item.id, d.id, 'type', e.target.value)} className="p-2.5 border border-slate-200 rounded-xl text-xs font-black w-1/3 bg-white outline-none">
                                                                    <option value="Salary">Monthly Salary</option>
                                                                    <option value="Contract %">Project Contract (%)</option>
                                                                    <option value="Lump Sum">Lump Sum Payment</option>
                                                                </select>
                                                                <select value={d.refId} onChange={e => handleUpdateDisbursement(item.id, d.id, 'refId', e.target.value)} className="p-2.5 border border-slate-200 rounded-xl text-xs font-black flex-grow bg-white outline-none">
                                                                    <option value="">-- Optional Project Link --</option>
                                                                    {projects.map(p => <option key={p.projectCode} value={p.projectCode}>{p.projectCode} - {p.projName}</option>)}
                                                                </select>
                                                            </div>
                                                            <input 
                                                                type="text" 
                                                                value={d.description} 
                                                                onChange={e => handleUpdateDisbursement(item.id, d.id, 'description', e.target.value)} 
                                                                className="w-full mt-2 p-2 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600"
                                                                placeholder="Line item description"
                                                            />
                                                        </div>
                                                        <div className="w-24">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1 block">
                                                                {d.type === 'Salary' ? 'Work Days' : d.type === 'Contract %' ? '% Done' : 'Qty'}
                                                            </label>
                                                            <input type="number" disabled={d.type === 'Lump Sum'} value={d.units} onChange={e => handleUpdateDisbursement(item.id, d.id, 'units', +e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono font-black text-center bg-white disabled:opacity-30"/>
                                                        </div>
                                                        <div className="w-32">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1 block">
                                                                {d.type === 'Salary' ? 'Daily Rate' : d.type === 'Contract %' ? 'Project Value' : 'Total Amount'}
                                                            </label>
                                                            <input type="number" value={d.rate} onChange={e => handleUpdateDisbursement(item.id, d.id, 'rate', +e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono font-black text-right bg-white"/>
                                                        </div>
                                                        <div className="w-32 bg-white p-2.5 rounded-xl border border-slate-200 text-right">
                                                            <p className="text-[8px] font-black text-slate-300 uppercase">Sub-Total</p>
                                                            <p className="text-xs font-black text-slate-800">{formatN(d.amount)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-slate-950 text-white p-6 rounded-3xl space-y-4 shadow-xl">
                                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-3 mb-4">Statutory Deductions</h5>
                                            <div className="space-y-3 text-[11px] font-bold">
                                                <div className="flex justify-between"><span>Income Tax (PAYE):</span><span className="text-red-400">-{formatN(item.deductions.paye)}</span></div>
                                                <div className="flex justify-between"><span>Staff Pension:</span><span className="text-red-400">-{formatN(item.deductions.staffPension)}</span></div>
                                                <div className="flex justify-between"><span>Liability/Insurance:</span><span className="text-red-400">-{formatN(item.deductions.medicals + item.deductions.workmen)}</span></div>
                                                <div className="pt-4 mt-2 border-t border-slate-800">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1 block mb-1">Staff Loan Repayment (IOU)</label>
                                                    <input 
                                                        type="number" 
                                                        value={item.iou} 
                                                        onChange={e => {
                                                            const newItems = currentRun.items.map(i => i.id === item.id ? calculateItemFinancials({...i, iou: +e.target.value}, currentRun.rates) : i);
                                                            setCurrentRun({...currentRun, items: newItems, totals: updateRunTotals(newItems)});
                                                        }}
                                                        className="w-full p-3 border border-slate-800 rounded-xl text-xs font-black text-red-400 bg-slate-900 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </div>

            {selectedHistoryRun && <PrintPayslip run={selectedHistoryRun} />}
        </div>
    );
};

export default PayrollManager;
