
import React from 'react';
import Modal from '../ui/Modal';
import { Project } from '../../types';
import Icon from '../ui/Icon';
import { useProjectContext } from '../../hooks/useProjectContext';
import { useAppContext } from '../../hooks/useAppContext';

interface ProjectListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadProject: (projectCode: string) => void;
    projects: Project[];
}

const ProjectListModal: React.FC<ProjectListModalProps> = ({ isOpen, onClose, onLoadProject, projects }) => {
    const { deleteProject } = useProjectContext();
    const { currentUser } = useAppContext();
    const isViewer = currentUser?.role === 'viewer';
    
    const sortedProjects = [...projects].sort((a, b) => {
        const dateA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
        const dateB = b.savedAt ? new Date(b.savedAt).getTime() : 0;
        return dateB - dateA;
    });

    const handleDelete = (projectCode: string) => {
        if (window.confirm(`SECURITY PROTOCOL: Are you sure you want to permanently delete project ${projectCode}? This action cannot be undone.`)) {
            deleteProject(projectCode);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Saved Projects" titleIcon="fas fa-list">
            <ul className="list-none p-0 m-0">
                {sortedProjects.length > 0 ? (
                    sortedProjects.map(project => (
                        <li 
                            key={project.projectCode}
                            className="p-4 border-b border-slate-200 hover:bg-slate-50 transition-colors group flex justify-between items-center"
                        >
                            <div className="flex-grow cursor-pointer" onClick={() => onLoadProject(project.projectCode)}>
                                <div className="flex justify-between items-center">
                                    <div className="font-bold text-slate-800">{project.projectCode} - <span className="font-normal">{project.projName}</span></div>
                                    <div className="text-sm text-slate-600">{project.savedAt ? new Date(project.savedAt).toLocaleDateString() : ''}</div>
                                </div>
                                <div className="mt-2 flex gap-4 text-sm text-slate-700">
                                    <span><Icon name="fas fa-user" className="mr-1" />{project.projMgr || 'N/A'}</span>
                                    <span><Icon name="fas fa-industry" className="mr-1" />{project.prodCentre || 'N/A'}</span>
                                </div>
                            </div>
                            
                            {!isViewer && (
                                <div className="pl-4">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(project.projectCode); }} 
                                        className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Project Permanently"
                                    >
                                        <Icon name="fas fa-trash-alt" />
                                    </button>
                                </div>
                            )}
                        </li>
                    ))
                ) : (
                    <li className="p-4 text-center text-slate-500">No saved projects found.</li>
                )}
            </ul>
        </Modal>
    );
};

export default ProjectListModal;
