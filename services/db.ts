
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
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlClientId = urlParams.get('cid');

    if (urlClientId) {
        let existing: any = {};
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                existing = Array.isArray(parsed) ? parsed[0] : parsed;
            } catch (e) {}
        }
        localStorage.setItem('system_meta', JSON.stringify([{ ...defaultMeta, ...existing, googleClientId: urlClientId }]));
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        return { ...defaultMeta, ...existing, googleClientId: urlClientId };
    }
    
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

const extractErrorMessage = async (response: Response): Promise<string> => {
    try {
        const body = await response.json();
        return body.error?.message || `HTTP Error: ${response.status}`;
    } catch {
        return `Unexpected Status: ${response.status}`;
    }
};

/**
 * Searches for feedback files in the AEWORKS_INBOX folder on Google Drive
 * and integrates them into the local projects database.
 */
export const syncInboxFeedback = async (): Promise<{ success: boolean, count: number, message: string }> => {
    const meta = getSystemMeta();
    const token = meta.driveAccessToken;
    if (!token) return { success: false, count: 0, message: "Cloud link inactive." };

    try {
        // 1. Find the Inbox Folder
        const folderQuery = encodeURIComponent(`name='${INBOX_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
        const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${folderQuery}`, { headers: getDriveHeaders(token) });
        const folderData = await folderRes.json();
        
        if (!folderData.files || folderData.files.length === 0) {
            return { success: true, count: 0, message: "Inbox folder not found or empty." };
        }

        const folderId = folderData.files[0].id;

        // 2. List JSON files in that folder
        const filesQuery = encodeURIComponent(`'${folderId}' in parents and mimeType='application/json' and trashed=false`);
        const filesRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${filesQuery}&fields=files(id, name)`, { headers: getDriveHeaders(token) });
        const filesData = await filesRes.json();
        
        const files = filesData.files || [];
        if (files.length === 0) return { success: true, count: 0, message: "No new feedback in inbox." };

        let processedCount = 0;
        const projects = getData<any>('projects');
        let updated = false;

        for (const file of files) {
            try {
                // Download file content
                const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: getDriveHeaders(token) });
                const feedbackData = await contentRes.json();

                // Match with project
                const projIdx = projects.findIndex((p: any) => p.projectCode === feedbackData.code);
                if (projIdx > -1) {
                    const project = projects[projIdx];
                    // Update project tracking data
                    project.trackingData = {
                        ...(project.trackingData || {}),
                        customerFeedback: feedbackData.feedback,
                        feedbackStatus: 'received' // Received but unverified
                    };
                    project.updatedAt = new Date().toISOString();
                    processedCount++;
                    updated = true;

                    // Delete file from Drive after successful import to clear the inbox
                    await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
                        method: 'DELETE',
                        headers: getDriveHeaders(token)
                    });
                }
            } catch (e) {
                console.error(`Error processing feedback file ${file.name}:`, e);
            }
        }

        if (updated) {
            saveData('projects', projects);
        }

        return { 
            success: true, 
            count: processedCount, 
            message: processedCount > 0 ? `Imported ${processedCount} feedback records.` : "No matching projects for feedback in inbox." 
        };
    } catch (err: any) {
        return { success: false, count: 0, message: err.message || "Inbox sync failed." };
    }
};

export const syncWithCloud = async (providedToken?: string, excludeId?: string): Promise<{success: boolean, message: string}> => {
    const meta = getSystemMeta();
    const token = providedToken || meta.driveAccessToken;
    
    if (!token) return { success: false, message: "Drive Authorization Required." };

    try {
        let email = meta.connectedEmail;
        try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: getDriveHeaders(token) });
            if (userRes.ok) {
                const userData = await userRes.json();
                email = userData.email;
            }
        } catch (e) {}

        const query = encodeURIComponent(`name='${MASTER_FILE_NAME}' and trashed=false`);
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id, name, modifiedTime, webViewLink)`, {
            headers: getDriveHeaders(token)
        });
        
        if (!searchRes.ok) {
            const msg = await extractErrorMessage(searchRes);
            if (searchRes.status === 401) {
                updateSystemMeta({ driveAccessToken: undefined, connectedEmail: undefined });
                return { success: false, message: `Auth Session Expired. (${msg})` };
            }
            throw new Error(msg);
        }
        
        const searchData = await searchRes.json();
        const foundFiles = searchData.files || [];
        let fileId = foundFiles.find((f: any) => f.id !== excludeId)?.id || meta.driveFileId;
        let fileUrl = foundFiles.find((f: any) => f.id !== excludeId)?.webViewLink || meta.driveFileUrl;

        if (!fileId || fileId === excludeId) {
            updateSystemMeta({ driveAccessToken: token, connectedEmail: email, driveFileId: undefined });
            const pushResult = await pushToCloud(excludeId);
            if (pushResult.success) {
                return { success: true, message: `Shared Vault Initialized on Drive (${email})` };
            }
            return { success: true, message: `Connected as ${email}. Initial commit pending.` };
        }

        const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: getDriveHeaders(token)
        });
        
        if (!fileRes.ok) {
            const msg = await extractErrorMessage(fileRes);
            if (fileRes.status === 404) {
                updateSystemMeta({ driveFileId: undefined, driveFileUrl: undefined });
                return syncWithCloud(token, fileId);
            }
            throw new Error(`Vault download failed: ${msg}`);
        }
        
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
            driveFileUrl: fileUrl,
            connectedEmail: email,
            lastCloudSync: new Date().toISOString() 
        });

        // Trigger an inbox check after the main vault sync
        await syncInboxFeedback();

        return { success: true, message: `Synced with Team Repository (${email})` };
    } catch (err: any) {
        console.error("Sync Failure:", err);
        return { success: false, message: err.message || "Cloud unreachable or network error." };
    }
};

export const pushToCloud = async (excludeId?: string): Promise<{success: boolean, message: string}> => {
    let meta = getSystemMeta();
    const token = meta.driveAccessToken;
    if (!token) return { success: false, message: "No active Drive link. Authorization required." };
    if (!navigator.onLine) return { success: false, message: "Device is offline. Cannot reach Drive." };

    try {
        const fullDB: any = {
            _branding: { logo: getSystemLogo() },
            _meta: { ...meta, lastPush: new Date().toISOString() }
        };
        DB_KEYS.forEach(key => fullDB[key] = getData(key));

        let fileId = meta.driveFileId;
        let fileUrl = meta.driveFileUrl;

        if (fileId === excludeId) {
            fileId = undefined;
            fileUrl = undefined;
        }

        if (!fileId) {
            const query = encodeURIComponent(`name='${MASTER_FILE_NAME}' and trashed=false`);
            const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, webViewLink)`, {
                headers: getDriveHeaders(token)
            });
            
            if (!searchRes.ok) {
                const msg = await extractErrorMessage(searchRes);
                if (searchRes.status === 401) {
                    updateSystemMeta({ driveAccessToken: undefined });
                    return { success: false, message: "Authorization expired. Please re-link." };
                }
                throw new Error(msg);
            }
            
            const searchData = await searchRes.json();
            const foundFiles = searchData.files || [];
            const validFile = foundFiles.find((f: any) => f.id !== excludeId);
            
            if (validFile) {
                fileId = validFile.id;
                fileUrl = validFile.webViewLink;
            }
        }

        if (!fileId) {
            const metadata = { name: MASTER_FILE_NAME, mimeType: 'application/json' };
            const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,webViewLink', {
                method: 'POST',
                headers: getDriveHeaders(token),
                body: JSON.stringify(metadata)
            });
            if (!createRes.ok) {
                const msg = await extractErrorMessage(createRes);
                throw new Error(msg);
            }
            const createData = await createRes.json();
            fileId = createData.id;
            fileUrl = createData.webViewLink;
            updateSystemMeta({ driveFileId: fileId, driveFileUrl: fileUrl });
        }

        const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: getDriveHeaders(token),
            body: JSON.stringify(fullDB)
        });

        if (!uploadRes.ok) {
            const msg = await extractErrorMessage(uploadRes);
            if (uploadRes.status === 401) {
                updateSystemMeta({ driveAccessToken: undefined });
                return { success: false, message: "Session expired while uploading." };
            }
            if (uploadRes.status === 404) {
                updateSystemMeta({ driveFileId: undefined, driveFileUrl: undefined });
                return pushToCloud(fileId);
            }
            throw new Error(msg);
        }

        updateSystemMeta({ driveFileId: fileId, driveFileUrl: fileUrl, lastCloudSync: new Date().toISOString() });
        return { success: true, message: "Pushed to Shared Vault successfully." };
    } catch (err: any) {
        return { success: false, message: err.message || "Unknown Cloud Error." };
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
