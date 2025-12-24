import React, { useRef } from 'react';
import ManagePage from './ManagePage';
import CrudTable from './CrudTable';
import { useProjectContext } from '../../hooks/useProjectContext';
import * as db from '../../services/db';
import { Client } from '../../types';
import { useAppContext } from '../../hooks/useAppContext';
import Button from '../ui/Button';
import { exportToCSV, parseCSV } from '../../services/csvService';

interface ManageClientsPageProps {
    goBack: () => void;
}

const ManageClientsPage: React.FC<ManageClientsPageProps> = ({ goBack }) => {
    const { clients, setClients } = useProjectContext();
    const { showNotification } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const columns: { key: keyof Client; label: string; }[] = [
        { key: 'mgr', label: 'Primary Contact' },
        { key: 'name', label: 'Organization Name' },
        { key: 'phone', label: 'Direct Phone' },
        { key: 'email', label: 'Direct Email' },
        { key: 'address', label: 'Office Address' },
        { key: 'destination', label: 'Shipping Dest.' },
    ];

    const handleSave = (updatedClients: Client[]) => {
        if(db.saveData<Client>('clients', updatedClients)) {
            setClients(db.getData<Client>('clients'));
            showNotification('Customer repository synchronized!');
        } else {
            showNotification('Database write error.', 'error');
        }
    };
    
    const createNewItem = (): Client => ({
        id: db.generateId(),
        mgr: 'N/A',
        name: 'New Corporate Customer',
        phone: '',
        email: '',
        address: '',
        destination: 'Lagos',
        updatedAt: new Date().toISOString()
    });

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const headers = ['mgr', 'name', 'phone', 'email', 'address', 'destination'];
            const result = parseCSV(text, headers);

            if (result.error) {
                showNotification(result.error, 'error');
                return;
            }

            const imported: Client[] = result.data.map(d => ({
                id: db.generateId(),
                mgr: d.mgr || 'N/A',
                name: d.name || 'Imported Entry',
                phone: d.phone || '',
                email: d.email || '',
                address: d.address || '',
                destination: d.destination || 'Lagos',
                updatedAt: new Date().toISOString()
            }));

            if(imported.length > 0) {
                const merged = [...clients, ...imported];
                handleSave(merged);
                showNotification(`Linked ${imported.length} customer records.`);
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = '';
    };

    return (
        <ManagePage title="Customer & Client Relations" icon="fas fa-building" goBack={goBack}>
             <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2">
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImport} className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} variant="warning" icon="fas fa-upload" size="sm">Bulk Import</Button>
                    <Button onClick={() => exportToCSV(clients, ['mgr', 'name', 'phone', 'email', 'address', 'destination'], 'Customer_Base')} variant="outline" icon="fas fa-download" size="sm">Export CSV</Button>
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Automated Sync: Stage 1+ Projects Auto-Register Customers
                </div>
             </div>
            <CrudTable<Client>
                columns={columns}
                data={clients}
                onSave={handleSave}
                newItemFactory={createNewItem}
                itemName="Customer"
            />
        </ManagePage>
    );
};

export default ManageClientsPage;