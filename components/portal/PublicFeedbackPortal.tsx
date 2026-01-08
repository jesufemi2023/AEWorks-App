
import React, { useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import { CustomerFeedback } from '../../types';

interface PublicFeedbackPortalProps {
    token: string;
}

/** 
 * PASTE YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL HERE 
 */
const RELAY_URL = "https://script.google.com/macros/s/AKfycbwObS2qVvurf9XYe5H2Pt032n3AeKKzeRuaOcVcq_q3hww5u8Kr-In7e8J-Qi5ipM9qcQ/exec";

const PublicFeedbackPortal: React.FC<PublicFeedbackPortalProps> = ({ token }) => {
    const [projectData, setProjectData] = useState<{ name: string; code: string; value: number } | null>(null);
    const [step, setStep] = useState(1);
    const [rating, setRating] = useState(0);
    const [quality, setQuality] = useState(0);
    const [timeliness, setTimeliness] = useState(0);
    const [communication, setCommunication] = useState(0);
    const [comments, setComments] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [signedCode, setSignedCode] = useState('');
    const [showReceipt, setShowReceipt] = useState(false);

    useEffect(() => {
        try {
            const decoded = atob(token);
            const [code, name, value] = decoded.split('|');
            setProjectData({ code, name, value: parseFloat(value) || 0 });
        } catch (e) {
            console.error("Invalid Portal Token");
        }
    }, [token]);

    const handleSubmit = async () => {
        if (rating === 0 || quality === 0 || timeliness === 0 || communication === 0) {
            alert("Please provide all ratings before signing off.");
            return;
        }

        setIsSending(true);

        const feedback: CustomerFeedback = {
            rating,
            quality,
            timeliness,
            communication,
            comments,
            submittedAt: new Date().toISOString()
        };

        const payload = {
            code: projectData?.code,
            feedback
        };

        const payloadString = JSON.stringify(payload);
        setSignedCode(btoa(payloadString));

        try {
            // Automated submission to Google Relay
            await fetch(RELAY_URL, {
                method: 'POST',
                mode: 'no-cors', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: payloadString
            });
            
            // Assume success after a brief transmission delay
            setTimeout(() => {
                setIsSubmitted(true);
                setIsSending(false);
            }, 1200);

        } catch (e) {
            console.error("Automated transmission error. Showing manual receipt fallback.");
            setShowReceipt(true);
            setIsSubmitted(true);
            setIsSending(false);
        }
    };

    const StarRating = ({ value, label, onSelect }: { value: number; label: string; onSelect: (v: number) => void }) => (
        <div className="flex flex-col gap-2 mb-6">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                <span className="text-xs font-bold text-blue-600">{value}/5</span>
            </div>
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => onSelect(star)}
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-xl transition-all flex items-center justify-center text-lg ${
                            star <= value 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105' 
                                : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                        <Icon name="fas fa-star" />
                    </button>
                ))}
            </div>
        </div>
    );

    if (!projectData) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
                <div className="space-y-6 max-w-sm">
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center text-3xl mx-auto border border-red-500/20">
                        <Icon name="fas fa-shield-virus" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Handover Link Expired</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">The secure project acceptance portal is no longer active for this session. Please contact AEWorks Logistics for a fresh authorization link.</p>
                </div>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center animate-fade-in">
                <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl max-w-md w-full space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-inner border border-emerald-100">
                        <Icon name="fas fa-file-signature" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">Accepted & Signed</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">Digital Closeout Handshake Complete</p>
                    </div>
                    
                    <div className="bg-slate-900 p-8 rounded-[2rem] text-white space-y-4">
                        <p className="text-[11px] text-slate-300 font-medium leading-relaxed text-center">Your acceptance certificate has been transmitted to our project management team. No further action is required from your side.</p>
                        
                        {(showReceipt || signedCode) && (
                            <div className="pt-4 mt-2 border-t border-white/10">
                                <button onClick={() => setShowReceipt(!showReceipt)} className="text-[9px] font-black uppercase text-blue-400 tracking-widest opacity-60 hover:opacity-100 transition-opacity">
                                    {showReceipt ? 'Hide Receipt Metadata' : 'View Secure Receipt'}
                                </button>
                                {showReceipt && (
                                    <div className="mt-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 break-all font-mono text-[8px] font-bold text-emerald-400 select-all leading-tight animate-fade-in">
                                        {signedCode}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">AEWorks Logistics Division</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 md:p-12 animate-fade-in font-sans">
            <div className="bg-white rounded-[3.5rem] shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col relative">
                
                <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    <div className={`h-1.5 w-8 rounded-full transition-all ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                    <div className={`h-1.5 w-8 rounded-full transition-all ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                    <div className={`h-1.5 w-8 rounded-full transition-all ${step >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                </div>

                <header className="bg-slate-900 pt-16 pb-12 px-8 md:px-12 text-white flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white p-2.5 rounded-[1.2rem] flex items-center justify-center shadow-2xl shrink-0 rotate-3">
                            <Icon name="fas fa-industry" className="text-slate-900 text-3xl" />
                        </div>
                        <div className="text-center md:text-left">
                            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">Client Handover</h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mt-2">Final Acceptance Protocol</p>
                        </div>
                    </div>
                    <div className="text-center md:text-right bg-blue-600/20 px-6 py-3 rounded-[1.5rem] border border-blue-500/20">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Contract Settlement Sum</p>
                        <p className="text-2xl font-black tracking-tighter">₦{projectData.value.toLocaleString()}</p>
                    </div>
                </header>

                <main className="p-8 md:p-16 space-y-10 flex-grow">
                    {step === 1 && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="border-b border-slate-100 pb-6">
                                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Project Identity</h2>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">{projectData.name}</h3>
                                <p className="text-xs font-bold text-blue-600 mt-2 font-mono">ID: {projectData.code}</p>
                            </div>
                            
                            <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    You are signing off on <strong className="text-slate-900">{projectData.name}</strong>. By proceeding, you acknowledge that the works have been completed to your satisfaction and the final invoice of <strong className="text-blue-600">₦{projectData.value.toLocaleString()}</strong> is recognized.
                                </p>
                                <Button onClick={() => setStep(2)} variant="primary" className="mt-8 px-12 py-5 uppercase text-[11px] font-black tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 w-full md:w-auto">Confirm & Rate Experience</Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-2">
                                <StarRating value={rating} label="Overall Satisfaction" onSelect={setRating} />
                                <StarRating value={quality} label="Fabrication Quality" onSelect={setQuality} />
                                <StarRating value={timeliness} label="Delivery Timeliness" onSelect={setTimeliness} />
                                <StarRating value={communication} label="Communication" onSelect={setCommunication} />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Additional Site Notes</label>
                                <textarea 
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    rows={4}
                                    placeholder="Your feedback helps our team improve..."
                                    className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
                                />
                            </div>
                            
                            <div className="flex flex-col md:flex-row gap-4 pt-6">
                                <button onClick={() => setStep(1)} className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Back</button>
                                <Button onClick={() => setStep(3)} variant="primary" className="flex-grow py-5 uppercase text-[11px] font-black tracking-widest rounded-2xl shadow-xl shadow-blue-500/20">Finalize Handover</Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-blue-900 p-8 md:p-12 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[100px]"></div>
                                <h4 className="text-xl font-black uppercase tracking-tighter mb-4 flex items-center gap-3">
                                    <Icon name="fas fa-lock" className="text-blue-400" />
                                    Digital Signature
                                </h4>
                                <p className="text-sm text-blue-100 font-medium leading-relaxed mb-10 max-w-lg">
                                    By clicking below, you authorize the final project closeout for <strong className="text-white">{projectData.code}</strong>. Your ratings will be transmitted securely to our operations vault.
                                </p>
                                
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <Button 
                                        onClick={handleSubmit} 
                                        variant="success" 
                                        size="lg" 
                                        disabled={isSending}
                                        icon={isSending ? "fas fa-sync animate-spin" : "fas fa-stamp"} 
                                        className="w-full md:w-auto px-12 py-5 uppercase text-[11px] font-black tracking-widest bg-emerald-500 border-none shadow-2xl"
                                    >
                                        {isSending ? 'Transmitting Data...' : 'Sign & Complete Handover'}
                                    </Button>
                                    {!isSending && <button onClick={() => setStep(2)} className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Edit Details</button>}
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                <footer className="p-8 text-center bg-slate-50 border-t border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">AEWorks Logistics Handover Protocol v4.6</p>
                </footer>
            </div>
        </div>
    );
};

export default PublicFeedbackPortal;
