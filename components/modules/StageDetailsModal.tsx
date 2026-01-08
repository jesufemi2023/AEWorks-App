
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { Project, ProjectTrackingData, CustomerFeedback, WorkerEvaluation, Contact } from '../../types';
import { calculateProjectCost } from '../../services/costingService';
import { useProjectContext } from '../../hooks/useProjectContext';
import { useAppContext } from '../../hooks/useAppContext';
import * as db from '../../services/db';

interface StageDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    onSave: (updatedProject: Project) => void;
}

const StageDetailsModal: React.FC<StageDetailsModalProps> = ({ isOpen, onClose, project, onSave }) => {
    const { framingMaterials, finishMaterials, contacts, setContacts } = useProjectContext();
    const { currentUser, showNotification } = useAppContext();
    const [formData, setFormData] = useState<ProjectTrackingData>({});
    const [verificationToken, setVerificationToken] = useState('');
    const [workerRatings, setWorkerRatings] = useState<Record<string, number>>({});
    const [showVerificationInput, setShowVerificationInput] = useState(false);
    
    // Derived data for auto-filling
    const [autoData, setAutoData] = useState({
        calculatedCost: 0,
        calculatedVolume: 0,
        partCountEstimate: 0
    });

    useEffect(() => {
        if (project) {
            setFormData(project.trackingData || {});
            
            const costs = calculateProjectCost(project, framingMaterials, finishMaterials);
            const vol = (project.shippingLength || 0) * (project.shippingWidth || 0) * (project.shippingHeight || 0);
            const parts = project.jobs.reduce((acc, job) => acc + job.framingTakeOff.reduce((jAcc, item) => jAcc + (item.qty || 0), 0), 0);
            
            setAutoData({
                calculatedCost: costs.salesPrice,
                calculatedVolume: parseFloat(vol.toFixed(3)),
                partCountEstimate: parts
            });

            const initialRatings: Record<string, number> = {};
            project.trackingData?.workerEvaluations?.forEach(ev => {
                initialRatings[ev.workerId] = ev.rating;
            });
            setWorkerRatings(initialRatings);
        }
    }, [project, framingMaterials, finishMaterials]);

    const handleChange = (field: keyof ProjectTrackingData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleGeneratePortalLink = () => {
        const val = project.useManualValuation && project.manualItems && project.manualItems.length > 0 
            ? project.manualItems.reduce((s, i) => s + (i.amount || 0), 0)
            : autoData.calculatedCost;
        
        const rawToken = `${project.projectCode}|${project.projName}|${val}`;
        const encoded = btoa(rawToken);
        const url = `${window.location.origin}${window.location.pathname}?p_feedback=${encoded}`;
        
        navigator.clipboard.writeText(url);
        handleChange('feedbackStatus', 'requested');
        showNotification("Handover Portal Link copied to clipboard.", "success");
    };

    const handleVerifyToken = () => {
        if (!verificationToken.trim()) return;
        try {
            const decoded = JSON.parse(atob(verificationToken.trim()));
            if (decoded.code !== project.projectCode) {
                alert("Security Error: This token is linked to a different project code.");
                return;
            }
            
            // Auto-Import Feedback Data
            setFormData(prev => ({ 
                ...prev, 
                customerFeedback: decoded.feedback,
                feedbackStatus: 'received' // Awaiting worker confirmation
            }));
            setVerificationToken('');
            setShowVerificationInput(false);
            showNotification("Manual token validated. Please review and confirm the feedback.");
        } catch (e) {
            alert("Invalid Security Token. Please ensure the full string was pasted.");
        }
    };

    const handleWorkerConfirmFeedback = () => {
        if (!formData.customerFeedback) return;
        
        const updatedFeedback: CustomerFeedback = {
            ...formData.customerFeedback,
            verifiedAt: new Date().toISOString(),
            verifiedBy: currentUser?.username || 'Authorized Admin'
        };

        setFormData(prev => ({ 
            ...prev, 
            customerFeedback: updatedFeedback,
            feedbackStatus: 'verified' 
        }));
        
        showNotification("Acceptance Protocol Verified. Final Project Closeout AUTHORIZED.");
    };

    const handleUpdateWorkerRating = (workerId: string, rating: number) => {
        setWorkerRatings(prev => ({ ...prev, [workerId]: rating }));
    };

    const handleSave = () => {
        const workerEvaluations: WorkerEvaluation[] = Object.entries(workerRatings).map(([workerId, rating]) => ({
            workerId,
            rating
        }));

        // Push ratings to global contact registry
        if (workerEvaluations.length > 0 && formData.feedbackStatus === 'verified') {
            const currentContacts = db.getData<Contact>('contacts');
            const updatedContacts = currentContacts.map(c => {
                const myEval = workerEvaluations.find(ev => ev.workerId === c.id);
                if (myEval) {
                    const existingRating = c.rating || 5;
                    const newRating = (existingRating + myEval.rating) / 2;
                    return { ...c, rating: parseFloat(newRating.toFixed(1)) };
                }
                return c;
            });
            db.saveData('contacts', updatedContacts);
            setContacts(updatedContacts);
        }

        let newStatus = project.projectStatus;
        const isFullyUnlocked = formData.feedbackStatus === 'verified';
        
        // Final stage check: If verified and critical boxes are checked, move to 100%
        if (isFullyUnlocked && 
            formData.shipmentApproved && 
            formData.projectSignoff && 
            formData.balanceConfirmed && 
            newStatus !== '100') {
            newStatus = '100';
            showNotification("Project archived successfully.", "success");
        }

        const updatedTrackingData = {
            ...formData,
            projectValue: formData.projectValue || autoData.calculatedCost,
            workerEvaluations
        };
        
        const updatedProject = { 
            ...project, 
            projectStatus: newStatus,
            trackingData: updatedTrackingData,
            updatedAt: new Date().toISOString()
        };
        
        onSave(updatedProject);
        onClose();
    };

    const statusValue = parseInt(project.projectStatus);
    const isVerified = formData.feedbackStatus === 'verified';
    const isReceived = formData.feedbackStatus === 'received';

    const ApprovalToggle = ({ label, field, icon, disabled = false }: { label: string, field: keyof ProjectTrackingData, icon: string, disabled?: boolean }) => (
        <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${formData[field] ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'} ${disabled ? 'opacity-30 grayscale pointer-events-none' : 'hover:border-slate-300'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${formData[field] ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon name={icon} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tighter ${formData[field] ? 'text-emerald-900' : 'text-slate-500'}`}>{label}</span>
            </div>
            <button 
                disabled={disabled}
                onClick={() => handleChange(field, !formData[field])}
                className={`w-11 h-6 rounded-full relative transition-colors ${formData[field] ? 'bg-emerald-600' : 'bg-slate-200'}`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData[field] ? 'left-6' : 'left-1'}`}></div>
            </button>
        </div>
    );

    const renderCloseoutStage = () => {
        const assignedWorkers = project.workTeamSpec?.assignedStaffIds?.map(id => contacts.find(c => c.id === id)).filter(Boolean) as Contact[] || [];

        return (
            <div className="animate-fade-in space-y-8 pb-4">
                {/* Protocol Gate View */}
                {!isVerified ? (
                    <div className="bg-slate-950 p-6 md:p-8 rounded-[2.5rem] text-white space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 blur-[80px]"></div>
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-[1.8rem] flex items-center justify-center text-4xl shrink-0 border border-amber-500/30">
                                <Icon name={isReceived ? "fas fa-envelope-open-text" : "fas fa-lock"} />
                            </div>
                            <div className="text-center md:text-left">
                                <h4 className="text-2xl font-black uppercase tracking-tighter leading-none">{isReceived ? "Feedback Received" : "Operational Lock Active"}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Closeout requires verified customer acceptance protocol.</p>
                            </div>
                        </div>

                        {isReceived ? (
                            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 animate-fade-in">
                                <div className="flex justify-between items-start mb-6">
                                    <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Customer Review Received</h5>
                                    <div className="bg-amber-500 text-slate-900 px-3 py-1 rounded-full text-[9px] font-black uppercase">Pending Internal Confirmation</div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    {[
                                        { l: 'Quality', v: formData.customerFeedback?.quality },
                                        { l: 'Timing', v: formData.customerFeedback?.timeliness },
                                        { l: 'Comm.', v: formData.customerFeedback?.communication },
                                        { l: 'Overall', v: formData.customerFeedback?.rating }
                                    ].map(r => (
                                        <div key={r.l} className="bg-black/30 p-3 rounded-2xl border border-white/5 text-center">
                                            <p className="text-[8px] font-black uppercase text-slate-500 mb-1">{r.l}</p>
                                            <p className="text-xl font-black text-white">{r.v}/5</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-black/50 p-4 rounded-2xl mb-6 text-xs text-slate-300 font-medium italic border-l-4 border-blue-500">
                                    "{formData.customerFeedback?.comments || 'No comment provided.'}"
                                </div>
                                <Button onClick={handleWorkerConfirmFeedback} variant="primary" className="w-full py-4 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-900/40 border-none">
                                    Confirm Feedback & Unlock Stage
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {showVerificationInput ? (
                                    <div className="space-y-3 animate-fade-in">
                                        <input 
                                            type="text" 
                                            value={verificationToken}
                                            onChange={(e) => setVerificationToken(e.target.value)}
                                            placeholder="Paste Token from Customer (Manual Handshake)..."
                                            className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-mono font-bold text-blue-400 outline-none focus:border-blue-500"
                                        />
                                        <div className="flex gap-2">
                                            <Button onClick={handleVerifyToken} variant="primary" className="flex-grow py-3 text-[10px] font-black uppercase tracking-widest">Verify Manual Token</Button>
                                            <button onClick={() => setShowVerificationInput(false)} className="px-6 text-[10px] font-black uppercase text-slate-500">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <Button onClick={handleGeneratePortalLink} variant="primary" icon="fas fa-link" className="flex-grow py-4 text-[10px] font-black uppercase tracking-widest">Generate Handover Portal</Button>
                                        <Button onClick={() => setShowVerificationInput(true)} variant="warning" icon="fas fa-key" className="flex-grow py-4 text-[10px] font-black uppercase tracking-widest text-slate-900">Verify Manual Token</Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-emerald-950 p-8 rounded-[2.5rem] text-white flex items-center justify-between gap-8 border-l-8 border-emerald-500 shadow-2xl relative overflow-hidden animate-fade-in">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px]"></div>
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-[1.8rem] flex items-center justify-center text-4xl shrink-0 border border-emerald-500/30 shadow-inner">
                                <Icon name="fas fa-check-double" />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black uppercase tracking-tighter leading-none">Acceptance Verified</h4>
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                                    <Icon name="fas fa-user-check" /> Verified by {formData.customerFeedback?.verifiedBy} on {new Date(formData.customerFeedback!.verifiedAt!).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="hidden md:block bg-emerald-900/40 p-4 rounded-2xl border border-emerald-800 text-center px-8">
                            <p className="text-[9px] font-black uppercase opacity-60 mb-1">Customer Rating</p>
                            <p className="text-2xl font-black text-emerald-300">{formData.customerFeedback?.rating}.0</p>
                        </div>
                    </div>
                )}

                {/* Operations Checklist */}
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${!isVerified ? 'opacity-30 grayscale pointer-events-none' : 'animate-fade-in'}`}>
                    <div className="space-y-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-widest border-b pb-3 mb-2">Internal Financials</h5>
                        <ApprovalToggle label="Approve Team Disbursal" field="teamPaymentsApproved" icon="fas fa-hand-holding-usd" />
                        <div className="space-y-3">
                            <ApprovalToggle label="Approve Project Bonuses" field="teamBonusesApproved" icon="fas fa-gift" />
                            {formData.teamBonusesApproved && (
                                <div className="pl-4 animate-fade-in">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Bonus Pool Value (₦)</label>
                                    <input 
                                        type="number" 
                                        value={formData.teamBonusAmount || ''} 
                                        onChange={(e) => handleChange('teamBonusAmount', parseFloat(e.target.value))}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-blue-600 outline-none focus:border-blue-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-widest border-b pb-3 mb-2">Dispatch & Compliance</h5>
                        <ApprovalToggle label="Authorize Dispatch" field="shipmentApproved" icon="fas fa-truck-ramp-box" />
                        <ApprovalToggle label="Final Balance Sign-off" field="balanceConfirmed" icon="fas fa-cash-register" />
                        <ApprovalToggle label="Legal Release Mapped" field="projectSignoff" icon="fas fa-file-contract" />
                    </div>
                </div>

                {/* Performance Evaluation */}
                {isVerified && assignedWorkers.length > 0 && (
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-6 border border-slate-100 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                            <h5 className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Internal Team Performance</h5>
                            <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-slate-400 border border-slate-200">{assignedWorkers.length} Personnel Linked</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {assignedWorkers.map(worker => (
                                <div key={worker.id} className="p-5 bg-white rounded-2xl border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-all shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-lg">{worker.name.charAt(0)}</div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-slate-900 leading-none">{worker.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{worker.designation}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button 
                                                key={star}
                                                onClick={() => handleUpdateWorkerRating(worker.id, star)}
                                                className={`text-sm p-1 transition-all ${star <= (workerRatings[worker.id] || 0) ? 'text-amber-500 scale-125' : 'text-slate-100 hover:text-amber-200'}`}
                                            >
                                                <Icon name="fas fa-star" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Final Signature Section */}
                <div className={`space-y-4 bg-slate-900 p-8 rounded-[2.5rem] text-white ${!isVerified ? 'opacity-30 grayscale pointer-events-none' : 'animate-fade-in'}`}>
                    <h5 className="text-[11px] font-black uppercase text-blue-400 tracking-[0.2em] mb-4">Final Ledger Audit</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Archive Date</label>
                            <input 
                                type="date" 
                                value={formData.finalCloseoutDate || new Date().toISOString().split('T')[0]} 
                                onChange={(e) => handleChange('finalCloseoutDate', e.target.value)} 
                                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-black text-white outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Confirmed Receiver</label>
                            <input 
                                type="text" 
                                value={formData.deliveryConfirmedBy || ''} 
                                onChange={(e) => handleChange('deliveryConfirmedBy', e.target.value)} 
                                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl font-black text-white outline-none focus:border-blue-500 placeholder:text-slate-700"
                                placeholder="Client Contact Name..."
                            />
                        </div>
                    </div>
                    <div className="pt-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Site Handover Notes</label>
                        <textarea 
                            rows={3} 
                            value={formData.closeoutNotes || ''} 
                            onChange={(e) => handleChange('closeoutNotes', e.target.value)} 
                            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-medium text-slate-300 outline-none focus:border-blue-500"
                            placeholder="Warranties, keys handed over, or site exceptions..."
                        />
                    </div>
                </div>
            </div>
        );
    };

    const getStageContent = () => {
        if (statusValue < 15) return <div className="text-center py-24 text-slate-300 font-black uppercase text-xs tracking-[0.3em]">Project must be 'Started' to access tracking.</div>;
        if (statusValue < 35) return renderStartedStage();
        if (statusValue < 55) return renderProcurementStage();
        if (statusValue < 75) return renderWIPStage();
        if (statusValue < 85) return renderAssemblyStage();
        if (statusValue < 95) return renderPackageStage();
        if (statusValue < 100) return renderShippedStage();
        return renderCloseoutStage();
    };

    const renderStartedStage = () => (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-blue-600 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl"></div>
                <h4 className="text-xs font-black uppercase tracking-widest mb-2 opacity-60">Contract Authorization</h4>
                <p className="text-2xl font-black tracking-tighter">₦{autoData.calculatedCost.toLocaleString()}</p>
                <p className="text-[10px] font-black uppercase tracking-widest mt-2">Calculated Target Quote</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Deposit Verification Date</label>
                        <input type="date" value={formData.paymentConfDate || ''} onChange={(e) => handleChange('paymentConfDate', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Factory Supervisor Signature</label>
                        <input type="text" value={formData.teamLead || ''} onChange={(e) => handleChange('teamLead', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" placeholder="Assigned Team Lead" />
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Amount Committed (₦)</label>
                        <input type="number" value={formData.amountCommitted || ''} onChange={(e) => handleChange('amountCommitted', parseFloat(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-blue-600" placeholder={`Suggested: ${autoData.calculatedCost * 0.7}`} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Accounting Sign-off</label>
                        <input type="text" value={formData.paymentConfirmedBy || ''} onChange={(e) => handleChange('paymentConfirmedBy', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderProcurementStage = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4">Stock Allocation Protocol</h4>
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase opacity-60">Supply Chain Lead</label>
                    <input type="text" value={formData.purchaserInfo || ''} onChange={(e) => handleChange('purchaserInfo', e.target.value)} className="w-full p-3 bg-indigo-500/30 border border-white/20 rounded-xl font-black text-white outline-none focus:border-white" />
                </div>
            </div>
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Material Batch Details</label>
                <textarea rows={8} value={formData.purchaseList || ''} onChange={(e) => handleChange('purchaseList', e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-slate-700 outline-none focus:border-indigo-500" placeholder="Specify bulk material orders or specialized section requirements..." />
            </div>
        </div>
    );

    const renderWIPStage = () => (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-slate-950 p-6 rounded-[2rem] text-white flex justify-between items-center shadow-2xl">
                <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Theoretical Part Count</span>
                    <div className="text-3xl font-black tracking-tighter text-blue-400">{autoData.partCountEstimate}</div>
                </div>
                <div className="text-right">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Scope Density</span>
                    <div className="flex gap-1.5 mt-2">
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className={`w-3 h-8 rounded-full transition-all ${(formData.partComplexity || 0) >= i ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-slate-800'}`}></div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Actual Part Log</label>
                    <input type="number" value={formData.partCount || ''} onChange={(e) => handleChange('partCount', parseInt(e.target.value))} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-slate-900" />
                </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Execution Complexity</label>
                    <select value={formData.partComplexity || 1} onChange={(e) => handleChange('partComplexity', parseInt(e.target.value))} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest">
                        <option value="1">1 - Linear/Simple</option>
                        <option value="2">2 - Standard</option>
                        <option value="3">3 - Intensive</option>
                        <option value="4">4 - High Detail</option>
                        <option value="5">5 - Critical Scope</option>
                    </select>
                </div>
            </div>
        </div>
    );

    const renderAssemblyStage = () => (
        <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 text-center">Sub-Units Joined</label>
                    <input type="number" value={formData.subAssemblies || ''} onChange={(e) => handleChange('subAssemblies', parseInt(e.target.value))} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-3xl font-black text-center text-slate-900" />
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 text-center">Master Assemblies</label>
                    <input type="number" value={formData.mainAssemblies || ''} onChange={(e) => handleChange('mainAssemblies', parseInt(e.target.value))} className="w-full p-4 bg-slate-50 border-none rounded-2xl text-3xl font-black text-center text-slate-900" />
                </div>
            </div>
            <div className="bg-slate-900 p-6 rounded-[2rem] text-white">
                <label className="block text-[10px] font-black text-blue-400 uppercase mb-3 ml-1">Surface Finish Protocol</label>
                <input type="text" value={formData.assemblyFinishes || ''} onChange={(e) => handleChange('assemblyFinishes', e.target.value)} className="w-full p-4 bg-slate-800 border-none rounded-2xl text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Zinc Coating + Epoxy Enamel..." />
            </div>
        </div>
    );

    const renderPackageStage = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-emerald-600 text-white p-6 rounded-[2rem] shadow-xl flex justify-between items-center">
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">Design Volume</h4>
                    <p className="text-2xl font-black">{autoData.calculatedVolume} m³</p>
                </div>
                <Icon name="fas fa-box-open" className="text-4xl opacity-30"/>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Transit Protection</label>
                    <input type="text" value={formData.packageMaterial || ''} onChange={(e) => handleChange('packageMaterial', e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" placeholder="e.g. Industrial Crate / Wrap..." />
                </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Verified Deadweight (kg)</label>
                    <input type="number" value={formData.shippingWeight || ''} onChange={(e) => handleChange('shippingWeight', parseFloat(e.target.value))} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900" />
                </div>
            </div>
        </div>
    );

    const renderShippedStage = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-blue-950 p-6 md:p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-2xl"></div>
                <div>
                    <h5 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] leading-none mb-2">Handover Protocol</h5>
                    <p className="text-sm font-bold opacity-80 uppercase tracking-tighter">Initiate Automated Acceptance Portal</p>
                </div>
                <Button onClick={handleGeneratePortalLink} variant="warning" icon="fas fa-share-nodes" className="w-full md:w-auto py-4 px-8 text-[11px] uppercase font-black bg-blue-600 hover:bg-blue-700 border-none text-white shadow-xl shadow-blue-900/50">Establish Digital Handshake</Button>
            </div>
            
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-3">Logistics Manifest</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Freight Entity</label>
                        <input type="text" value={formData.carrierName || ''} onChange={(e) => handleChange('carrierName', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" placeholder="Logistics Partner Name..." />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Driver Verification</label>
                        <input type="text" value={formData.driverContact || ''} onChange={(e) => handleChange('driverContact', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" placeholder="Phone / License ID" />
                    </div>
                </div>
                <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Departure Timestamp</label>
                    <input type="datetime-local" value={formData.departureTime || ''} onChange={(e) => handleChange('departureTime', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xs" />
                </div>
            </div>
        </div>
    );

    const getStageTitle = () => {
        if (statusValue < 15) return "Initialization";
        if (statusValue < 35) return "Project Foundation";
        if (statusValue < 55) return "Supply Chain Mgmt";
        if (statusValue < 75) return "Fabrication: Parts Log";
        if (statusValue < 85) return "Structural Assembly";
        if (statusValue < 95) return "Dispatch Config";
        if (statusValue < 100) return "Global Logistics";
        return "Executive Closeout & Archive";
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${getStageTitle()}`} titleIcon={statusValue === 100 ? "fas fa-flag-checkered" : "fas fa-shield-halved"}>
            <div className="mt-2 mb-6">
                <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Tracking</span>
                        <h4 className="text-2xl font-black text-slate-950 leading-none uppercase tracking-tighter mt-1">{project.projectCode}</h4>
                    </div>
                    {statusValue < 100 && (
                        <div className="w-1/3">
                            <ApprovalToggle label="Milestone Verified" field="stageApproved" icon="fas fa-clipboard-check" />
                        </div>
                    )}
                </div>
                
                <div className="max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                    {getStageContent()}
                </div>
            </div>
            <div className="flex justify-between items-center pt-6 border-t border-slate-100 mt-2">
                <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${formData.stageApproved ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500 animate-pulse'}`}></div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        {formData.stageApproved ? 'Milestone Cleared' : 'Action Required'}
                    </span>
                </div>
                <Button onClick={handleSave} variant="primary" icon="fas fa-server" className="px-10 py-4 text-[11px] uppercase font-black shadow-2xl shadow-blue-500/20 bg-slate-900 border-none hover:bg-blue-600 transition-all">Synchronize Tracking State</Button>
            </div>
        </Modal>
    );
};

export default StageDetailsModal;
