
import React, { useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import { CustomerFeedback } from '../../types';

interface PublicFeedbackPortalProps {
    token: string;
}

const PublicFeedbackPortal: React.FC<PublicFeedbackPortalProps> = ({ token }) => {
    const [projectData, setProjectData] = useState<{ name: string; code: string; value: number } | null>(null);
    const [rating, setRating] = useState(0);
    const [quality, setQuality] = useState(0);
    const [timeliness, setTimeliness] = useState(0);
    const [communication, setCommunication] = useState(0);
    const [comments, setComments] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [signedCode, setSignedCode] = useState('');

    useEffect(() => {
        try {
            // Token is Base64 encoded: "PROJECT_CODE|PROJECT_NAME|VALUE"
            const decoded = atob(token);
            const [code, name, value] = decoded.split('|');
            setProjectData({ code, name, value: parseFloat(value) || 0 });
        } catch (e) {
            console.error("Invalid Portal Token");
        }
    }, [token]);

    const handleRatingClick = (setter: React.Dispatch<React.SetStateAction<number>>, val: number) => {
        setter(val);
    };

    const handleSubmit = () => {
        if (rating === 0 || quality === 0 || timeliness === 0 || communication === 0) {
            alert("Please provide all ratings before submitting.");
            return;
        }

        const feedback: CustomerFeedback = {
            rating,
            quality,
            timeliness,
            communication,
            comments,
            submittedAt: new Date().toISOString()
        };

        // Create the Signed Verification Token
        const verificationData = {
            code: projectData?.code,
            feedback
        };
        const encoded = btoa(JSON.stringify(verificationData));
        setSignedCode(encoded);
        setIsSubmitted(true);
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
                        className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center text-lg ${
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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                <div className="space-y-4 max-w-sm">
                    <Icon name="fas fa-exclamation-triangle" className="text-5xl text-amber-500 mb-4" />
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Portal Link Invalid</h2>
                    <p className="text-slate-500 text-sm">The feedback session has expired or the link provided is corrupt. Please contact your AEWorks Project Lead.</p>
                </div>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center animate-fade-in">
                <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 max-w-md w-full space-y-8">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                        <Icon name="fas fa-check" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Feedback Signed</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Verification Protocol Initialized</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4">
                        <p className="text-xs opacity-70">Please copy the secure verification code below and send it to your project lead to authorize final closeout.</p>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 break-all font-mono text-[10px] font-bold text-blue-400 select-all">
                            {signedCode}
                        </div>
                        <Button 
                            onClick={() => {
                                navigator.clipboard.writeText(signedCode);
                                alert("Verification Code copied!");
                            }}
                            variant="primary"
                            icon="fas fa-copy"
                            className="w-full py-4 uppercase text-[10px] tracking-widest"
                        >
                            Copy Signed Code
                        </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">Thank you for partnering with AEWorks.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-12 animate-fade-in">
            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden flex flex-col">
                <header className="bg-slate-900 p-8 text-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white p-2 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                            <Icon name="fas fa-industry" className="text-slate-900 text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tighter">Client Handover Portal</h1>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Project Acceptance & Review</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Signed Sum</p>
                        <p className="text-xl font-black tracking-tighter">₦{projectData.value.toLocaleString()}</p>
                    </div>
                </header>

                <main className="p-8 md:p-12 space-y-8 flex-grow">
                    <div className="border-b border-slate-100 pb-6">
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Active Project</h2>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{projectData.name}</h3>
                        <p className="text-xs font-bold text-blue-600 mt-1">Code: {projectData.code}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                        <StarRating value={rating} label="Overall Satisfaction" onSelect={(v) => handleRatingClick(setRating, v)} />
                        <StarRating value={quality} label="Fabrication Quality" onSelect={(v) => handleRatingClick(setQuality, v)} />
                        <StarRating value={timeliness} label="Project Timeliness" onSelect={(v) => handleRatingClick(setTimeliness, v)} />
                        <StarRating value={communication} label="Team Communication" onSelect={(v) => handleRatingClick(setCommunication, v)} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Comments / Improvement Suggestions</label>
                        <textarea 
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            rows={4}
                            placeholder="Share your experience working with our team..."
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
                        />
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><Icon name="fas fa-lock" /></div>
                                <div>
                                    <h4 className="text-[11px] font-black uppercase text-blue-900 leading-none">Acceptance Signature</h4>
                                    <p className="text-[9px] text-blue-600 mt-1 uppercase font-bold tracking-widest leading-tight">By submitting, you confirm completion of scope.</p>
                                </div>
                            </div>
                            <Button 
                                onClick={handleSubmit} 
                                variant="primary" 
                                size="lg" 
                                icon="fas fa-file-signature" 
                                className="w-full md:w-auto px-10 py-4 uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/30"
                            >
                                Submit Sign-off
                            </Button>
                        </div>
                    </div>
                </main>

                <footer className="p-8 text-center bg-slate-50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">AEWorks Enterprise Handover Protocol v1.0</p>
                </footer>
            </div>
        </div>
    );
};

export default PublicFeedbackPortal;
