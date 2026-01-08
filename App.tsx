
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { User, Notification as NotificationType, AuthUser } from './types';
import { AppContextProvider } from './context/AppContext';
import MainLayout from './components/layout/MainLayout';
import LandingPage from './components/layout/LandingPage';
import LoginModal from './components/auth/LoginModal';
import Notification from './components/ui/Notification';
import LegacyAppContainer from './components/modules/LegacyAppContainer';
import WorkManager from './components/modules/WorkManager';
import PayrollManager from './components/modules/PayrollManager';
import PublicFeedbackPortal from './components/portal/PublicFeedbackPortal';
import { kpiMonitorHtml } from './components/modules/moduleContent';
import * as db from './services/db';
import { 
    INITIAL_USER_DATA, 
    INITIAL_CLIENTS_DATA, 
    INITIAL_CONTACTS_DATA, 
    INITIAL_CENTRES_DATA, 
    INITIAL_FRAMING_DATA, 
    INITIAL_FINISH_DATA,
    APP_VERSION
} from './constants';

type Module = 'dashboard' | 'project-board' | 'kpi-monitor' | 'payroll-manager' | 'work-manager' | 'feedback-portal' | 'feedback-journal';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeModule, setActiveModule] = useState<Module>('dashboard');
    const [notification, setNotification] = useState<NotificationType | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [portalToken, setPortalToken] = useState<string | null>(null);

    const showNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    }, []);

    // Resilient Background Sync Logic
    useEffect(() => {
        const triggerSync = async () => {
            const meta = db.getSystemMeta();
            if (navigator.onLine && meta.driveAccessToken) {
                console.log("Auto Polling: Checking Cloud Vault & Inbox...");
                try {
                    // Corrected the number of arguments passed to syncWithCloud (was 3, should be 2)
                    await db.syncWithCloud(undefined, (code) => {
                        showNotification(`New Customer Feedback received for ${code}!`, 'warning');
                    });
                } catch (e) {}
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                triggerSync();
            }
        };

        window.addEventListener('online', triggerSync);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Periodic background check (every 2 mins for collaboration and feedback)
        const interval = setInterval(triggerSync, 120000);

        return () => {
            window.removeEventListener('online', triggerSync);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(interval);
        };
    }, [showNotification]);

    // Initialize Database
    useEffect(() => {
        const initDB = async () => {
            const meta = db.getSystemMeta();
            const existingUsers = db.getData<AuthUser>('users');
            
            // Check for Portal Token in URL
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('p_feedback');
            if (token) {
                setPortalToken(token);
                setActiveModule('feedback-portal');
            }

            // 1. Local Fallback Provisioning
            if (existingUsers.length === 0 && !meta.driveAccessToken) {
                db.saveData('users', INITIAL_USER_DATA as any);
                db.saveData('clients', INITIAL_CLIENTS_DATA as any);
                db.saveData('contacts', INITIAL_CONTACTS_DATA as any);
                db.saveData('centres', INITIAL_CENTRES_DATA as any);
                db.saveData('framingMaterials', INITIAL_FRAMING_DATA as any);
                db.saveData('finishMaterials', INITIAL_FINISH_DATA as any);
            }

            // 2. Silent Cloud Pull on Boot
            if (navigator.onLine && meta.driveAccessToken) {
                try {
                    await db.syncWithCloud();
                } catch (e) {
                    console.warn("Initial sync deferred.");
                }
            }
            
            setIsInitialized(true);
        };
        initDB();
    }, []);

    const contextValue = useMemo(() => ({
        currentUser,
        setCurrentUser,
        showNotification
    }), [currentUser, showNotification]);

    const handleLogin = (user: User) => {
        setCurrentUser(user);
        setActiveModule('dashboard');
    };

    const renderContent = () => {
        if (activeModule === 'feedback-portal' && portalToken) {
            return <PublicFeedbackPortal token={portalToken} />;
        }

        switch (activeModule) {
            case 'project-board':
            case 'feedback-journal':
                return <MainLayout onBack={() => setActiveModule('dashboard')} />;
            case 'kpi-monitor':
                return <LegacyAppContainer htmlContent={kpiMonitorHtml} title="KPI Monitor" onBack={() => setActiveModule('dashboard')} />;
            case 'payroll-manager':
                return <PayrollManager onBack={() => setActiveModule('dashboard')} onNavigate={setActiveModule} />;
            case 'work-manager':
                return <WorkManager onBack={() => setActiveModule('dashboard')} />;
            case 'dashboard':
            default:
                return <LandingPage onNavigate={setActiveModule} onLogout={() => setCurrentUser(null)} />;
        }
    };

    if (!isInitialized) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
                        <i className="fas fa-circle-notch animate-spin text-5xl text-blue-500 relative z-10"></i>
                    </div>
                    <div className="text-center animate-pulse">
                        <p className="font-black tracking-[0.4em] text-[10px] uppercase mb-1">Connecting</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase">AEWorks Secure Vault</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <AppContextProvider value={contextValue}>
            {(currentUser || activeModule === 'feedback-portal') ? renderContent() : <LoginModal onLogin={handleLogin} />}
            {notification && <Notification message={notification.message} type={notification.type} />}
        </AppContextProvider>
    );
};

export default App;
