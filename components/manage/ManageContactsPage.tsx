import React, { useRef, useState, useEffect } from 'react';
import ManagePage from './ManagePage';
import CrudTable, { Column } from './CrudTable';
import Button from '../ui/Button';
import { useProjectContext } from '../../hooks/useProjectContext';
import * as db from '../../services/db';
import { Contact } from '../../types';
import { useAppContext } from '../../hooks/useAppContext';
import { parseCSV, exportToCSV } from '../../services/csvService';

interface ManageContactsPageProps {
    goBack: () => void;
}

const ManageContactsPage: React.FC<ManageContactsPageProps> = ({ goBack }) => {
    const { contacts, setContacts } = useProjectContext();
    const { showNotification } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const columns: Column<Contact>[] = [
        { key: 'name', label: 'Full Name' },
        { 
            key: 'category', 
            label: 'Classification', 
            type: 'select',
            options: [
                { label: 'Staff - Permanent', value: 'Staff - Permanent' },
                { label: 'Staff - Contract', value: 'Staff - Contract' },
                { label: 'Prospect', value: 'Prospect' },
                { label: 'Supplier', value: 'Supplier' },
                { label: 'Sub Contractor', value: 'Sub Contractor' }
            ]
        },
        { key: 'designation', label: 'Title / Role' },
        { key: 'phone1', label: 'Phone Number' },
        { key: 'email1', label: 'Email Address' },
    ];

    const handleSave = (updatedData: Contact[]) => {
        if(db.saveData<Contact>('contacts', updatedData)) {
            setContacts(updatedData);
            showNotification('Registry synchronized successfully.', 'success');
        } else {
            showNotification('Write failed. Check system logs.', 'error');
        }
    };
    
    const createNewItem = (): Contact => ({
        id: db.generateId(),
        name: 'New Entity',
        designation: 'General',
        category: 'Staff - Contract',
        phone1: '',
        email1: '',
        updatedAt: new Date().toISOString()
    });

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const expectedHeaders = ['Name', 'Designation', 'Phone', 'Email', 'Category'];
            const result = parseCSV(text, expectedHeaders);

            if (result.error) {
                showNotification(result.error, 'error');
                return;
            }

            const importedData = result.data.map(row => ({
                id: db.generateId(),
                name: (row.name || 'Imported').trim(),
                designation: (row.designation || 'N/A').trim(),
                category: (row.category || 'Staff - Contract') as any,
                phone1: (row.phone || row.phone1 || '').trim(),
                email1: (row.email || row.email1 || '').trim(),
                updatedAt: new Date().toISOString()
            })) as Contact[];

            if (importedData.length > 0) {
                const combinedData = [...contacts, ...importedData];
                handleSave(combinedData);
                showNotification(`${importedData.length} entities imported.`);
            }
        };
        reader.readAsText(file);
        if (event.target) event.target.value = '';
    };

    return (
        <ManagePage title="Personnel & Relationship Vault" icon="fas fa-address-card" goBack={goBack}>
            <div className="mb-6 bg-blue-50 border border-blue-100 p-5 rounded-2xl shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <i className="fas fa-info-circle"></i>
                    </div>
                    <div>
                        <h4 className="font-black text-blue-900 uppercase text-xs tracking-widest mb-1">Entity Management Protocol</h4>
                        <p className="text-xs text-blue-800 leading-relaxed max-w-2xl">
                            All staff and external partners must be registered here. Use the <strong>Classification</strong> dropdown to distinguish between internal resources (Staff) and external leads (Prospects).
                        </p>
                    </div>
                </div>
            </div>

            <div className="my-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap gap-4 items-center justify-between shadow-inner">
                <div className="flex gap-2">
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImport} className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} variant="warning" icon="fas fa-upload" size="sm">Bulk Import CSV</Button>
                    <Button onClick={() => exportToCSV(contacts, ['name', 'category', 'designation', 'phone1', 'email1'], 'Contacts_Master')} variant="outline" icon="fas fa-download" size="sm">Download registry</Button>
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Live Registry Access: Level 1-2 only
                </div>
            </div>

            <CrudTable<Contact>
                columns={columns}
                data={contacts}
                onSave={handleSave}
                newItemFactory={createNewItem}
                itemName="Record"
            />
        </ManagePage>
    );
};

export default ManageContactsPage;