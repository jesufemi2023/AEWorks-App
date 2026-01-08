
import React, { useMemo } from 'react';
import { useProjectContext } from '../../hooks/useProjectContext';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import { Project, CustomerFeedback } from '../../types';

interface FeedbackJournalProps {
    onBack: () => void;
    onOpenProject: (p: Project) => void;
}

const FeedbackJournal: React.FC<FeedbackJournalProps> = ({ onBack, onOpenProject }) => {
    const { projects } = useProjectContext();

    const journalEntries = useMemo(() => {
        return projects
            .filter(p => p.trackingData?.customerFeedback)
            .map(p => ({
                project: p,
                feedback: p.trackingData!.customerFeedback!,
                status: p.trackingData!.feedbackStatus || 'none'
            }))
            .sort((a, b) => new Date(b.feedback.submittedAt).getTime() - new Date(a.feedback.submittedAt).getTime());
    }, [projects]);

    const stats = useMemo(() => {
        if (journalEntries.length === 0) return { avg: 0, quality: 0, timing: 0, comms: 0 };
        const sum = journalEntries.reduce((acc, curr) => ({
            avg: acc.avg + curr.feedback.rating,
            quality: acc.quality + curr.feedback.quality,
            timing: acc.timing + curr.feedback.timeliness,
            comms: acc.comms + curr.feedback.communication
        }), { avg: 0, quality: 0, timing: 0, comms: 0 });

        return {
            avg: (sum.avg / journalEntries.length).toFixed(1),
            quality: (sum.quality / journalEntries.length).toFixed(1),
            timing: (sum.timing / journalEntries.length).toFixed(1),
            comms: (sum.comms / journalEntries.length).toFixed(1)
        };
    }, [journalEntries]);

    const RatingBar = ({ label, val, color }: { label: string, val: any, color: string }) => (
        <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                <span className="text-slate-400">{label}</span>
                <span className={color}>{val}/5.0</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-1000 ${color.replace('text-', 'bg-')}`} 
                    style={{ width: `${(val / 5) * 100}%` }}
                ></div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
            <div className="p-6 bg-white border-b border-slate-200 flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button onClick={onBack} variant="outline" size="sm" icon="fas fa-arrow-left">Back</Button>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Feedback Journal</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Enterprise Quality Repository</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-2xl text-white shadow-xl">
                    <div className="text-center px-4 border-r border-slate-800">
                        <p className="text-[8px] font-black uppercase text-blue-400 mb-1">Global NPS</p>
                        <p className="text-2xl font-black leading-none">{stats.avg}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pl-2">
                        <div className="text-center">
                            <p className="text-[7px] font-black uppercase text-slate-500">Quality</p>
                            <p className="text-xs font-black text-emerald-400">{stats.quality}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[7px] font-black uppercase text-slate-500">Timing</p>
                            <p className="text-xs font-black text-amber-400">{stats.timing}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[7px] font-black uppercase text-slate-500">Comm.</p>
                            <p className="text-xs font-black text-blue-400">{stats.comms}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-6">
                    {journalEntries.length === 0 ? (
                        <div className="py-32 text-center text-slate-300">
                            <Icon name="fas fa-comment-slash" className="text-6xl mb-4 opacity-20" />
                            <h3 className="text-xl font-black uppercase tracking-widest">No Records Found</h3>
                            <p className="text-xs font-bold mt-2">Customer submissions from AEWORKS_INBOX will appear here automatically.</p>
                        </div>
                    ) : (
                        journalEntries.map(({ project, feedback, status }) => (
                            <div key={project.projectCode} className={`bg-white rounded-[2.5rem] p-6 md:p-8 border shadow-sm hover:shadow-xl transition-all group animate-fade-in flex flex-col md:flex-row gap-8 ${status === 'received' ? 'border-amber-200' : 'border-slate-100'}`}>
                                <div className="md:w-64 shrink-0 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-tighter">{project.projectCode}</span>
                                        {status === 'received' ? (
                                            <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase border border-amber-200 animate-pulse">Pending Verification</span>
                                        ) : (
                                            <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase border border-emerald-200">Verified</span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter mt-2 leading-tight">{project.projName}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{project.clientName}</p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-50 space-y-3">
                                        <RatingBar label="Fabrication" val={feedback.quality} color="text-emerald-500" />
                                        <RatingBar label="Timeliness" val={feedback.timeliness} color="text-amber-500" />
                                        <RatingBar label="Comm." val={feedback.communication} color="text-blue-500" />
                                    </div>
                                    <div className="pt-4">
                                        <Button 
                                            onClick={() => onOpenProject(project)} 
                                            variant="primary" 
                                            size="sm" 
                                            icon="fas fa-external-link-alt"
                                            className="w-full py-3 text-[9px] uppercase font-black tracking-widest rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white border-none shadow-none group-hover:shadow-lg"
                                        >
                                            View Project details
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-grow flex flex-col justify-between">
                                    <div className="relative">
                                        <Icon name="fas fa-quote-left" className="absolute -top-4 -left-4 text-4xl text-slate-50 opacity-50" />
                                        <p className="text-slate-700 text-sm md:text-base font-medium italic leading-relaxed relative z-10 pl-2">
                                            "{feedback.comments || 'No written commentary provided.'}"
                                        </p>
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-slate-50 flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${status === 'verified' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <Icon name={status === 'verified' ? "fas fa-user-check" : "fas fa-clock"} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Status</p>
                                                <p className="text-xs font-black text-slate-800 uppercase tracking-tighter mt-1">{status === 'verified' ? `Verified by ${feedback.verifiedBy}` : 'Awaiting Operations Check'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Date Received</p>
                                            <p className="text-xs font-black text-slate-500 mt-1 uppercase tracking-tighter">{new Date(feedback.submittedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="shrink-0 flex items-center md:items-start justify-center">
                                    <div className={`w-20 h-20 text-white rounded-3xl flex flex-col items-center justify-center shadow-2xl group-hover:scale-110 transition-transform ${status === 'received' ? 'bg-amber-500 shadow-amber-900/30' : 'bg-blue-600 shadow-blue-900/30'}`}>
                                        <p className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">Score</p>
                                        <p className="text-3xl font-black leading-none">{feedback.rating}.0</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default FeedbackJournal;
