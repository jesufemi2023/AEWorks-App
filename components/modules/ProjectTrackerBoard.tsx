
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
        // Use the centralized updateProject method to handle database sync and auto-customer logic
        updateProject(updatedProject);
        showNotification(`Tracking data updated for ${updatedProject.projectCode}`);
    };

    const handleMoveStage = (project: Project, direction: 'prev' | 'next') => {
        const currentStageIndex = STATUS_STAGES.findIndex(s => s.value === parseInt(project.projectStatus));
        if (currentStageIndex === -1) return;

        let nextIndex = direction === 'next' ? currentStageIndex + 1 : currentStageIndex - 1;
        
        if (nextIndex < 0 || nextIndex >= STATUS_STAGES.length) return;

        const nextStage = STATUS_STAGES[nextIndex];
        const updatedProject = { ...project, projectStatus: nextStage.value.toString(), savedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        
        // Use the centralized updateProject method
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
        // Prefer saved value, fallback to calculation
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

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-100 rounded-lg shadow-inner">
            <header className="bg-white p-3 md:p-4 border-b border-slate-200 flex flex-col gap-3">
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
                    <div className="text-xs md:text-sm text-slate-500 font-medium">
                        {filteredProjects.length} Projects
                    </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-2 w-full">
                    <div className="relative flex-grow">
                        <Icon name="fas fa-search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search projects..." 
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 w-full text-sm"
                        />
                    </div>
                    <select 
                        value={filterMgr} 
                        onChange={(e) => setFilterMgr(e.target.value)}
                        className="py-2 px-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm bg-white w-full md:w-auto"
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
                        
                        // Calculate stage financials
                        const stageTotalValue = stageProjects.reduce((acc, curr) => acc + getProjectValue(curr), 0);

                        return (
                            <div key={stage.value} className="flex flex-col w-72 md:w-80 bg-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full max-h-full border border-slate-300">
                                {/* Column Header */}
                                <div className={`p-2 md:p-3 bg-white border-t-4 ${stage.color} shadow-sm z-10 flex flex-col gap-1`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-800 uppercase text-xs md:text-sm tracking-wide truncate pr-2" title={stage.name}>{stage.name}</span>
                                        <span className="bg-slate-100 text-xs px-2 py-1 rounded-full text-slate-600 font-bold">{stageProjects.length}</span>
                                    </div>
                                    <div className="text-[10px] md:text-xs text-slate-500 font-mono text-right">
                                        {stageTotalValue > 0 ? formatMoney(stageTotalValue) : '-'}
                                    </div>
                                </div>
                                
                                {/* Column Content - Vertical Scrolling */}
                                <div className="flex-grow overflow-y-auto p-2 space-y-2 md:space-y-3 custom-scrollbar bg-slate-50/50">
                                    {stageProjects.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-20 md:h-40 text-slate-400 opacity-50 select-none">
                                            <Icon name="fas fa-clipboard-list" className="text-3xl mb-2"/>
                                            <p className="text-[10px] uppercase tracking-wide">No Items</p>
                                        </div>
                                    ) : (
                                        stageProjects.map(project => {
                                            const daysLeft = getDaysRemaining(project.deadline);
                                            const projValue = getProjectValue(project);
                                            const isWorkMapped = !!project.workTeamSpec;
                                            
                                            let deadlineClass = "text-slate-500";
                                            if (daysLeft !== null) {
                                                if (daysLeft < 0) deadlineClass = "text-red-600 font-bold";
                                                else if (daysLeft <= 3) deadlineClass = "text-amber-600 font-bold";
                                                else deadlineClass = "text-green-600";
                                            }

                                            return (
                                                <div key={project.projectCode} className="bg-white p-2 md:p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-400 transition-all group relative flex flex-col gap-2">
                                                    
                                                    {/* Card Top */}
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200 truncate max-w-[120px]">{project.projectCode}</span>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {isWorkMapped && (
                                                                <span className="text-green-500 text-xs" title="Work Mapped">
                                                                    <Icon name="fas fa-hard-hat" />
                                                                </span>
                                                            )}
                                                            {projValue > 0 && (
                                                                <span className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                                                    {formatMoney(projValue)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Main Info */}
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-xs md:text-sm leading-tight mb-1 line-clamp-2" title={project.projName}>{project.projName || 'Untitled Project'}</h4>
                                                        <div className="text-[10px] md:text-xs text-slate-500 truncate" title={project.clientName}>
                                                            <Icon name="fas fa-building" className="mr-1 opacity-60 scale-75"/>
                                                            {project.clientName || 'Unknown Client'}
                                                        </div>
                                                    </div>

                                                    {/* Meta Info */}
                                                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 mt-1">
                                                        <div className="bg-slate-50 p-1 rounded flex items-center gap-1 truncate" title={`Manager: ${project.projMgr}`}>
                                                            <Icon name="fas fa-user" className="text-blue-400"/> 
                                                            <span className="truncate">{project.projMgr || '-'}</span>
                                                        </div>
                                                        <div className={`bg-slate-50 p-1 rounded flex items-center gap-1 truncate ${deadlineClass}`} title="Deadline">
                                                            <Icon name="fas fa-clock"/>
                                                            <span>{daysLeft !== null ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : `${daysLeft}d left`) : '-'}</span>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-1">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleMoveStage(project, 'prev'); }} 
                                                            disabled={stage.value === 0}
                                                            className="text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-colors p-1"
                                                            title="Move Backward"
                                                        >
                                                            <Icon name="fas fa-chevron-left"/>
                                                        </button>
                                                        
                                                        <div className="flex gap-1">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleOpenStageDetails(project); }}
                                                                className="text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded transition-colors"
                                                                title="View Stage Tracking Details"
                                                            >
                                                                <Icon name="fas fa-list-check"/> Info
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleOpenProject(project); }}
                                                                className="text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                                                            >
                                                                Open
                                                            </button>
                                                        </div>

                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleMoveStage(project, 'next'); }} 
                                                            disabled={stage.value === 100}
                                                            className="text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-colors p-1"
                                                            title="Move Forward"
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
