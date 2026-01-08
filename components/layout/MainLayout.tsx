
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Project, Client, Contact, Centre, FramingMaterial, FinishMaterial, CostingVariables, Job } from '../../types';
import Header from './Header';
import UserBar from './UserBar';
import StatusBar from '../project/StatusBar';
import Toolbar from '../project/Toolbar';
import TabContainer from '../tabs/TabContainer';
import ManageClientsPage from '../manage/ManageClientsPage';
import ManageContactsPage from '../manage/ManageContactsPage';
import ManageCentresPage from '../manage/ManageCentresPage';
import ManageMaterialsPage from '../manage/ManageMaterialsPage';
import ManageUsersPage from '../manage/ManageUsersPage';
import ProjectTrackerBoard from '../modules/ProjectTrackerBoard';
import FeedbackJournal from '../modules/FeedbackJournal';
import ForcePasswordChangeModal from '../auth/ForcePasswordChangeModal';
import { ProjectContextProvider } from '../../context/ProjectContext';
import { COST_VARS_STRUCTURE } from '../../constants';
import * as db from '../../services/db';
import { generateProjectCode } from '../../services/utils';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { useAppContext } from '../../hooks/useAppContext';

const createInitialProject = (defaultCostingVars: CostingVariables): Project => {
    return {
        projName: '', jobsThisYear: 1, year: new Date().getFullYear() % 100, projectCode: '',
        projectStatus: '0', prodCentre: '', prodCoords: '', clientName: '', clientMgr: '',
        clientPhone: '', clientEmail: '', clientAddr: '', destCitySelect: '', destCoords: '',
        projMgr: '', mgrPhone: '', mgrEmail: '', shippingLength: 0, shippingWidth: 0, shippingHeight: 0,
        jobs: [{ id: db.generateId(), name: 'Main Job', framingTakeOff: [], finishesTakeOff: [] }],
        costingVariables: { ...defaultCostingVars }
    };
};

const MainLayout: React.FC<{onBack?: () => void}> = ({ onBack }) => {
    const { currentUser, setCurrentUser, showNotification } = useAppContext();
    const [view, setView] = useState<View>(View.DASHBOARD);
    const [currentProject, setCurrentProject] = useState<Project>(() => createInitialProject({}));
    const [clients, setClients] = useState<Client[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [centres, setCentres] = useState<Centre[]>([]);
    const [framingMaterials, setFramingMaterials] = useState<FramingMaterial[]>([]);
    const [finishMaterials, setFinishMaterials] = useState<FinishMaterial[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [defaultCostingVariables, setDefaultCostingVariables] = useState<CostingVariables>({});
    const [isForcePasswordChangeOpen, setIsForcePasswordChangeOpen] = useState(false);

    const refreshLocalState = useCallback(() => {
        setClients(db.getData<Client>('clients'));
        setContacts(db.getData<Contact>('contacts'));
        setCentres(db.getData<Centre>('centres'));
        setFramingMaterials(db.getData<FramingMaterial>('framingMaterials'));
        setFinishMaterials(db.getData<FinishMaterial>('finishMaterials'));
        setProjects(db.getData<Project>('projects'));
    }, []);

    useEffect(() => {
        refreshLocalState();
        // Listen for background automation updates
        window.addEventListener('aeworks_db_update', refreshLocalState);
        return () => window.removeEventListener('aeworks_db_update', refreshLocalState);
    }, [refreshLocalState]);

    useEffect(() => {
        const loadedDefaults = db.getData<CostingVariables>('defaultCostingVariables')[0] || {};
        setDefaultCostingVariables(loadedDefaults);
        const autosaved = localStorage.getItem('autosave_current_project');
        if (autosaved) setCurrentProject(JSON.parse(autosaved));
    }, []);

    useEffect(() => {
        if (currentProject.projName) {
            const code = generateProjectCode(currentProject.projName, currentProject.jobsThisYear, currentProject.year);
            if (code !== currentProject.projectCode) setCurrentProject(p => ({ ...p, projectCode: code }));
        }
    }, [currentProject.projName, currentProject.jobsThisYear, currentProject.year]);

    const updateProject = useCallback((project: Project) => {
        const existing = db.getData<Project>('projects');
        const idx = existing.findIndex(p => p.projectCode === project.projectCode);
        const updated = [...existing];
        if (idx > -1) updated[idx] = { ...project, updatedAt: new Date().toISOString() };
        else updated.push({ ...project, updatedAt: new Date().toISOString() });
        db.saveData('projects', updated);
        setProjects(updated);
        setCurrentProject(project);
    }, []);

    const projectContextValue = useMemo(() => ({
        currentProject, setCurrentProject, clients, setClients, contacts, setContacts,
        centres, setCentres, framingMaterials, setFramingMaterials, finishMaterials, setFinishMaterials,
        projects, setProjects, defaultCostingVariables, setDefaultCostingVariables,
        updateProject, updateGlobalDefaults: (v: any) => db.saveData('defaultCostingVariables', [v]),
        resetProject: () => setCurrentProject(createInitialProject(defaultCostingVariables))
    }), [currentProject, clients, contacts, centres, framingMaterials, finishMaterials, projects, defaultCostingVariables, updateProject]);

    const isFullWidth = view === View.TRACKER || view === View.FEEDBACK_JOURNAL;

    return (
        <ProjectContextProvider value={projectContextValue}>
            <div className={isFullWidth ? "w-full h-screen flex flex-col" : "max-w-7xl mx-auto p-2 h-screen flex flex-col"}>
                <div className="flex-shrink-0">
                    <UserBar />
                    <Header />
                    {view !== View.TRACKER && view !== View.FEEDBACK_JOURNAL && (
                        <StatusBar statusValue={parseInt(currentProject.projectStatus, 10)} onSetStatus={(v) => updateProject({...currentProject, projectStatus: v.toString()})} />
                    )}
                    <Toolbar setView={setView} />
                </div>
                <main className="flex-grow overflow-hidden relative">
                    {view === View.DASHBOARD && <TabContainer />}
                    {view === View.TRACKER && <ProjectTrackerBoard setView={setView} />}
                    {view === View.FEEDBACK_JOURNAL && <FeedbackJournal onBack={() => setView(View.DASHBOARD)} onOpenProject={(p) => { setCurrentProject(p); setView(View.DASHBOARD); }} />}
                    {view === View.MANAGE_CLIENTS && <ManageClientsPage goBack={() => setView(View.DASHBOARD)} />}
                    {view === View.MANAGE_CONTACTS && <ManageContactsPage goBack={() => setView(View.DASHBOARD)} />}
                    {view === View.MANAGE_MATERIALS && <ManageMaterialsPage goBack={() => setView(View.DASHBOARD)} />}
                    {view === View.MANAGE_USERS && <ManageUsersPage goBack={() => setView(View.DASHBOARD)} />}
                </main>
                <ForcePasswordChangeModal isOpen={isForcePasswordChangeOpen} onClose={() => setIsForcePasswordChangeOpen(false)} />
            </div>
        </ProjectContextProvider>
    );
};

export default MainLayout;
