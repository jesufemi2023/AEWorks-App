
import React, { useState, useMemo } from 'react';
import { View, Project } from '../../types';
import { useProjectContext } from '../../hooks/useProjectContext';
import { STATUS_STAGES } from '../../constants';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import * as db from '../../services/db';
import { useAppContext } from '../../hooks/useAppContext';
import { calculateProjectCost } from '../../services/costingService';
import StageDetailsModal from './StageDetailsModal';

interface ProjectTrackerBoardProps {
    setView: (view: View) => void;
}

const ProjectTrackerBoard: React.FC<ProjectTrackerBoardProps> = ({ setView }) => {
    const { projects, setProjects, setCurrentProject, contacts, framingMaterials, finishMaterials, updateProject } = useProjectContext();
    const { showNotification } = useAppContext();
    const [filterText, setFilterText] = useState('');
    const [filterMgr, setFilterMgr] = useState('');
    
    // State for stage details modal
    const [selectedStageProject, setSelectedStageProject] = useState<Project | null>(null);

    const handleOpenProject = (project: Project) => {
        setCurrentProject(project);
        setView(View.DASHBOARD);
        showNotification(`Loaded ${project.projectCode}`);
    };

    const handleOpenStageDetails = (project: Project) => {
        setSelectedStageProject(project);
    };

    const handleSaveStageDetails = (updatedProject: Project) => {
        updateProject(updatedProject);
    };

    const handleMoveStage = (project: Project, direction: 'prev' | 'next') => {
        const currentStageIndex = STATUS_STAGES.findIndex(s => s.value === parseInt(project.projectStatus));
        if (currentStageIndex === -1) return;

        let nextIndex = direction === 'next' ? currentStageIndex + 1 : currentStageIndex - 1;
        
        if (nextIndex < 0 || nextIndex >= STATUS_STAGES.length) return;

        const nextStage = STATUS_STAGES[nextIndex];
        const updatedProject = { ...project, projectStatus: nextStage.value.toString(), savedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        
        updateProject(updatedProject);
        showNotification(`Moved ${project.projectCode} to ${nextStage.name}`);
    };

    const getDaysRemaining = (deadline?: string) => {
        if (!deadline) return null;
        const diff = new Date(deadline).getTime() - new Date().getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesText = (
                (p.projName || '').toLowerCase().includes(filterText.toLowerCase()) ||
                (p.projectCode || '').toLowerCase().includes(filterText.toLowerCase()) ||
                (p.clientName || '').toLowerCase().includes(filterText.toLowerCase())
            );
            const matchesMgr = filterMgr ? p.projMgr === filterMgr : true;
            return matchesText && matchesMgr;
        });
    }, [projects, filterText, filterMgr]);

    const formatMoney = (n: number) => `₦${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    const getProjectValue = (project: Project) => {
        if (project.trackingData?.projectValue) {
            return project.trackingData.projectValue;
        }
        try {
            const cost = calculateProjectCost(project, framingMaterials, finishMaterials);
            return cost.salesPrice || 0;
        } catch (e) {
            return 0;
        }
    };

    const FeedbackIndicator = ({ status }: { status?: string }) => {
        if (!status || status === 'none') return null;
        
        const config: Record<string, { icon: string, color: string, label: string, pulse: boolean, bg: string }> = {
            requested: { icon: 'fa-paper-plane', color: 'text-blue-500', label: 'Handover Sent', pulse: true, bg: 'bg-blue-50' },
            received: { icon: 'fa-envelope-open-text', color: 'text-amber-500', label: 'Review Recieved', pulse: true, bg: 'bg-amber-50' },
            verified: { icon: 'fa-shield-check', color: 'text-emerald-500', label: 'Verified sign-off', pulse: false, bg: 'bg-emerald-50' }
        };
        
        const c = config[status] || config.requested;
        
        return (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-current/10 ${c.bg} ${c.color} ${c.pulse ? 'animate-pulse' : ''}`} title={c.label}>
                <Icon name={`fas ${c.icon}`} className="text-[10px]" />
                <span className="text-[8px] font-black uppercase tracking-tighter">{c.label}</span>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-100 rounded-lg shadow-inner">
            <header className="bg-white p-3 md:p-4 border-b border-slate-200 flex flex-col gap-3 shadow-sm z-10">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Button onClick={() => setView(View.DASHBOARD)} variant="outline" size="sm" icon="fas fa-arrow-left">
                            <span className="hidden md:inline">Editor</span>
                        </Button>
                        <div>
                            <h2 className="text-lg md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Icon name="fas fa-columns" className="text-blue-600"/> 
                                <span className="hidden md:inline">Project Tracker</span>
                                <span className="md:hidden">Tracker</span>
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-r pr-4 border-slate-100">
                             <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Handover Sent</div>
                             <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Review Pending</div>
                             <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Verified</div>
                        </div>
                        <div className="text-xs md:text-sm text-slate-500 font-black uppercase tracking-tighter">
                            {filteredProjects.length} Projects
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-2 w-full">
                    <div className="relative flex-grow">
                        <Icon name="fas fa-search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search projects by name, code or client..." 
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 w-full text-sm font-bold bg-slate-50"
                        />
                    </div>
                    <select 
                        value={filterMgr} 
                        onChange={(e) => setFilterMgr(e.target.value)}
                        className="py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-bold bg-slate-50 w-full md:w-auto"
                    >
                        <option value="">All Managers</option>
                        {contacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
            </header>
            
            {/* Main Board Area */}
            <div className="flex-grow overflow-x-auto overflow-y-hidden p-2 md:p-6 bg-slate-100">
                <div className="flex h-full gap-3 md:gap-5 min-w-max pb-2">
                    {STATUS_STAGES.map((stage) => {
                        const stageProjects = filteredProjects.filter(p => parseInt(p.projectStatus) === stage.value);
                        const stageTotalValue = stageProjects.reduce((acc, curr) => acc + getProjectValue(curr), 0);

                        return (
                            <div key={stage.value} className="flex flex-col w-72 md:w-80 bg-slate-200/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full max-h-full border border-slate-300">
                                {/* Column Header */}
                                <div className={`p-3 bg-white border-t-4 ${stage.color} shadow-sm z-10 flex flex-col gap-1`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-black text-slate-800 uppercase text-xs tracking-wider truncate pr-2" title={stage.name}>{stage.name}</span>
                                        <span className="bg-slate-950 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{stageProjects.length}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter text-right">
                                        {stageTotalValue > 0 ? formatMoney(stageTotalValue) : '-'}
                                    </div>
                                </div>
                                
                                {/* Column Content */}
                                <div className="flex-grow overflow-y-auto p-3 space-y-3 custom-scrollbar bg-slate-50/50">
                                    {stageProjects.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-40 text-slate-300 opacity-50 select-none">
                                            <Icon name="fas fa-clipboard-list" className="text-3xl mb-2"/>
                                            <p className="text-[10px] font-black uppercase tracking-widest">Board Empty</p>
                                        </div>
                                    ) : (
                                        stageProjects.map(project => {
                                            const daysLeft = getDaysRemaining(project.deadline);
                                            const projValue = getProjectValue(project);
                                            const fStatus = project.trackingData?.feedbackStatus;
                                            
                                            let deadlineClass = "text-slate-500";
                                            if (daysLeft !== null) {
                                                if (daysLeft < 0) deadlineClass = "text-red-600 font-black";
                                                else if (daysLeft <= 3) deadlineClass = "text-amber-600 font-black";
                                                else deadlineClass = "text-emerald-600 font-black";
                                            }

                                            return (
                                                <div key={project.projectCode} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-400 transition-all group relative flex flex-col gap-3">
                                                    
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-mono text-[9px] font-black bg-slate-900 px-2 py-0.5 rounded text-slate-100 uppercase tracking-tighter truncate max-w-[120px]">{project.projectCode}</span>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <FeedbackIndicator status={fStatus} />
                                                            {projValue > 0 && (
                                                                <span className="text-[10px] font-black text-slate-900 mt-1">
                                                                    {formatMoney(projValue)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <h4 className="font-black text-slate-900 text-xs leading-tight mb-1 line-clamp-2 uppercase tracking-tight" title={project.projName}>{project.projName || 'Untitled Project'}</h4>
                                                        <div className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-tighter" title={project.clientName}>
                                                            {project.clientName || 'Private Client'}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-1 text-[9px] font-black uppercase tracking-tighter">
                                                        <div className="bg-slate-50 p-1.5 rounded-lg flex items-center gap-1.5 truncate border border-slate-100" title={`Lead: ${project.projMgr}`}>
                                                            <Icon name="fas fa-user-circle" className="text-blue-500"/> 
                                                            <span className="truncate text-slate-600">{project.projMgr || '-'}</span>
                                                        </div>
                                                        <div className={`bg-slate-50 p-1.5 rounded-lg flex items-center gap-1.5 truncate border border-slate-100 ${deadlineClass}`} title="Deadline Status">
                                                            <Icon name="fas fa-calendar-check"/>
                                                            <span>{daysLeft !== null ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : `${daysLeft}d rem`) : '-'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-1">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleMoveStage(project, 'prev'); }} 
                                                            disabled={stage.value === 0}
                                                            className="text-slate-300 hover:text-blue-600 disabled:opacity-20 transition-all p-1"
                                                        >
                                                            <Icon name="fas fa-chevron-left"/>
                                                        </button>
                                                        
                                                        <div className="flex gap-1.5">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleOpenStageDetails(project); }}
                                                                className="text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                                                            >
                                                                <Icon name="fas fa-shield-alt" className="text-[8px] text-blue-400"/> Info
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleOpenProject(project); }}
                                                                className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
                                                            >
                                                                Open
                                                            </button>
                                                        </div>

                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleMoveStage(project, 'next'); }} 
                                                            disabled={stage.value === 100}
                                                            className="text-slate-300 hover:text-blue-600 disabled:opacity-20 transition-all p-1"
                                                        >
                                                            <Icon name="fas fa-chevron-right"/>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Stage Details Modal */}
            {selectedStageProject && (
                <StageDetailsModal 
                    isOpen={!!selectedStageProject} 
                    onClose={() => setSelectedStageProject(null)} 
                    project={selectedStageProject}
                    onSave={handleSaveStageDetails}
                />
            )}
        </div>
    );
};

export default ProjectTrackerBoard;
