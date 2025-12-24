
import React, { useState, useRef, useEffect } from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { View, Project } from '../../types';
import ProjectListModal from './ProjectListModal';
import { useProjectContext } from '../../hooks/useProjectContext';
import { useAppContext } from '../../hooks/useAppContext';
import * as db from '../../services/db';

interface ToolbarProps {
    setView: (view: View) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ setView }) => {
    const { 
        currentProject, projects, setProjects, setCurrentProject, resetProject,
        setClients, setContacts, setCentres, setFramingMaterials, setFinishMaterials,
        updateProject
    } = useProjectContext();
    
    const { currentUser, showNotification } = useAppContext();
    const [isProjectListOpen, setIsProjectListOpen] = useState(false);
    const [isDbMenuOpen, setIsDbMenuOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(db.getSystemMeta().lastCloudSync || null);
    
    const dbMenuRef = useRef<HTMLDivElement>(null);

    const isAdmin = currentUser?.role === 'admin';
    const isViewer = currentUser?.role === 'viewer';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dbMenuRef.current && !dbMenuRef.current.contains(event.target as Node)) {
                setIsDbMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleManualSync = async () => {
        const meta = db.getSystemMeta();
        if (!meta.driveAccessToken) {
            showNotification("Authorization required. Re-link via Login screen.", "warning");
            return;
        }
        setIsSyncing(true);
        const result = await db.syncWithCloud();
        setIsSyncing(false);
        if (result.success) {
            showNotification(result.message, "success");
            const newMeta = db.getSystemMeta();
            setLastSyncTime(newMeta.lastCloudSync || null);
            
            // Refresh local state to reflect synced data
            setProjects(db.getData('projects'));
            setClients(db.getData('clients'));
            setContacts(db.getData('contacts'));
            setCentres(db.getData('centres'));
            setFramingMaterials(db.getData('framingMaterials'));
            setFinishMaterials(db.getData('finishMaterials'));
        } else {
            showNotification(result.message, "warning");
        }
    };

    const handleSaveProject = () => {
        if (isViewer) return;
        if (!currentProject.projectCode) {
            showNotification('Project Code Required.', 'error');
            return;
        }
        updateProject({ ...currentProject, updatedAt: new Date().toISOString() });
        showNotification(`Project State Persistent.`);
    };
    
    const handleLoadProject = (projectCode: string) => {
        const projectToLoad = projects.find(p => p.projectCode === projectCode);
        if (projectToLoad) {
            setCurrentProject(projectToLoad);
            setIsProjectListOpen(false);
        }
    };

    const ManageButton = ({ onClick, icon, label, colorClass }: any) => (
        <button 
            onClick={() => { onClick(); setIsDbMenuOpen(false); }} 
            className="w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0 font-bold"
        >
            <Icon name={icon} className={`${colorClass} w-4 text-center`}/> {label}
        </button>
    );

    const isCloudActive = !!db.getSystemMeta().driveAccessToken;

    return (
        <>
            <div className="flex flex-row md:flex-wrap gap-1.5 mb-2 bg-white p-1.5 rounded-xl shadow-sm justify-start md:justify-between items-center relative z-[40] border border-slate-200">
                <div className="flex flex-row flex-nowrap gap-1.5 items-center flex-grow overflow-x-auto no-scrollbar">
                    {!isViewer && <Button onClick={handleSaveProject} variant="primary" icon="fas fa-save" size="sm" className="whitespace-nowrap py-1.5 px-3 text-[10px] uppercase font-black">Commit</Button>}
                    <Button onClick={() => setIsProjectListOpen(true)} variant="success" icon="fas fa-folder-open" size="sm" className="whitespace-nowrap py-1.5 px-3 text-[10px] uppercase font-black">Load</Button>
                    {!isViewer && <Button onClick={resetProject} variant="warning" icon="fas fa-file" size="sm" className="whitespace-nowrap py-1.5 px-3 text-[10px] uppercase font-black">New</Button>}
                    <div className="hidden md:block w-px bg-slate-200 mx-1 h-5 flex-shrink-0"></div>
                    <Button onClick={() => setView(View.TRACKER)} variant="primary" icon="fas fa-columns" size="sm" className="whitespace-nowrap py-1.5 px-3 text-[10px] uppercase font-black">Tracker</Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <button 
                            onClick={handleManualSync} 
                            disabled={isSyncing}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                                isSyncing ? 'bg-blue-50 border-blue-200 text-blue-600 cursor-wait' : 
                                isCloudActive ? 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 shadow-sm' : 
                                'bg-slate-50 border-transparent text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-blue-500 animate-ping' : isCloudActive ? 'bg-green-500 shadow-[0_0_5px_#10b981]' : 'bg-slate-300'}`}></div>
                            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : isCloudActive ? 'Pull Cloud' : 'No Drive Link'}</span>
                        </button>
                        {lastSyncTime && isCloudActive && (
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                Last Sync: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>

                    {!isViewer && (
                        <div className="relative" ref={dbMenuRef}>
                            <button 
                                onClick={() => setIsDbMenuOpen(!isDbMenuOpen)} 
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all ${isDbMenuOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                            >
                                <Icon name="fas fa-database" />
                            </button>
                            {isDbMenuOpen && (
                                <div className="absolute top-[calc(100%+4px)] right-0 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-[100] animate-fade-in origin-top-right">
                                    <div className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Repositories</div>
                                    <ManageButton onClick={() => setView(View.MANAGE_CLIENTS)} icon="fas fa-building" label="Clients" colorClass="text-indigo-600"/>
                                    <ManageButton onClick={() => setView(View.MANAGE_CONTACTS)} icon="fas fa-address-card" label="Personnel" colorClass="text-teal-600"/>
                                    <ManageButton onClick={() => setView(View.MANAGE_MATERIALS)} icon="fas fa-boxes" label="Materials" colorClass="text-rose-600"/>
                                    {isAdmin && (
                                        <>
                                            <div className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mt-1 mb-1">Control</div>
                                            <ManageButton onClick={() => setView(View.MANAGE_USERS)} icon="fas fa-user-shield" label="Access Keys" colorClass="text-blue-700"/>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <ProjectListModal isOpen={isProjectListOpen} onClose={() => setIsProjectListOpen(false)} onLoadProject={handleLoadProject} projects={projects} />
        </>
    );
};

export default Toolbar;
