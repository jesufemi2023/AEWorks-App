import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Project, Client, Contact, Centre, FramingMaterial, FinishMaterial, CostingVariables, Job } from '../../types';
import Header from './Header';
import UserBar from './UserBar';
import Footer from './Footer';
import StatusBar from '../project/StatusBar';
import Toolbar from '../project/Toolbar';
import TabContainer from '../tabs/TabContainer';
import ManageClientsPage from '../manage/ManageClientsPage';
import ManageContactsPage from '../manage/ManageContactsPage';
import ManageCentresPage from '../manage/ManageCentresPage';
import ManageMaterialsPage from '../manage/ManageMaterialsPage';
import ManageUsersPage from '../manage/ManageUsersPage';
import ProjectTrackerBoard from '../modules/ProjectTrackerBoard';
import ForcePasswordChangeModal from '../auth/ForcePasswordChangeModal';
import { ProjectContextProvider } from '../../context/ProjectContext';
import { COST_VARS_STRUCTURE, NIGERIAN_CITIES } from '../../constants';
import * as db from '../../services/db';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { useAppContext } from '../../hooks/useAppContext';

const createInitialProject = (defaultCostingVars: CostingVariables): Project => {
    return {
        projName: '',
        jobsThisYear: 1,
        year: new Date().getFullYear() % 100,
        projectCode: '',
        projectStatus: '0',
        prodCentre: '',
        prodCoords: '',
        clientName: '',
        clientMgr: '',
        clientPhone: '',
        clientEmail: '',
        clientAddr: '',
        destCitySelect: '',
        destCoords: '',
        projMgr: '',
        mgrPhone: '',
        mgrEmail: '',
        shippingLength: 0,
        shippingWidth: 0,
        shippingHeight: 0,
        jobs: [{
            id: db.generateId(),
            name: 'Main Job',
            framingTakeOff: [],
            finishesTakeOff: []
        }],
        costingVariables: { ...defaultCostingVars }
    };
};

interface MainLayoutProps {
    onBack?: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ onBack }) => {
    const { currentUser, setCurrentUser, showNotification } = useAppContext();
    const [view, setView] = useState<View>(View.DASHBOARD);
    const autosaveTimerRef = useRef<number | null>(null);
    
    const [currentProject, setCurrentProject] = useState<Project>(() => createInitialProject({}));

    const [clients, setClients] = useState<Client[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [centres, setCentres] = useState<Centre[]>([]);
    const [framingMaterials, setFramingMaterials] = useState<FramingMaterial[]>([]);
    const [finishMaterials, setFinishMaterials] = useState<FinishMaterial[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [defaultCostingVariables, setDefaultCostingVariables] = useState<CostingVariables>({});
    
    const [isForcePasswordChangeOpen, setIsForcePasswordChangeOpen] = useState(false);

    const refreshLocalState = () => {
        setClients(db.getData<Client>('clients'));
        setContacts(db.getData<Contact>('contacts'));
        setCentres(db.getData<Centre>('centres'));
        setFramingMaterials(db.getData<FramingMaterial>('framingMaterials'));
        setFinishMaterials(db.getData<FinishMaterial>('finishMaterials'));
        setProjects(db.getData<Project>('projects'));
    };

    const migrateProject = (p: any): Project => {
        if (!p.jobs || p.jobs.length === 0) {
            const migratedJob: Job = {
                id: db.generateId(),
                name: 'Primary Job',
                framingTakeOff: p.framingTakeOff || [],
                finishesTakeOff: p.finishesTakeOff || []
            };
            return {
                ...p,
                jobs: [migratedJob],
                framingTakeOff: undefined,
                finishesTakeOff: undefined
            };
        }
        return p;
    };

    useEffect(() => {
        const setup = async () => {
            refreshLocalState();

            const redirectView = localStorage.getItem('redirect_view');
            if (redirectView) {
                setView(View[redirectView as keyof typeof View] || View.DASHBOARD);
                localStorage.removeItem('redirect_view');
            }

            if (currentUser?.role === 'admin') {
                const users = db.getData<any>('users');
                const adminUser = users.find((u: any) => u.username === currentUser.username || u.email === currentUser.email);
                if (adminUser && adminUser.password === 'masterPassword123') {
                    setIsForcePasswordChangeOpen(true);
                }
            }

            const loadedDefaults = db.getData<CostingVariables>('defaultCostingVariables');
            let defaultVars: CostingVariables = {};
            if (loadedDefaults.length > 0) {
                defaultVars = loadedDefaults[0];
            } else {
                 Object.values(COST_VARS_STRUCTURE).forEach(category => {
                    Object.entries(category).forEach(([key, val]) => {
                        defaultVars[key] = val[1] as number;
                    });
                });
                db.saveData('defaultCostingVariables', [defaultVars]);
            }
            setDefaultCostingVariables(defaultVars);
            
            const autosaved = localStorage.getItem('autosave_current_project');
            if (autosaved) {
                try {
                    const p = JSON.parse(autosaved);
                    setCurrentProject(migrateProject(p));
                } catch (e) {
                    setCurrentProject(createInitialProject(defaultVars));
                }
            } else {
                setCurrentProject(createInitialProject(defaultVars));
            }
        };

        setup();
    }, [showNotification, currentUser]);

    useEffect(() => {
        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
        }
        autosaveTimerRef.current = window.setTimeout(() => {
            if (currentProject.projName || currentProject.projectCode) {
                localStorage.setItem('autosave_current_project', JSON.stringify(currentProject));
            }
        }, 2000);

        return () => {
             if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        };
    }, [currentProject]);

    const updateProject = useCallback((project: Project, shouldSyncToMasterList = true) => {
        const migratedProject = migrateProject(project);
        
        if (migratedProject.projectCode === currentProject.projectCode) {
            setCurrentProject(migratedProject);
        }

        const existingProjects = db.getData<Project>('projects');
        const idx = existingProjects.findIndex(p => p.projectCode === migratedProject.projectCode);
        const updatedProjects = [...existingProjects];
        
        if (idx > -1) {
            updatedProjects[idx] = { ...migratedProject, updatedAt: new Date().toISOString() };
        } else if (shouldSyncToMasterList) {
            updatedProjects.push({ ...migratedProject, updatedAt: new Date().toISOString() });
        }
        
        db.saveData('projects', updatedProjects);
        setProjects(updatedProjects);

        // Handle Automated Contact/Client Logic
        if (migratedProject.clientName && migratedProject.clientName.trim() !== '') {
            const statusInt = parseInt(migratedProject.projectStatus || '0', 10);
            const currentClients = db.getData<Client>('clients');
            const currentContacts = db.getData<Contact>('contacts');
            
            const normalizedName = migratedProject.clientName.toLowerCase().trim();
            const clientExists = currentClients.some(c => c.name.toLowerCase().trim() === normalizedName);
            const contactExists = currentContacts.some(c => c.name.toLowerCase().trim() === normalizedName);

            if (statusInt >= 15) {
                // Should be a formal client
                if (!clientExists) {
                    const newClient: Client = {
                        id: db.generateId(),
                        name: migratedProject.clientName.trim(),
                        mgr: migratedProject.clientMgr || 'N/A',
                        phone: migratedProject.clientPhone || '',
                        email: migratedProject.clientEmail || '',
                        address: migratedProject.clientAddr || '',
                        destination: migratedProject.destCitySelect || '',
                        updatedAt: new Date().toISOString()
                    };
                    const updatedClients = [newClient, ...currentClients];
                    db.saveData('clients', updatedClients);
                    setClients(updatedClients);
                    showNotification(`Customer "${migratedProject.clientName}" promoted to Global Registry.`, 'success');
                    
                    // Cleanup from contacts if it was a prospect
                    if (contactExists) {
                        const updatedContacts = currentContacts.filter(c => c.name.toLowerCase().trim() !== normalizedName);
                        db.saveData('contacts', updatedContacts);
                        setContacts(updatedContacts);
                    }
                }
            } else {
                // Not started, should be a prospect contact if not already a client
                if (!clientExists && !contactExists) {
                    const newContact: Contact = {
                        id: db.generateId(),
                        name: migratedProject.clientName.trim(),
                        designation: 'Potential Client',
                        category: 'Prospect',
                        phone1: migratedProject.clientPhone || '',
                        email1: migratedProject.clientEmail || '',
                        updatedAt: new Date().toISOString()
                    };
                    const updatedContacts = [newContact, ...currentContacts];
                    db.saveData('contacts', updatedContacts);
                    setContacts(updatedContacts);
                    showNotification(`New Prospect "${migratedProject.clientName}" indexed.`, 'success');
                }
            }
        }
    }, [currentProject.projectCode, showNotification]);

    const updateGlobalDefaults = useCallback((vars: CostingVariables) => {
        setDefaultCostingVariables(vars);
        db.saveData('defaultCostingVariables', [vars]);
    }, []);

    const handleSetStatus = (value: number) => {
        if (currentUser?.role === 'viewer') {
            showNotification("Access denied.", "error");
            return;
        }
        const updated = { ...currentProject, projectStatus: value.toString(), updatedAt: new Date().toISOString() };
        updateProject(updated);
    };

    const projectContextValue = useMemo(() => ({
        currentProject, setCurrentProject,
        clients, setClients,
        contacts, setContacts,
        centres, setCentres,
        framingMaterials, setFramingMaterials,
        finishMaterials, setFinishMaterials,
        projects, setProjects,
        defaultCostingVariables, setDefaultCostingVariables,
        updateProject,
        updateGlobalDefaults,
        resetProject: () => {
            const p = createInitialProject(defaultCostingVariables);
            setCurrentProject(p);
            localStorage.removeItem('autosave_current_project');
        },
    }), [currentProject, clients, contacts, centres, framingMaterials, finishMaterials, projects, defaultCostingVariables, updateProject, updateGlobalDefaults]);

    const renderView = () => {
        switch (view) {
            case View.DASHBOARD: return <TabContainer />;
            case View.MANAGE_CLIENTS: return <ManageClientsPage goBack={() => setView(View.DASHBOARD)} />;
            case View.MANAGE_CONTACTS: return <ManageContactsPage goBack={() => setView(View.DASHBOARD)} />;
            case View.MANAGE_CENTRES: return <ManageCentresPage goBack={() => setView(View.DASHBOARD)} />;
            case View.MANAGE_MATERIALS: return <ManageMaterialsPage goBack={() => setView(View.DASHBOARD)} />;
            case View.MANAGE_USERS: return <ManageUsersPage goBack={() => setView(View.DASHBOARD)} />;
            case View.TRACKER: return <ProjectTrackerBoard setView={setView} />;
            default: return <TabContainer />;
        }
    };

    const containerClass = view === View.TRACKER 
        ? "w-full px-2 h-[100dvh] flex flex-col" 
        : "max-w-7xl mx-auto p-1.5 md:p-2 h-[100dvh] flex flex-col";

    return (
        <ProjectContextProvider value={projectContextValue}>
            <div className={containerClass}>
                <div className="hidden md:block flex-shrink-0">
                    <div className="flex justify-between items-center mb-1">
                        {onBack && (
                            <Button onClick={onBack} variant="outline" size="sm" icon="fas fa-arrow-left" className="py-1 px-3 text-xs">Back</Button>
                        )}
                        <UserBar />
                    </div>
                    <Header />
                </div>

                <div className="md:hidden flex-shrink-0 bg-slate-900 text-white p-1.5 rounded-lg mb-1.5 flex justify-between items-center shadow-md">
                    <div className="flex items-center gap-2">
                        {onBack && (
                            <button onClick={onBack} className="bg-slate-700 p-1.5 rounded-full"><Icon name="fas fa-arrow-left" className="text-xs"/></button>
                        )}
                        <div className="flex flex-col">
                            <span className="font-black text-xs leading-tight">AEWorks</span>
                        </div>
                    </div>
                </div>

                {view !== View.TRACKER && (
                    <div className="flex-shrink-0">
                        <StatusBar statusValue={parseInt(currentProject.projectStatus, 10)} onSetStatus={handleSetStatus} />
                    </div>
                )}
                
                <div className="flex-shrink-0">
                    <Toolbar setView={setView} />
                </div>

                <main className="flex-grow overflow-hidden relative h-full">{renderView()}</main>
                
                <ForcePasswordChangeModal isOpen={isForcePasswordChangeOpen} onClose={() => setIsForcePasswordChangeOpen(false)} />
            </div>
        </ProjectContextProvider>
    );
};

export default MainLayout;