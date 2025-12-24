
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
    const [isCommitting, setIsCommitting] = useState(false);
    const [syncError, setSyncError] = useState(false);
    const [systemMeta, setSystemMeta] = useState(db.getSystemMeta());
    
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
        setSyncError(false);
        
        const result = await db.syncWithCloud();
        setIsSyncing(false);
        
        if (result.success) {
            showNotification(result.message, "success");
            const newMeta = db.getSystemMeta();
            setSystemMeta(newMeta);
            
            // Refresh local state
            setProjects(db.getData('projects'));
            setClients(db.getData('clients'));
            setContacts(db.getData('contacts'));
            setCentres(db.getData('centres'));
            setFramingMaterials(db.getData('framingMaterials'));
            setFinishMaterials(db.getData('finishMaterials'));
        } else {
            setSyncError(true);
            showNotification(result.message, "warning");
        }
    };

    const handleSaveProject = async () => {
        if (isViewer) return;
        
        if (!currentProject.projName || currentProject.projName.trim() === '') {
            showNotification('Project Name Required before Committing.', 'error');
            return;
        }
        
        if (!currentProject.projectCode) {
            showNotification('Generating Project Code...', 'warning');
            return;
        }

        setIsCommitting(true);
        
        // 1. Save Locally
        updateProject({ ...currentProject, updatedAt: new Date().toISOString() });
        
        // 2. Explicit Cloud Push if connected
        const meta = db.getSystemMeta();
        if (meta.driveAccessToken) {
            const cloudResult = await db.pushToCloud();
            if (cloudResult.success) {
                showNotification(`Project "${currentProject.projName}" synced to Drive.`, 'success');
            } else {
                showNotification(`Saved Locally. Cloud Push: ${cloudResult.message}`, 'warning');
                setSyncError(true);
            }
            setSystemMeta(db.getSystemMeta());
        } else {
            showNotification(`State Saved Locally. (Cloud Offline)`, 'success');
        }
        
        setIsCommitting(false);
    };
    
    const handleLoadProject = (projectCode: string) => {
        const projectToLoad = projects.find(p => p.projectCode === projectCode);
        if (projectToLoad) {
            setCurrentProject(projectToLoad);
            setIsProjectListOpen(false);
        }
    };

    const isCloudActive = !!systemMeta.driveAccessToken;
    const driveFileUrl = systemMeta.driveFileId ? `https://drive.google.com/file/d/${systemMeta.driveFileId}/view` : null;

    // Determine badge color
    let badgeClass = 'bg-slate-50 border-transparent text-slate-400';
    let dotClass = 'bg-slate-300';
    
    if (isSyncing || isCommitting) {
        badgeClass = 'bg-blue-50 border-blue-200 text-blue-600 animate-pulse';
        dotClass = 'bg-blue-500 animate-ping';
    } else if (syncError) {
        badgeClass = 'bg-red-50 border-red-200 text-red-600';
        dotClass = 'bg-red-500 shadow-[0_0_5px_#ef4444]';
    } else if (isCloudActive) {
        badgeClass = 'bg-white border-slate-200 text-slate-700 hover:border-green-400 shadow-sm';
        dotClass = 'bg-green-500 shadow-[0_0_5px_#10b981]';
    }

    return (
        <>
            <div className="flex flex-row md:flex-wrap gap-1.5 mb-2 bg-white p-1.5 rounded-xl shadow-sm justify-start md:justify-between items-center relative z-[40] border border-slate-200">
                <div className="flex flex-row flex-nowrap gap-1.5 items-center flex-grow overflow-x-auto no-scrollbar">
                    {!isViewer && (
                        <Button 
                            onClick={handleSaveProject} 
                            variant="primary" 
                            icon={isCommitting ? "fas fa-sync animate-spin" : "fas fa-save"} 
                            disabled={isCommitting}
                            size="sm" 
                            className="whitespace-nowrap py-1.5 px-3 text-[10px] uppercase font-black"
                        >
                            {isCommitting ? 'Pushing...' : 'Commit'}
                        </Button>
                    )}
                    <Button onClick={() => setIsProjectListOpen(true)} variant="success" icon="fas fa-folder-open" size="sm" className="whitespace-nowrap py-1.5 px-3 text-[10px] uppercase font-black">Load</Button>
                    {!isViewer && <Button onClick={resetProject} variant="warning" icon="fas fa-file" size="sm" className="whitespace-nowrap py-1.5 px-3 text-[10px] uppercase font-black">New</Button>}
                    <div className="hidden md:block w-px bg-slate-200 mx-1 h-5 flex-shrink-0"></div>
                    <Button onClick={() => setView(View.TRACKER)} variant="primary" icon="fas fa-columns" size="sm" className="whitespace-nowrap py-1.5 px-3 text-[10px] uppercase font-black">Tracker</Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={handleManualSync} 
                                disabled={isSyncing || isCommitting}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${badgeClass}`}
                                title={isCloudActive ? "Sync with Google Drive" : "No Cloud Bridge Active"}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></div>
                                <span className="hidden sm:inline">
                                    {isSyncing ? 'Syncing...' : syncError ? 'Check Link' : isCloudActive ? 'Pull Cloud' : 'Offline'}
                                </span>
                            </button>
                            {driveFileUrl && (
                                <a 
                                    href={driveFileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                                    title="View Master Vault on Google Drive"
                                >
                                    <Icon name="fas fa-external-link-alt" className="text-[10px]" />
                                </a>
                            )}
                        </div>
                        {systemMeta.lastCloudSync && isCloudActive && !syncError && (
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                Saved: {new Date(systemMeta.lastCloudSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                    <button onClick={() => { setView(View.MANAGE_CLIENTS); setIsDbMenuOpen(false); }} className="w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-bold border-b border-slate-50"><Icon name="fas fa-building" className="text-indigo-600 w-4"/> Clients</button>
                                    <button onClick={() => { setView(View.MANAGE_CONTACTS); setIsDbMenuOpen(false); }} className="w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-bold border-b border-slate-50"><Icon name="fas fa-address-card" className="text-teal-600 w-4"/> Personnel</button>
                                    <button onClick={() => { setView(View.MANAGE_MATERIALS); setIsDbMenuOpen(false); }} className="w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-bold border-b border-slate-50"><Icon name="fas fa-boxes" className="text-rose-600 w-4"/> Materials</button>
                                    {isAdmin && (
                                        <>
                                            <div className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mt-1 mb-1">Control</div>
                                            <button onClick={() => { setView(View.MANAGE_USERS); setIsDbMenuOpen(false); }} className="w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-3 font-bold"><Icon name="fas fa-user-shield" className="text-blue-700 w-4"/> Access Keys</button>
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
