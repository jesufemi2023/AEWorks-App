
import React, { useState, useEffect } from 'react';
import ManagePage from './ManagePage';
import CrudTable, { Column } from './CrudTable';
import { AuthUser } from '../../types';
import * as db from '../../services/db';
import { useAppContext } from '../../hooks/useAppContext';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface ManageUsersPageProps {
    goBack: () => void;
}

const ManageUsersPage: React.FC<ManageUsersPageProps> = ({ goBack }) => {
    const { currentUser, showNotification } = useAppContext();
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [systemMeta] = useState(db.getSystemMeta());
    
    // New User State
    const [newUser, setNewUser] = useState<Partial<AuthUser>>({
        username: '',
        email: '',
        password: '',
        role: 'viewer'
    });

    useEffect(() => {
        setUsers(db.getData<AuthUser>('users'));
    }, []);

    const columns: Column<AuthUser>[] = [
        { key: 'username', label: 'Login ID', type: 'text' },
        { key: 'email', label: 'Primary Email', type: 'text' },
        { 
            key: 'role', 
            label: 'Tier / Level', 
            type: 'select',
            options: [
                { label: 'Level 1: Super Admin', value: 'admin' },
                { label: 'Level 2: Manager', value: 'manager' },
                { label: 'Level 3: Viewer', value: 'viewer' }
            ],
            render: (val) => {
                const colors: any = { admin: 'text-blue-600', manager: 'text-purple-600', viewer: 'text-slate-500' };
                const labels: any = { admin: 'L1: Admin', manager: 'L2: Manager', viewer: 'L3: Viewer' };
                return <span className={`font-black uppercase tracking-tighter text-[10px] ${colors[val] || ''}`}>{labels[val] || val}</span>;
            }
        },
        { 
            key: 'password', 
            label: 'Access Token', 
            type: 'text',
            render: (val) => <span className="font-mono text-slate-300 select-none tracking-widest">••••••••</span>
        },
        { 
            key: 'lastLogin', 
            label: 'Recent Access',
            render: (val) => val ? new Date(val).toLocaleDateString() : <span className="opacity-30 italic text-[9px]">Never</span>
        }
    ];

    const handleSaveList = (updatedUsers: AuthUser[]) => {
        const admins = updatedUsers.filter(u => u.role === 'admin');
        if (admins.length === 0) {
            showNotification('Security Error: At least one Super Admin required.', 'error');
            return;
        }

        if (db.saveData<AuthUser>('users', updatedUsers)) {
            setUsers(db.getData<AuthUser>('users'));
            showNotification('Access Registry Updated. Click "COMMIT" in Toolbar to sync with Drive.', 'success');
        }
    };

    const copyOnboardingLink = () => {
        const setupUrl = `${window.location.origin}${window.location.pathname}?cid=${encodeURIComponent(systemMeta.googleClientId || '')}`;
        navigator.clipboard.writeText(setupUrl);
        showNotification("Staff Onboarding Link copied!", "success");
    };

    const generateRandomToken = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewUser(prev => ({ ...prev, password: result }));
    };

    const handleCreateUser = () => {
        if (!newUser.username || !newUser.password || !newUser.email) {
            showNotification('All fields are required for new account provisioning.', 'warning');
            return;
        }

        const newAccount: AuthUser = {
            id: db.generateId(),
            username: newUser.username,
            email: newUser.email,
            password: newUser.password,
            role: newUser.role as any,
            updatedAt: new Date().toISOString()
        };

        const updated = [newAccount, ...users];
        if (db.saveData('users', updated)) {
            setUsers(updated);
            setIsCreateModalOpen(false);
            setNewUser({ username: '', email: '', password: '', role: 'viewer' });
            showNotification(`Account created. Remember to "Commit" to push this user to Drive.`, 'success');
        }
    };

    if (currentUser?.role !== 'admin') {
        return (
            <ManagePage title="Security Violation" icon="fas fa-user-lock" goBack={goBack}>
                <div className="p-16 text-center bg-red-50 rounded-2xl border-2 border-red-100 flex flex-col items-center">
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600 text-5xl">
                        <Icon name="fas fa-shield-virus" className="animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-black text-red-900 mb-2 uppercase tracking-tighter">Access Restricted</h3>
                    <p className="text-red-700 max-w-md text-sm leading-relaxed">
                        Identity & Access Management (IAM) is reserved for Level 1 System Administrators. 
                    </p>
                    <Button onClick={goBack} variant="outline" className="mt-8 border-red-200 text-red-700 hover:bg-red-100">Return to Operations</Button>
                </div>
            </ManagePage>
        );
    }

    return (
        <ManagePage title="Access Key Management" icon="fas fa-user-shield" goBack={goBack}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                <div className="lg:col-span-2 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                    <h4 className="text-lg font-black flex items-center gap-3 mb-2 uppercase tracking-tighter">
                        <Icon name="fas fa-terminal" className="text-blue-400" />
                        Central User Registry
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">
                        Users defined here are shared across all devices linked to: <br/>
                        <strong className="text-blue-300">{systemMeta.connectedEmail || 'No Drive Linked Yet'}</strong>
                    </p>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsCreateModalOpen(true)} variant="primary" icon="fas fa-user-plus" size="sm" className="px-5 shadow-lg shadow-blue-500/20">
                            Create User
                        </Button>
                        <Button onClick={copyOnboardingLink} variant="outline" icon="fas fa-link" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                            Staff Setup Link
                        </Button>
                    </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                    <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-3">Sync Status</h5>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${systemMeta.driveAccessToken ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        <span className="text-xs font-bold text-blue-800">
                            {systemMeta.driveAccessToken ? 'Cloud Bridge Active' : 'Disconnected from Drive'}
                        </span>
                    </div>
                    <p className="text-[10px] text-blue-600 mt-2 leading-tight">
                        After editing users, you MUST click <strong>COMMIT</strong> in the top toolbar to sync changes to other devices.
                    </p>
                </div>
            </div>

            <CrudTable<AuthUser>
                columns={columns}
                data={users}
                onSave={handleSaveList}
                newItemFactory={() => ({ id: db.generateId(), username: '', email: '', password: '', role: 'viewer' })}
                itemName="Access Key"
                hideAddButton={true}
            />
            
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Provision Account" titleIcon="fas fa-user-shield">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Login ID / Username</label>
                                <input type="text" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none font-bold" placeholder="e.g. G.Johnson" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">System Email</label>
                                <input type="email" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none" placeholder="staff@aeworks.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Access Level</label>
                                <select className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-bold" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                                    <option value="viewer">Tier 3: Viewer</option>
                                    <option value="manager">Tier 2: Manager</option>
                                    <option value="admin">Tier 1: Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Access Token</label>
                                <div className="flex gap-2">
                                    <input type="text" className="flex-grow p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none font-mono font-bold text-blue-600" placeholder="Token" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                                    <button onClick={generateRandomToken} className="px-4 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"><Icon name="fas fa-random" /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                        <Button onClick={() => setIsCreateModalOpen(false)} variant="default">Cancel</Button>
                        <Button onClick={handleCreateUser} variant="primary" icon="fas fa-key">Activate Account</Button>
                    </div>
                </div>
            </Modal>
        </ManagePage>
    );
};

export default ManageUsersPage;
