
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { Project, ProjectTrackingData, CustomerFeedback, WorkerEvaluation, Contact } from '../../types';
import { calculateProjectCost } from '../../services/costingService';
import { useProjectContext } from '../../hooks/useProjectContext';
import * as db from '../../services/db';

interface StageDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    onSave: (updatedProject: Project) => void;
}

const StageDetailsModal: React.FC<StageDetailsModalProps> = ({ isOpen, onClose, project, onSave }) => {
    const { framingMaterials, finishMaterials, contacts, setContacts } = useProjectContext();
    const [formData, setFormData] = useState<ProjectTrackingData>({});
    const [verificationToken, setVerificationToken] = useState('');
    const [workerRatings, setWorkerRatings] = useState<Record<string, number>>({});
    
    // Derived data for auto-filling
    const [autoData, setAutoData] = useState({
        calculatedCost: 0,
        calculatedVolume: 0,
        partCountEstimate: 0
    });

    useEffect(() => {
        if (project) {
            setFormData(project.trackingData || {});
            
            // Calculate auto-derived values
            const costs = calculateProjectCost(project, framingMaterials, finishMaterials);
            const vol = (project.shippingLength || 0) * (project.shippingWidth || 0) * (project.shippingHeight || 0);
            const parts = project.jobs.reduce((acc, job) => acc + job.framingTakeOff.reduce((jAcc, item) => jAcc + (item.qty || 0), 0), 0);
            
            setAutoData({
                calculatedCost: costs.salesPrice,
                calculatedVolume: parseFloat(vol.toFixed(3)),
                partCountEstimate: parts
            });

            // Initialize worker ratings if evaluations already exist
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
        
        // Encode: "PROJECT_CODE|PROJECT_NAME|VALUE"
        const rawToken = `${project.projectCode}|${project.projName}|${val}`;
        const encoded = btoa(rawToken);
        const url = `${window.location.origin}${window.location.pathname}?p_feedback=${encoded}`;
        
        navigator.clipboard.writeText(url);
        alert("Public Feedback Link copied to clipboard!");
    };

    const handleVerifyToken = () => {
        try {
            const decoded = JSON.parse(atob(verificationToken));
            if (decoded.code !== project.projectCode) {
                alert("This token belongs to another project.");
                return;
            }
            
            const feedback: CustomerFeedback = {
                ...decoded.feedback,
                verifiedAt: new Date().toISOString()
            };

            setFormData(prev => ({ ...prev, customerFeedback: feedback }));
            setVerificationToken('');
            alert("Customer Acceptance Verified! Closeout stage is now unlocked.");
        } catch (e) {
            alert("Invalid Verification Token. Please ensure you pasted the full string.");
        }
    };

    const handleUpdateWorkerRating = (workerId: string, rating: number) => {
        setWorkerRatings(prev => ({ ...prev, [workerId]: rating }));
    };

    const handleSave = () => {
        // Prepare Worker Evaluations
        const workerEvaluations: WorkerEvaluation[] = Object.entries(workerRatings).map(([workerId, rating]) => ({
            workerId,
            rating
        }));

        // Update Global Staff Ratings
        if (workerEvaluations.length > 0) {
            const currentContacts = db.getData<Contact>('contacts');
            const updatedContacts = currentContacts.map(c => {
                const myEval = workerEvaluations.find(ev => ev.workerId === c.id);
                if (myEval) {
                    // Moving average: (current_rating * weight + new_rating) / (weight + 1)
                    // Simplified: Let's assume a weight or just store the most recent / average
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
        const isFullyApproved = 
            formData.shipmentApproved && 
            formData.balanceConfirmed && 
            formData.projectSignoff && 
            formData.customerNotified && 
            formData.logisticsNotified && 
            formData.installationNotified &&
            !!formData.customerFeedback; // Feedback is now a requirement

        if (isFullyApproved && newStatus !== '100') {
            newStatus = '100';
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
    const hasFeedback = !!formData.customerFeedback;

    const ApprovalToggle = ({ label, field, icon, disabled = false }: { label: string, field: keyof ProjectTrackingData, icon: string, disabled?: boolean }) => (
        <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${formData[field] ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'} ${disabled ? 'opacity-40 grayscale' : ''}`}>
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData[field] ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon name={icon} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tight ${formData[field] ? 'text-green-900' : 'text-slate-500'}`}>{label}</span>
            </div>
            <button 
                disabled={disabled}
                onClick={() => handleChange(field, !formData[field])}
                className={`w-12 h-6 rounded-full relative transition-colors ${formData[field] ? 'bg-green-600' : 'bg-slate-200'}`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData[field] ? 'left-7' : 'left-1'}`}></div>
            </button>
        </div>
    );

    const renderCloseoutStage = () => {
        const assignedWorkers = project.workTeamSpec?.assignedStaffIds?.map(id => contacts.find(c => c.id === id)).filter(Boolean) as Contact[] || [];

        return (
            <div className="animate-fade-in space-y-8">
                {/* Gate Status Banner */}
                {!hasFeedback ? (
                    <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 border-l-8 border-amber-500 shadow-xl">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-3xl flex items-center justify-center text-3xl shrink-0"><Icon name="fas fa-lock" /></div>
                            <div>
                                <h4 className="text-xl font-black uppercase tracking-tighter leading-none">Operational Lock Active</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 leading-relaxed">Closing this project requires verified customer acceptance and final sign-off.</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            <Button onClick={handleGeneratePortalLink} variant="warning" icon="fas fa-share-nodes" className="py-3 px-6 text-[10px] uppercase font-black whitespace-nowrap">Generate Portal Link</Button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-emerald-950 p-6 rounded-[2rem] text-white flex items-center justify-between gap-6 border-l-8 border-emerald-500 shadow-xl">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-3xl flex items-center justify-center text-3xl shrink-0"><Icon name="fas fa-check-circle" /></div>
                            <div>
                                <h4 className="text-xl font-black uppercase tracking-tighter leading-none">Customer Acceptance Verified</h4>
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-2">Rating: {formData.customerFeedback?.rating}/5 • Acceptance Protocol Complete</p>
                            </div>
                        </div>
                        <div className="bg-emerald-900/40 p-3 rounded-2xl border border-emerald-800 text-center px-6">
                            <p className="text-[8px] font-black uppercase opacity-60 mb-1">Signed</p>
                            <p className="text-sm font-black font-mono">{new Date(formData.customerFeedback!.verifiedAt!).toLocaleDateString()}</p>
                        </div>
                    </div>
                )}

                {/* Verification Input if Locked */}
                {!hasFeedback && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2 flex items-center gap-2">
                            <Icon name="fas fa-key" className="text-blue-500"/> Verification Bridge
                        </h5>
                        <p className="text-xs text-slate-500 font-medium">Paste the "Signed Completion Token" received from the customer to unlock closeout operations.</p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={verificationToken}
                                onChange={(e) => setVerificationToken(e.target.value)}
                                placeholder="Paste token here..."
                                className="flex-grow p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-500 transition-all"
                            />
                            <Button onClick={handleVerifyToken} variant="primary" icon="fas fa-shield-check" className="px-6 py-3 uppercase text-[10px] tracking-widest">Verify</Button>
                        </div>
                    </div>
                )}

                {/* Operations Checklist (Gated) */}
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${!hasFeedback ? 'opacity-30 pointer-events-none' : ''}`}>
                    <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Financial Disbursals</h5>
                        <ApprovalToggle label="Approve Team Payments" field="teamPaymentsApproved" icon="fas fa-hand-holding-usd" />
                        <div className="space-y-2">
                            <ApprovalToggle label="Approve Team Bonuses" field="teamBonusesApproved" icon="fas fa-gift" />
                            {formData.teamBonusesApproved && (
                                <div className="pl-4">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Bonus Pool Amount (₦)</label>
                                    <input 
                                        type="number" 
                                        value={formData.teamBonusAmount || ''} 
                                        onChange={(e) => handleChange('teamBonusAmount', parseFloat(e.target.value))}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-blue-600 outline-none"
                                        placeholder="Enter total bonus pool"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Operational Release</h5>
                        <ApprovalToggle label="Approve For Shipment" field="shipmentApproved" icon="fas fa-truck-loading" />
                        <ApprovalToggle label="Project Sign-off Received" field="projectSignoff" icon="fas fa-file-signature" />
                        <ApprovalToggle label="Balance Payment Confirmed" field="balanceConfirmed" icon="fas fa-check-double" />
                    </div>
                </div>

                {/* Worker Performance Review (Gated) */}
                {hasFeedback && assignedWorkers.length > 0 && (
                    <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2 flex items-center justify-between">
                            Internal Team Evaluation
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">{assignedWorkers.length} Workers</span>
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {assignedWorkers.map(worker => (
                                <div key={worker.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-blue-100 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center font-black text-sm">{worker.name.charAt(0)}</div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-slate-800 tracking-tight leading-none">{worker.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{worker.designation}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button 
                                                key={star}
                                                onClick={() => handleUpdateWorkerRating(worker.id, star)}
                                                className={`text-xs p-1 transition-all ${star <= (workerRatings[worker.id] || 0) ? 'text-amber-500 scale-110' : 'text-slate-200 hover:text-amber-300'}`}
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

                {/* Stakeholder Checklist */}
                <div className={`space-y-4 ${!hasFeedback ? 'opacity-30 pointer-events-none' : ''}`}>
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Stakeholder Notifications</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <ApprovalToggle label="Notify Client Rep" field="customerNotified" icon="fas fa-user-check" />
                        <ApprovalToggle label="Notify Logistics" field="logisticsNotified" icon="fas fa-map-marked-alt" />
                        <ApprovalToggle label="Notify Install Team" field="installationNotified" icon="fas fa-tools" />
                    </div>
                </div>

                {/* Notes Section */}
                <div className={`space-y-4 bg-slate-900 p-6 rounded-3xl text-white ${!hasFeedback ? 'opacity-30 pointer-events-none' : ''}`}>
                    <h5 className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Closeout Execution Details</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Final Closeout Date</label>
                            <input 
                                type="date" 
                                value={formData.finalCloseoutDate || new Date().toISOString().split('T')[0]} 
                                onChange={(e) => handleChange('finalCloseoutDate', e.target.value)} 
                                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Delivered Confirmed By</label>
                            <input 
                                type="text" 
                                value={formData.deliveryConfirmedBy || ''} 
                                onChange={(e) => handleChange('deliveryConfirmedBy', e.target.value)} 
                                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white outline-none"
                                placeholder="Name of Receiver"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Final Project Notes</label>
                        <textarea 
                            rows={3} 
                            value={formData.closeoutNotes || ''} 
                            onChange={(e) => handleChange('closeoutNotes', e.target.value)} 
                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-slate-300 outline-none"
                            placeholder="Detail any exceptions or final site conditions..."
                        />
                    </div>
                </div>
            </div>
        );
    };

    const getStageContent = () => {
        if (statusValue < 15) return <div className="text-center p-12 text-slate-300 uppercase font-black text-xs tracking-widest">Move to 'Started' to begin tracking.</div>;
        if (statusValue < 35) return renderStartedStage();
        if (statusValue < 55) return renderProcurementStage();
        if (statusValue < 75) return renderWIPStage();
        if (statusValue < 85) return renderAssemblyStage();
        if (statusValue < 95) return renderPackageStage();
        if (statusValue < 100) return renderShippedStage();
        return renderCloseoutStage();
    };

    const renderStartedStage = () => (
        <div className="space-y-4 animate-fade-in">
             <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <h4 className="font-bold text-blue-800 mb-2">Financial Overview</h4>
                <p className="text-sm text-slate-700">Total Contract Value: <span className="font-bold">₦{autoData.calculatedCost.toLocaleString()}</span></p>
                <p className="text-xs text-blue-600 mt-1">*Value will be saved to tracking records.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Payment Confirmation Date</label>
                    <input type="date" value={formData.paymentConfDate || ''} onChange={(e) => handleChange('paymentConfDate', e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Amount Committed (₦)</label>
                    <input type="number" value={formData.amountCommitted || ''} onChange={(e) => handleChange('amountCommitted', parseFloat(e.target.value))} className="w-full p-2 border rounded" placeholder={`Suggested: ${autoData.calculatedCost * 0.7}`} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Confirmed By</label>
                    <input type="text" value={formData.paymentConfirmedBy || ''} onChange={(e) => handleChange('paymentConfirmedBy', e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Team Lead Assigned</label>
                    <input type="text" value={formData.teamLead || ''} onChange={(e) => handleChange('teamLead', e.target.value)} className="w-full p-2 border rounded" />
                </div>
            </div>
        </div>
    );

    const renderProcurementStage = () => (
        <div className="space-y-4 animate-fade-in">
            <div>
                <label className="block text-sm font-medium text-slate-700">Purchaser Info</label>
                <input type="text" value={formData.purchaserInfo || ''} onChange={(e) => handleChange('purchaserInfo', e.target.value)} className="w-full p-2 border rounded" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Purchase List / Notes</label>
                <textarea rows={6} value={formData.purchaseList || ''} onChange={(e) => handleChange('purchaseList', e.target.value)} className="w-full p-2 border rounded" />
            </div>
        </div>
    );

    const renderWIPStage = () => (
        <div className="space-y-4 animate-fade-in">
             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                <div>
                    <span className="text-sm text-slate-500">Auto-Est. Parts</span>
                    <div className="text-xl font-bold">{autoData.partCountEstimate}</div>
                </div>
                <div className="text-right">
                    <span className="text-sm text-slate-500">Complexity</span>
                    <div className="flex gap-1 mt-1">
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className={`w-3 h-8 rounded-sm ${(formData.partComplexity || 0) >= i ? 'bg-orange-500' : 'bg-slate-200'}`}></div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Actual Part Count</label>
                    <input type="number" value={formData.partCount || ''} onChange={(e) => handleChange('partCount', parseInt(e.target.value))} className="w-full p-2 border rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Complexity Index (1-5)</label>
                    <select value={formData.partComplexity || 1} onChange={(e) => handleChange('partComplexity', parseInt(e.target.value))} className="w-full p-2 border rounded">
                        <option value="1">1 - Simple</option>
                        <option value="2">2 - Standard</option>
                        <option value="3">3 - Moderate</option>
                        <option value="4">4 - High</option>
                        <option value="5">5 - Extreme</option>
                    </select>
                </div>
            </div>
        </div>
    );

    const renderAssemblyStage = () => (
        <div className="space-y-4 animate-fade-in">
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Sub-Assemblies</label>
                    <input type="number" value={formData.subAssemblies || ''} onChange={(e) => handleChange('subAssemblies', parseInt(e.target.value))} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Main Assemblies</label>
                    <input type="number" value={formData.mainAssemblies || ''} onChange={(e) => handleChange('mainAssemblies', parseInt(e.target.value))} className="w-full p-2 border rounded" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Finishes Applied</label>
                <input type="text" value={formData.assemblyFinishes || ''} onChange={(e) => handleChange('assemblyFinishes', e.target.value)} className="w-full p-2 border rounded" />
            </div>
        </div>
    );

    const renderPackageStage = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 mb-2 font-bold">Design Volume: {autoData.calculatedVolume} m³</div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Packaging Material</label>
                    <input type="text" value={formData.packageMaterial || ''} onChange={(e) => handleChange('packageMaterial', e.target.value)} className="w-full p-2 border rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Weight (kg)</label>
                    <input type="number" value={formData.shippingWeight || ''} onChange={(e) => handleChange('shippingWeight', parseFloat(e.target.value))} className="w-full p-2 border rounded" />
                </div>
            </div>
        </div>
    );

    const renderShippedStage = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center mb-6">
                <div>
                    <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-widest leading-none">External Handover</h5>
                    <p className="text-[9px] text-blue-600 mt-1 uppercase font-bold tracking-widest leading-tight">Authorize customer acceptance portal</p>
                </div>
                <Button onClick={handleGeneratePortalLink} variant="warning" icon="fas fa-share-from-square" className="py-2.5 px-5 text-[9px] uppercase font-black">Generate Portal Link</Button>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Carrier Details</label>
                <input type="text" value={formData.carrierName || ''} onChange={(e) => handleChange('carrierName', e.target.value)} className="w-full p-2 border rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Driver Phone</label>
                    <input type="text" value={formData.driverContact || ''} onChange={(e) => handleChange('driverContact', e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Departure Time</label>
                    <input type="datetime-local" value={formData.departureTime || ''} onChange={(e) => handleChange('departureTime', e.target.value)} className="w-full p-2 border rounded" />
                </div>
            </div>
        </div>
    );

    const getStageTitle = () => {
        if (statusValue < 15) return "Pre-Production Entry";
        if (statusValue < 35) return "Project Initialization";
        if (statusValue < 55) return "Procurement Management";
        if (statusValue < 75) return "WIP: Fabrication";
        if (statusValue < 85) return "Assembly & Finishes";
        if (statusValue < 95) return "Packaging Logic";
        if (statusValue < 100) return "Shipped / Logistics";
        return "Final Project Closeout & Handover";
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${getStageTitle()}`} titleIcon={statusValue === 100 ? "fas fa-flag-checkered" : "fas fa-tasks"}>
            <div className="mt-2 mb-6">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking Record for</span>
                        <h4 className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tighter">{project.projectCode}</h4>
                    </div>
                    {statusValue < 100 && (
                        <div className="w-1/3">
                            <ApprovalToggle label="Stage Ready Check" field="stageApproved" icon="fas fa-clipboard-check" />
                        </div>
                    )}
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                    {getStageContent()}
                </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${formData.stageApproved ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                        {formData.stageApproved ? 'Stage Verified' : 'Awaiting Stage Verification'}
                    </span>
                </div>
                <Button onClick={handleSave} variant="primary" icon="fas fa-save" className="px-8 shadow-xl shadow-blue-500/20">Commit Tracking States</Button>
            </div>
        </Modal>
    );
};

export default StageDetailsModal;
