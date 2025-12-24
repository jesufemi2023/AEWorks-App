import React from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import Button from '../ui/Button';

const UserBar: React.FC = () => {
    const { currentUser, setCurrentUser } = useAppContext();

    const handleLogout = () => {
        setCurrentUser(null);
    };

    if (!currentUser) return null;

    return (
        <div className="bg-slate-900 text-white p-3 rounded-t-lg flex justify-between items-center">
            <div>
                Logged in as <strong className="font-semibold">{currentUser.username}</strong> ({currentUser.role})
            </div>
            <Button onClick={handleLogout} variant="danger" size="sm" icon="fas fa-sign-out-alt">
                Logout
            </Button>
        </div>
    );
};

export default UserBar;