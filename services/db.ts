
export const generateId = () => {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
    } catch (e) {}
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export const getData = <T,>(key: string): T[] => {
    try {
        const data = localStorage.getItem(key);
        if (!data) return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
};

export const saveData = <T,>(key: string, data: T[]): boolean => {
    try {
        const timestamp = new Date().toISOString();
        const dataWithMeta = data.map(item => {
            if (item && typeof item === 'object') {
                const typed = item as any;
                let stableId = typed.id;
                if (key === 'users') stableId = typed.email || typed.username || typed.id;
                if (key === 'projects') stableId = typed.projectCode || typed.id;
                if (key === 'clients') stableId = typed.name || typed.id;

                return {
                    ...item,
                    id: stableId || generateId(),
                    updatedAt: typed.updatedAt || timestamp
                };
            }
            return item;
        });
        localStorage.setItem(key, JSON.stringify(dataWithMeta));
        // Trigger a global event so UI components know to refresh their local state
        window.dispatchEvent(new CustomEvent('aeworks_db_update', { detail: { key } }));
        return true;
    } catch (error) {
        return false;
    }
};

export const getSystemLogo = (): string | null => localStorage.getItem('system_logo');
export const saveSystemLogo = (base64Data: string | null): void => {
    if (base64Data) localStorage.setItem('system_logo', base64Data);
    else localStorage.removeItem('system_logo');
};

export interface SystemMeta {
    id: string;
    versionLabel: string;
    lastCloudSync?: string;
    syncApiKey: string; 
    autoSync: boolean;
    backupLocation?: string;
    driveFileId?: string;
    driveAccessToken?: string;
    googleClientId?: string; 
    connectedEmail?: string;
    driveFileUrl?: string;
    activeCollaborators?: string[];
}

const GLOBAL_ENV_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
const HARDCODED_FALLBACK_ID = '674092109435-96p21r75k1jgr7t1f0l4eohf5c49k23t.apps.googleusercontent.com';
const MASTER_CLIENT_ID = GLOBAL_ENV_CLIENT_ID || HARDCODED_FALLBACK_ID;

export const getSystemMeta = (): SystemMeta => {
    const raw = localStorage.getItem('system_meta');
    const defaultMeta: SystemMeta = { 
        id: 'meta', 
        versionLabel: 'v4.6 Multi-Dev Sync', 
        syncApiKey: '',
        autoSync: true,
        backupLocation: 'Google_Drive_AEWorks',
        googleClientId: MASTER_CLIENT_ID
    };
    if (!raw) return defaultMeta;
    try {
        const data = JSON.parse(raw);
        const meta = Array.isArray(data) ? data[0] : data;
        return { ...defaultMeta, ...meta };
    } catch {
        return defaultMeta;
    }
};

export const updateSystemMeta = (meta: Partial<SystemMeta>): void => {
    const current = getSystemMeta();
    localStorage.setItem('system_meta', JSON.stringify([{ ...current, ...meta }]));
};

export const DB_KEYS = ['clients', 'contacts', 'centres', 'framingMaterials', 'finishMaterials', 'projects', 'users', 'payrollRuns', 'defaultCostingVariables', 'productionLogs', 'locationExpenses'];
const MASTER_FILE_NAME = "AEWORKS_MASTER_VAULT.json";
const INBOX_FOLDER_NAME = "AEWORKS_INBOX";

const getDriveHeaders = (token: string) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
});

export const syncInboxFeedback = async (onNewFeedback?: (code: string) => void): Promise<{ success: boolean, count: number }> => {
    const meta = getSystemMeta();
    const token = meta.driveAccessToken;
    if (!token) return { success: false, count: 0 };

    try {
        const folderQuery = encodeURIComponent(`name='${INBOX_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
        const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${folderQuery}`, { headers: getDriveHeaders(token) });
        const folderData = await folderRes.json();
        
        if (!folderData.files || folderData.files.length === 0) return { success: true, count: 0 };
        const folderId = folderData.files[0].id;

        const filesQuery = encodeURIComponent(`'${folderId}' in parents and (mimeType='application/json' or mimeType='text/plain') and trashed=false`);
        const filesRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${filesQuery}&fields=files(id, name)`, { headers: getDriveHeaders(token) });
        const filesData = await filesRes.json();
        
        const files = filesData.files || [];
        if (files.length === 0) return { success: true, count: 0 };

        let processedCount = 0;
        const projects = getData<any>('projects');
        let updated = false;

        for (const file of files) {
            try {
                const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: getDriveHeaders(token) });
                const feedbackData = await contentRes.json();

                if (!feedbackData.code) continue;

                // Robust matching: Match full code or code without suffix
                const incomingCode = feedbackData.code.trim();
                const incomingCodeBase = incomingCode.split('.')[0];

                const projIdx = projects.findIndex((p: any) => {
                    const pCode = (p.projectCode || '').trim();
                    return pCode === incomingCode || pCode === incomingCodeBase || pCode.split('.')[0] === incomingCodeBase;
                });
                
                if (projIdx > -1) {
                    const project = projects[projIdx];
                    // Don't overwrite manually verified feedback unless explicitly updated
                    if (project.trackingData?.feedbackStatus !== 'verified') {
                        project.trackingData = {
                            ...(project.trackingData || {}),
                            customerFeedback: feedbackData.feedback,
                            feedbackStatus: 'received'
                        };
                        project.updatedAt = new Date().toISOString();
                        processedCount++;
                        updated = true;
                        if (onNewFeedback) onNewFeedback(project.projectCode);
                    }
                    // Delete processed file from Drive to clean the inbox
                    await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, { method: 'DELETE', headers: getDriveHeaders(token) });
                }
            } catch (e) {
                console.error(`Inbox error processing file ${file.name}:`, e);
            }
        }

        if (updated) {
            saveData('projects', projects);
            // CRITICAL: Push updated projects back to cloud immediately so other managers see the feedback
            await pushToCloud();
        }
        return { success: true, count: processedCount };
    } catch (err) {
        console.error("Inbox sync failed:", err);
        return { success: false, count: 0 };
    }
};

export const syncWithCloud = async (providedToken?: string, onNewFeedback?: (code: string) => void): Promise<{success: boolean, message: string}> => {
    const meta = getSystemMeta();
    const token = providedToken || meta.driveAccessToken;
    if (!token) return { success: false, message: "Drive Auth Required." };

    try {
        const query = encodeURIComponent(`name='${MASTER_FILE_NAME}' and trashed=false`);
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, modifiedTime)`, { headers: getDriveHeaders(token) });
        const searchData = await searchRes.json();
        const foundFile = (searchData.files || [])[0];

        if (!foundFile) {
            await pushToCloud();
            return { success: true, message: "New Vault Established." };
        }

        const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${foundFile.id}?alt=media`, { headers: getDriveHeaders(token) });
        const actualData = await fileRes.json();

        DB_KEYS.forEach(key => {
            const local = getData<any>(key);
            const remote = actualData[key] || [];
            const merged = mergeDatasets(key, local, remote);
            localStorage.setItem(key, JSON.stringify(merged));
        });

        updateSystemMeta({ driveFileId: foundFile.id, driveAccessToken: token, lastCloudSync: new Date().toISOString() });
        
        // Trigger Inbox Check after master sync
        await syncInboxFeedback(onNewFeedback);
        
        // Trigger Event for UI refresh
        window.dispatchEvent(new CustomEvent('aeworks_db_update', { detail: { key: 'all' } }));

        return { success: true, message: "Sync Complete." };
    } catch (err: any) {
        return { success: false, message: "Sync Error." };
    }
};

export const pushToCloud = async (): Promise<{success: boolean, message: string}> => {
    let meta = getSystemMeta();
    const token = meta.driveAccessToken;
    if (!token) return { success: false, message: "Offline." };

    try {
        const fullDB: any = { _meta: { lastPush: new Date().toISOString() } };
        DB_KEYS.forEach(key => fullDB[key] = getData(key));
        
        const metadata = { name: MASTER_FILE_NAME, mimeType: 'application/json' };
        let fileId = meta.driveFileId;

        if (!fileId) {
            const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST', headers: getDriveHeaders(token), body: JSON.stringify(metadata)
            });
            const createData = await createRes.json();
            fileId = createData.id;
            updateSystemMeta({ driveFileId: fileId });
        }

        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH', headers: getDriveHeaders(token), body: JSON.stringify(fullDB)
        });

        updateSystemMeta({ lastCloudSync: new Date().toISOString() });
        return { success: true, message: "Vault Updated." };
    } catch (err: any) {
        return { success: false, message: "Push Error." };
    }
};

const mergeDatasets = (dbKey: string, local: any[], remote: any[]) => {
    const map = new Map();
    const getStableId = (item: any) => {
        if (dbKey === 'users') return item.email || item.username || item.id;
        if (dbKey === 'projects') return item.projectCode || item.id;
        if (dbKey === 'clients') return item.name || item.id;
        return item.id;
    };
    remote.forEach(i => map.set(getStableId(i), i));
    local.forEach(i => {
        const id = getStableId(i);
        const rem = map.get(id);
        if (!rem || new Date(i.updatedAt || 0) > new Date(rem.updatedAt || 0)) map.set(id, i);
    });
    return Array.from(map.values());
};
