
import React, { useState, useEffect } from 'react';
import { User, AuthUser } from '../../types';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { useAppContext } from '../../hooks/useAppContext';
import * as db from '../../services/db';

interface LoginModalProps {
    onLogin: (user: User) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLogin }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState<'login' | 'setup'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [logo, setLogo] = useState<string | null>(db.getSystemLogo());
    const [config, setConfig] = useState(db.getSystemMeta());
    const { showNotification } = useAppContext();

    useEffect(() => {
        const localUsers = db.getData('users');
        const meta = db.getSystemMeta();
        // Automatically route to setup if no cloud link and no local users
        if (localUsers.length <= 1 && !meta.driveAccessToken) {
            setActiveTab('setup');
        }
        setConfig(db.getSystemMeta());
    }, []);

    const handleLogin = () => {
        const users = db.getData<AuthUser>('users');
        const cleanId = identifier.trim().toLowerCase();
        const cleanPw = password.trim();

        if (!cleanId || !cleanPw) {
            showNotification('Enter ID and Access Token.', 'warning');
            return;
        }
        
        const foundUser = users.find(u => 
            (u.email?.toLowerCase() === cleanId || u.username?.toLowerCase() === cleanId) && 
            u.password === cleanPw
        );

        if (foundUser) {
            const updatedUsers = users.map(u => u.id === foundUser.id ? { ...u, lastLogin: new Date().toISOString() } : u);
            db.saveData('users', updatedUsers);
            onLogin({ username: foundUser.username, email: foundUser.email, role: foundUser.role });
            showNotification(`Access Authorized.`, 'success');
        } else {
            showNotification('Identity Check Failed. Sync with Data Link if you are a new user.', 'error');
        }
    };

    const handleResetConfig = () => {
        if (confirm("Reset Enterprise Identity Bridge? This will refresh settings from global policy.")) {
            localStorage.removeItem('system_meta');
            const freshMeta = db.getSystemMeta();
            setConfig(freshMeta);
            showNotification("Bridge Reset to Corporate Policy.");
        }
    };

    const handleGoogleDriveSync = () => {
        if (!config.googleClientId) {
            showNotification("Critical Error: No Identity Key found.", "error");
            return;
        }

        setIsLoading(true);
        try {
            if (!(window as any).google?.accounts?.oauth2) {
                showNotification("Loading Google Auth Service...", "warning");
                setIsLoading(false);
                return;
            }

            const client = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: config.googleClientId,
                scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
                callback: async (response: any) => {
                    if (response.error) {
                        setIsLoading(false);
                        showNotification(`Google Error: ${response.error}`, "error");
                        return;
                    }
                    
                    const result = await db.syncWithCloud(response.access_token);
                    setIsLoading(false);
                    
                    if (result.success) {
                        showNotification(result.message, 'success');
                        setActiveTab('login');
                        setLogo(db.getSystemLogo());
                    } else {
                        showNotification(result.message, 'warning');
                    }
                },
                error_callback: (err: any) => {
                    setIsLoading(false);
                    setShowInstructions(true);
                    showNotification("Connection Blocked: Unauthorized Email.", "error");
                }
            });
            client.requestAccessToken();
        } catch (e) {
            showNotification("Auth System Offline.", "error");
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950 flex justify-center items-center z-50 p-4 overflow-y-auto">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_#3b82f6_0%,_transparent_70%)] pointer-events-none"></div>
            
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative border border-slate-100 animate-fade-in my-auto">
                <div className="flex border-b border-slate-100 bg-slate-50/50">
                    <button onClick={() => setActiveTab('login')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'login' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Icon name="fas fa-user-shield" className="mr-2" /> Identity
                    </button>
                    <button onClick={() => setActiveTab('setup')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'setup' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Icon name="fas fa-network-wired" className="mr-2" /> Enterprise Link
                    </button>
                </div>

                <div className="p-8 text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white border-4 border-slate-50 overflow-hidden p-2 shadow-xl">
                            {logo ? <img src={logo} alt="Logo" className="max-h-full max-w-full object-contain" /> : <Icon name="fas fa-industry" className="text-3xl text-blue-500" />}
                        </div>
                    </div>

                    {activeTab === 'login' ? (
                        <div className="space-y-4 animate-fade-in">
                            <div className="mb-6">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Portal Access</h3>
                                <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Authorized Personnel Only</p>
                            </div>
                            <div className="relative">
                                <Icon name="fas fa-user" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
                                <input type="text" placeholder="CORPORATE ID / EMAIL" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-full pl-12 pr-5 py-4 border border-slate-200 rounded-2xl text-[11px] font-black placeholder:text-slate-300 focus:border-blue-500 bg-slate-50 outline-none transition-all" />
                            </div>
                            <div className="relative">
                                <Icon name="fas fa-key" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
                                <input type="password" placeholder="ACCESS TOKEN" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="w-full pl-12 pr-5 py-4 border border-slate-200 rounded-2xl text-[11px] font-black placeholder:text-slate-300 focus:border-blue-500 bg-slate-50 outline-none transition-all" />
                            </div>
                            <Button onClick={handleLogin} variant="primary" size="lg" className="w-full py-4 text-[10px] tracking-[0.2em] uppercase font-black rounded-2xl shadow-xl shadow-blue-600/20">Unlock System</Button>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-fade-in text-left">
                            <div className="mb-4 text-center">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Enterprise Data Link</h3>
                                <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Infrastructure Synchronization</p>
                            </div>

                            <div className="p-5 bg-slate-900 text-white rounded-3xl shadow-lg mb-2 border border-blue-500/30">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-600/20"><Icon name="fas fa-server" /></div>
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-tight">Vault Protocol</h4>
                                        <p className="text-[8px] text-blue-400 uppercase tracking-widest font-bold">Global Data Policy Active</p>
                                    </div>
                                </div>
                                <p className="text-[9px] font-medium leading-relaxed opacity-80">
                                    Click the button below to establish a secure handshake with the managed corporate project repository.
                                </p>
                            </div>
                            
                            <Button onClick={handleGoogleDriveSync} variant="success" size="lg" disabled={isLoading} icon={isLoading ? "fas fa-sync animate-spin" : "fab fa-google"} className="w-full py-4 text-[9px] tracking-[0.12em] uppercase font-black rounded-2xl shadow-xl shadow-green-600/20 bg-blue-600 border-none hover:bg-blue-700">
                                {isLoading ? 'Verifying Identity...' : 'AUTHORIZE AEWORKS REPOSITORY'}
                            </Button>

                            <div className="pt-4 mt-2 border-t border-slate-100">
                                <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full text-center text-[8px] font-black text-slate-300 uppercase hover:text-slate-500 transition-colors tracking-[0.2em] mb-3">
                                    {showAdvanced ? 'Hide Technical Metadata' : 'View Identity Metadata'}
                                </button>
                                
                                {showAdvanced && (
                                    <div className="space-y-3 animate-fade-in">
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Identity key</label>
                                            <code className="block text-[8px] font-mono font-bold text-slate-500 break-all leading-relaxed">
                                                {config.googleClientId}
                                            </code>
                                        </div>
                                        <button onClick={handleResetConfig} className="w-full text-center text-[8px] font-black text-red-300 hover:text-red-500 transition-colors uppercase py-1">Refresh Global Policy</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="fixed bottom-6 text-center w-full pointer-events-none">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] opacity-30 text-center">AEWorks Enterprise v4.5 | Secure Repository</p>
            </div>
        </div>
    );
};

export default LoginModal;
