
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
    const [logo, setLogo] = useState<string | null>(db.getSystemLogo());
    const [config, setConfig] = useState(db.getSystemMeta());
    const { showNotification } = useAppContext();

    const currentOrigin = window.location.origin;

    useEffect(() => {
        const localUsers = db.getData('users');
        const meta = db.getSystemMeta();
        if (localUsers.length <= 1 && !meta.driveAccessToken) {
            setActiveTab('setup');
        }
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
            showNotification('Identity Check Failed. Sync with Drive if using a new device.', 'error');
        }
    };

    const handleClientIdChange = (val: string) => {
        const cleanVal = val.trim();
        setConfig(prev => ({ ...prev, googleClientId: cleanVal }));
        db.updateSystemMeta({ googleClientId: cleanVal });
    };

    const handleResetConfig = () => {
        if (confirm("Reset to factory Client ID? This will clear your custom Google connection settings.")) {
            localStorage.removeItem('system_meta');
            const freshMeta = db.getSystemMeta();
            setConfig(freshMeta);
            showNotification("Configuration Reset.");
        }
    };

    const copyOrigin = () => {
        navigator.clipboard.writeText(currentOrigin);
        showNotification("Origin URL copied to clipboard!");
    };

    const handleGoogleDriveSync = () => {
        if (!config.googleClientId) {
            showNotification("Please enter a Google Client ID.", "warning");
            return;
        }

        setIsLoading(true);
        try {
            if (!(window as any).google?.accounts?.oauth2) {
                showNotification("Loading Google Auth...", "warning");
                setIsLoading(false);
                return;
            }

            const client = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: config.googleClientId,
                scope: 'https://www.googleapis.com/auth/drive.file',
                callback: async (response: any) => {
                    if (response.error) {
                        console.error("OAuth Error:", response);
                        setIsLoading(false);
                        if (response.error === 'popup_closed_by_user') {
                            showNotification("Login window closed.", "warning");
                        } else {
                            showNotification(`Google Error: ${response.error}`, "error");
                        }
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
                    console.error("GIS Error:", err);
                    setIsLoading(false);
                    setShowInstructions(true);
                    showNotification("Blocked: Please check the 'Test Users' guide below.", "error");
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
                        <Icon name="fab fa-google-drive" className="mr-2" /> Cloud Bridge
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
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Portal Login</h3>
                                <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Personnel Access Only</p>
                            </div>
                            <div className="relative">
                                <Icon name="fas fa-user" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
                                <input type="text" placeholder="STAFF ID / EMAIL" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-full pl-12 pr-5 py-4 border border-slate-200 rounded-2xl text-[11px] font-black placeholder:text-slate-300 focus:border-blue-500 bg-slate-50 outline-none transition-all" />
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
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Cloud Bridge</h3>
                                <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Configure Remote Sync</p>
                            </div>

                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl mb-2">
                                <h4 className="text-[9px] font-black text-blue-900 uppercase tracking-tight mb-2 flex items-center justify-between">
                                    <span>Authorized Origin</span>
                                    <button onClick={copyOrigin} className="text-blue-600 hover:text-blue-800"><Icon name="fas fa-copy" /></button>
                                </h4>
                                <code className="block text-[10px] font-mono font-bold text-blue-700 break-all bg-white p-2 rounded-lg border border-blue-200">
                                    {currentOrigin}
                                </code>
                                <p className="text-[8px] text-blue-600 mt-2 font-bold uppercase leading-tight italic">
                                    * Add this to "Authorized JavaScript Origins" in GCP Console.
                                </p>
                            </div>
                            
                            {showInstructions && (
                                <div className="p-4 bg-red-600 text-white rounded-2xl shadow-lg animate-fade-in">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Icon name="fas fa-exclamation-triangle" /> Critical Fix: Test Users
                                    </h4>
                                    <p className="text-[9px] font-bold leading-relaxed mb-3 opacity-90">
                                        Google blocks new connections until your email is added as a "Test User".
                                    </p>
                                    <div className="bg-white/10 p-2 rounded-lg space-y-2 text-[8px] font-black uppercase tracking-tight">
                                        <p>1. Go to "OAuth Consent Screen" in GCP</p>
                                        <p>2. Scroll to "Test Users"</p>
                                        <p>3. Add your Gmail address and Save</p>
                                    </div>
                                    <button onClick={() => setShowInstructions(false)} className="mt-3 w-full py-2 bg-white text-red-600 rounded-lg text-[9px] font-black uppercase">I've Added My Email</button>
                                </div>
                            )}
                            
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Google Client ID</label>
                                <textarea value={config.googleClientId} onChange={(e) => handleClientIdChange(e.target.value)} rows={2} className="w-full p-3 border border-slate-200 rounded-xl text-[9px] font-mono font-bold bg-slate-50 outline-none focus:border-blue-500" placeholder="Enter Client ID from GCP" />
                            </div>
                            
                            <Button onClick={handleGoogleDriveSync} variant="success" size="lg" disabled={isLoading} icon={isLoading ? "fas fa-sync animate-spin" : "fab fa-google"} className="w-full py-4 text-[10px] tracking-[0.2em] uppercase font-black rounded-2xl shadow-xl shadow-green-600/20 bg-slate-900 border-none">
                                {isLoading ? 'Verifying...' : 'Authorize Drive Bridge'}
                            </Button>
                            
                            <button onClick={handleResetConfig} className="w-full text-center text-[8px] font-black text-slate-300 uppercase hover:text-red-400 transition-colors py-2 tracking-widest">Reset Identity Config</button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="fixed bottom-6 text-center w-full pointer-events-none">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] opacity-30">AEWorks v4.5 Enterprise Bridge</p>
            </div>
        </div>
    );
};

export default LoginModal;
