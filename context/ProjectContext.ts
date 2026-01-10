
import React, { createContext } from 'react';
import { Project, Client, Contact, Centre, FramingMaterial, FinishMaterial, CostingVariables } from '../types';

interface ProjectContextType {
    currentProject: Project;
    setCurrentProject: React.Dispatch<React.SetStateAction<Project>>;
    clients: Client[];
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    contacts: Contact[];
    setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
    centres: Centre[];
    setCentres: React.Dispatch<React.SetStateAction<Centre[]>>;
    framingMaterials: FramingMaterial[];
    setFramingMaterials: React.Dispatch<React.SetStateAction<FramingMaterial[]>>;
    finishMaterials: FinishMaterial[];
    setFinishMaterials: React.Dispatch<React.SetStateAction<FinishMaterial[]>>;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    defaultCostingVariables: CostingVariables;
    setDefaultCostingVariables: React.Dispatch<React.SetStateAction<CostingVariables>>;
    updateProject: (project: Project, shouldSyncToMasterList?: boolean) => void;
    deleteProject: (projectCode: string) => void;
    updateGlobalDefaults: (vars: CostingVariables) => void;
    resetProject: () => void;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
export const ProjectContextProvider = ProjectContext.Provider;
