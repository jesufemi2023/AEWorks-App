
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
            showNotification('Access Registry Synchronized.');
        }
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
            showNotification(`Account provisioned for ${newAccount.username}.`, 'success');
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
                        Please contact your IT department for access key provisioning.
                    </p>
                    <Button onClick={goBack} variant="outline" className="mt-8 border-red-200 text-red-700 hover:bg-red-100">Return to Operations</Button>
                </div>
            </ManagePage>
        );
    }

    return (
        <ManagePage title="Access Key Management" icon="fas fa-user-shield" goBack={goBack}>
            <div className="flex flex-col lg:flex-row gap-6 mb-8">
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex-grow">
                    <h4 className="text-lg font-black flex items-center gap-3 mb-2 uppercase tracking-tighter">
                        <Icon name="fas fa-terminal" className="text-blue-400" />
                        Administrative Registry
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Manage individual access keys and tier permissions. 
                        Level 1 Admins have root control. Level 2 Managers can edit projects. 
                        Level 3 Viewers are restricted to read-only access.
                    </p>
                </div>
                <div className="shrink-0 flex items-center">
                    <Button onClick={() => setIsCreateModalOpen(true)} variant="primary" icon="fas fa-user-plus" size="lg" className="px-8 shadow-xl shadow-blue-500/20">
                        Provision New Account
                    </Button>
                </div>
            </div>

            <CrudTable<AuthUser>
                columns={columns}
                data={users}
                onSave={handleSaveList}
                newItemFactory={() => ({ id: db.generateId(), username: '', email: '', password: '', role: 'viewer' })}
                itemName="Access Key"
                hideAddButton={true} // We use our custom modal instead for tiered users
            />
            
            {/* User Provisioning Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Provision Tiered Account" titleIcon="fas fa-user-shield">
                <div className="space-y-6">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-900 text-xs leading-relaxed">
                        <Icon name="fas fa-info-circle" className="mr-2" />
                        Provisioning a new account creates a unique Identity & Access token. 
                        Ensure the email provided is valid for disaster recovery purposes.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Login ID / Username</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-all outline-none font-bold" 
                                    placeholder="e.g. O.Abe"
                                    value={newUser.username}
                                    onChange={e => setNewUser({...newUser, username: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">System Email</label>
                                <input 
                                    type="email" 
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-all outline-none" 
                                    placeholder="staff@aeworks.com"
                                    value={newUser.email}
                                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Access Level (Tier)</label>
                                <select 
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-all outline-none font-bold"
                                    value={newUser.role}
                                    onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                                >
                                    <option value="viewer">Tier 3: Project Viewer (Read-Only)</option>
                                    <option value="manager">Tier 2: Operations Manager (Full Access)</option>
                                    <option value="admin">Tier 1: System Administrator (Root)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Secure Access Token</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        className="flex-grow p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-all outline-none font-mono font-bold text-blue-600" 
                                        placeholder="Min 6 chars"
                                        value={newUser.password}
                                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                                    />
                                    <button 
                                        onClick={generateRandomToken}
                                        className="px-4 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
                                        title="Generate secure token"
                                    >
                                        <Icon name="fas fa-random" />
                                    </button>
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

            <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-5">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="fas fa-info-circle" className="text-blue-600 text-xl" />
                </div>
                <div className="text-sm text-blue-900 leading-relaxed">
                    <strong className="block mb-1 uppercase tracking-wider text-xs font-black">Authentication Protocol</strong>
                    Users can authenticate using either their <strong>Login ID</strong> or <strong>System Email</strong>. 
                    Tokens are case-sensitive and should be treated as sensitive corporate keys. 
                    Revoke tokens immediately if a device is compromised or staff exits the organization.
                </div>
            </div>
        </ManagePage>
    );
};

export default ManageUsersPage;
