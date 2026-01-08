
import React, { useState, useMemo } from 'react';
import { View, Project } from '../../types';
import { useProjectContext } from '../../hooks/useProjectContext';
import { STATUS_STAGES } from '../../constants';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { useAppContext } from '../../hooks/useAppContext';
import StageDetailsModal from './StageDetailsModal';

const ProjectTrackerBoard: React.FC<{setView: (view: View) => void}> = ({ setView }) => {
    const { projects, setCurrentProject, updateProject } = useProjectContext();
    const { showNotification } = useAppContext();
    const [filterText, setFilterText] = useState('');
    const [selectedStageProject, setSelectedStageProject] = useState<Project | null>(null);

    const filteredProjects = useMemo(() => projects.filter(p => 
        (p.projName || '').toLowerCase().includes(filterText.toLowerCase()) ||
        (p.projectCode || '').toLowerCase().includes(filterText.toLowerCase()) ||
        (p.clientName || '').toLowerCase().includes(filterText.toLowerCase())
    ), [projects, filterText]);

    return (
        <div className="flex flex-col h-full bg-slate-100 overflow-hidden">
            <header className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Button onClick={() => setView(View.DASHBOARD)} variant="outline" size="sm" icon="fas fa-arrow-left">Editor</Button>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">Project Operations Tracker</h2>
                </div>
                <div className="relative w-64 md:w-96">
                    <Icon name="fas fa-search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="text" placeholder="Search Vault..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </header>
            
            <div className="flex-grow overflow-x-auto p-6 flex gap-6">
                {STATUS_STAGES.map(stage => (
                    <div key={stage.value} className="flex flex-col w-80 shrink-0 bg-slate-200/40 rounded-[2rem] border border-slate-300/50 overflow-hidden">
                        <div className={`p-4 bg-white border-t-4 ${stage.color} flex justify-between items-center shadow-sm`}>
                            <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">{stage.name}</span>
                            <span className="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                                {filteredProjects.filter(p => parseInt(p.projectStatus) === stage.value).length}
                            </span>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {filteredProjects.filter(p => parseInt(p.projectStatus) === stage.value).map(project => {
                                const isReceived = project.trackingData?.feedbackStatus === 'received';
                                return (
                                    <div key={project.projectCode} className={`bg-white p-4 rounded-3xl border shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 ${isReceived ? 'border-amber-400 ring-4 ring-amber-400/20 animate-pulse' : 'border-slate-100'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-tighter">{project.projectCode}</span>
                                            {isReceived && (
                                                <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                                    <Icon name="fas fa-bell" className="text-[10px]" />
                                                    <span className="text-[8px] font-black uppercase">Review Received</span>
                                                </div>
                                            )}
                                        </div>
                                        <h4 className="text-xs font-black text-slate-900 uppercase leading-tight mb-1">{project.projName}</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{project.clientName}</p>
                                        
                                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                            <div className="flex gap-2">
                                                <button onClick={() => setSelectedStageProject(project)} className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${isReceived ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                                                    <Icon name="fas fa-info-circle" className="mr-1.5" /> Details
                                                </button>
                                                <button onClick={() => { setCurrentProject(project); setView(View.DASHBOARD); }} className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-200">Open</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            {selectedStageProject && <StageDetailsModal isOpen={!!selectedStageProject} onClose={() => setSelectedStageProject(null)} project={selectedStageProject} onSave={updateProject} />}
        </div>
    );
};

export default ProjectTrackerBoard;
