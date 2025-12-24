
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
        
        // Background push - non-blocking
        const meta = getSystemMeta();
        if (meta.driveAccessToken && navigator.onLine) {
            pushToCloud().catch(() => {});
        }
        
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
    googleClientId?: string; // The user's specific GCP Client ID
}

// Default Client ID used as fallback
const DEFAULT_CLIENT_ID = '674092109435-96p21r75k1jgr7t1f0l4eohf5c49k23t.apps.googleusercontent.com';

export const getSystemMeta = (): SystemMeta => {
    const raw = localStorage.getItem('system_meta');
    const envClientId = (process.env as any).VITE_GOOGLE_CLIENT_ID;
    
    const defaultMeta: SystemMeta = { 
        id: 'meta', 
        versionLabel: 'v4.5 Google Cloud', 
        syncApiKey: '',
        autoSync: true,
        backupLocation: 'Google_Drive_AEWorks',
        googleClientId: envClientId || DEFAULT_CLIENT_ID
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

export const DB_KEYS = ['clients', 'contacts', 'centres', 'framingMaterials', 'finishMaterials', 'projects', 'users', 'payrollRuns', 'defaultCostingVariables'];
const MASTER_FILE_NAME = "AEWORKS_MASTER_VAULT.json";

const getDriveHeaders = (token: string) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
});

export const syncWithCloud = async (providedToken?: string): Promise<{success: boolean, message: string}> => {
    const meta = getSystemMeta();
    const token = providedToken || meta.driveAccessToken;
    
    if (!token) return { success: false, message: "Drive Authorization Required." };

    try {
        const query = encodeURIComponent(`name='${MASTER_FILE_NAME}' and trashed=false`);
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id, name, modifiedTime)`, {
            headers: getDriveHeaders(token)
        });
        
        if (!searchRes.ok) {
            if (searchRes.status === 401) {
                updateSystemMeta({ driveAccessToken: undefined });
                return { success: false, message: "Auth Session Expired. Please reconnect." };
            }
            throw new Error(`Drive Error: ${searchRes.status}`);
        }
        
        const searchData = await searchRes.json();
        let fileId = searchData.files?.[0]?.id;

        if (!fileId) {
            updateSystemMeta({ driveAccessToken: token });
            return { success: true, message: "Cloud connected. No existing vault found. Initialize by clicking 'Commit' in the app." };
        }

        const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: getDriveHeaders(token)
        });
        
        if (!fileRes.ok) throw new Error("Vault Download Failed.");
        
        const actualData = await fileRes.json();

        DB_KEYS.forEach(key => {
            const local = getData<any>(key);
            const remote = actualData[key] || [];
            const merged = mergeDatasets(key, local, remote);
            localStorage.setItem(key, JSON.stringify(merged));
        });

        if (actualData._branding?.logo) saveSystemLogo(actualData._branding.logo);

        updateSystemMeta({ 
            driveFileId: fileId, 
            driveAccessToken: token,
            lastCloudSync: new Date().toISOString() 
        });

        return { success: true, message: "Cloud Vault Merged." };
    } catch (err) {
        console.error("Sync Failure:", err);
        return { success: false, message: "Sync Interrupted. Check connection." };
    }
};

export const pushToCloud = async () => {
    const meta = getSystemMeta();
    const token = meta.driveAccessToken;
    if (!token || !navigator.onLine) return;

    try {
        const fullDB: any = {
            _branding: { logo: getSystemLogo() },
            _meta: { ...meta, lastPush: new Date().toISOString() }
        };
        DB_KEYS.forEach(key => fullDB[key] = getData(key));

        let fileId = meta.driveFileId;

        if (!fileId) {
            const query = encodeURIComponent(`name='${MASTER_FILE_NAME}' and trashed=false`);
            const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
                headers: getDriveHeaders(token)
            });
            const searchData = await searchRes.json();
            fileId = searchData.files?.[0]?.id;
        }

        if (!fileId) {
            const metadata = { name: MASTER_FILE_NAME, mimeType: 'application/json' };
            const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: getDriveHeaders(token),
                body: JSON.stringify(metadata)
            });
            const createData = await createRes.json();
            fileId = createData.id;
            updateSystemMeta({ driveFileId: fileId });
        }

        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: getDriveHeaders(token),
            body: JSON.stringify(fullDB)
        });

        updateSystemMeta({ lastCloudSync: new Date().toISOString() });
    } catch (err) {
        console.warn("Deferred: Drive write pending.");
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

    remote.forEach(remoteItem => {
        const id = getStableId(remoteItem);
        if (id) map.set(id, remoteItem);
    });

    local.forEach(localItem => {
        const id = getStableId(localItem);
        if (!id) return;
        const remoteItem = map.get(id);
        if (!remoteItem || new Date(localItem.updatedAt || 0) > new Date(remoteItem.updatedAt || 0)) {
            map.set(id, localItem);
        }
    });
    
    return Array.from(map.values());
};
