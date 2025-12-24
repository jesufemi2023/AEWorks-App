
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { useAppContext } from '../../hooks/useAppContext';
import * as db from '../../services/db';
import { AuthUser } from '../../types';

interface ForcePasswordChangeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({ isOpen, onClose }) => {
    const { currentUser, showNotification } = useAppContext();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleUpdate = () => {
        if (!newPassword || newPassword.length < 6) {
            showNotification("Access Token must be at least 6 characters.", "warning");
            return;
        }
        if (newPassword !== confirmPassword) {
            showNotification("Tokens do not match.", "error");
            return;
        }
        if (newPassword === 'masterPassword123') {
            showNotification("Cannot use the factory default token.", "warning");
            return;
        }

        const users = db.getData<AuthUser>('users');
        const updatedUsers = users.map(u => 
            (u.username === currentUser?.username || u.email === currentUser?.email)
                ? { ...u, password: newPassword, updatedAt: new Date().toISOString() }
                : u
        );

        if (db.saveData('users', updatedUsers)) {
            showNotification("Security Token Updated Successfully.", "success");
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={() => {}} title="Security Protocol Update" titleIcon="fas fa-shield-alt">
            <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
                    <p className="font-bold mb-1">Mandatory Security Update Required</p>
                    <p>You are currently accessing the system using factory default credentials. For the integrity of the <strong>Global System Vault</strong>, you must establish a unique master access token.</p>
                </div>
                
                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">New Master Token</label>
                    <input 
                        type="password" 
                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-all outline-none" 
                        placeholder="Enter complex token"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                    />
                </div>
                
                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Confirm Token</label>
                    <input 
                        type="password" 
                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-all outline-none" 
                        placeholder="Repeat token"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <Button onClick={handleUpdate} variant="primary" icon="fas fa-key">Activate Master Key</Button>
                </div>
            </div>
        </Modal>
    );
};

export default ForcePasswordChangeModal;
