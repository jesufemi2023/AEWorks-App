import React, { useState, useRef, useEffect } from 'react';
import ManagePage from './ManagePage';
import CrudTable from './CrudTable';
import { useProjectContext } from '../../hooks/useProjectContext';
import * as db from '../../services/db';
import { FramingMaterial, FinishMaterial } from '../../types';
import { useAppContext } from '../../hooks/useAppContext';
import Button from '../ui/Button';
import { parseCSV, exportToCSV } from '../../services/csvService';
import Icon from '../ui/Icon';

interface ManageMaterialsPageProps {
    goBack: () => void;
}

const ManageMaterialsPage: React.FC<ManageMaterialsPageProps> = ({ goBack }) => {
    const [activeTab, setActiveTab] = useState<'framing' | 'finishes'>('framing');
    const { framingMaterials, setFramingMaterials, finishMaterials, setFinishMaterials } = useProjectContext();
    const { showNotification } = useAppContext();

    const framingImportRef = useRef<HTMLInputElement>(null);
    const finishesImportRef = useRef<HTMLInputElement>(null);

    // Refresh local lists from DB on load
    useEffect(() => {
        setFramingMaterials(db.getData('framingMaterials'));
        setFinishMaterials(db.getData('finishMaterials'));
    }, [setFramingMaterials, setFinishMaterials]);

    const framingColumns: { key: keyof FramingMaterial; label: string; }[] = [
        { key: 'MATERIAL / GROUP', label: 'Category' },
        { key: 'FRAMING MATERIALS', label: 'Material Name' },
        { key: 'RATE', label: 'Rate (₦)' },
        { key: 'Surface Area', label: 'SA Factor (m²/m)' },
    ];

    const finishesColumns: { key: keyof FinishMaterial; label: string; }[] = [
        { key: 'MATERIAL / GROUP', label: 'Category' },
        { key: 'NAME - MATERIAL', label: 'Accessory Name' },
        { key: 'PRICE', label: 'Price (₦)' },
        { key: 'Coverage', label: 'Coverage (m²)' },
    ];

    const handleFramingSave = (data: FramingMaterial[]) => {
        if(db.saveData('framingMaterials', data)) {
            setFramingMaterials(db.getData('framingMaterials'));
            showNotification('Framing catalog updated!');
        }
    };
    
    const handleFinishesSave = (data: FinishMaterial[]) => {
        if(db.saveData('finishMaterials', data)) {
            setFinishMaterials(db.getData('finishMaterials'));
            showNotification('Finishes catalog updated!');
        }
    };

    const newFramingItem = (): FramingMaterial => ({
        id: db.generateId(), 
        'MATERIAL / GROUP': 'UNGROUPED', 
        'FRAMING MATERIALS': 'New Material Entry', 
        'RATE': '0', 
        'Surface Area': '0',
        updatedAt: new Date().toISOString()
    });

    const newFinishItem = (): FinishMaterial => ({
        id: db.generateId(), 
        'MATERIAL / GROUP': 'UNGROUPED', 
        'NAME - MATERIAL': 'New Accessory Entry', 
        'PRICE': '0', 
        'Coverage': '0',
        updatedAt: new Date().toISOString()
    });
    
    // Generic file import handler
    const handleFileImport = (
        event: React.ChangeEvent<HTMLInputElement>,
        expectedHeaders: string[],
        currentData: any[],
        saveFunction: (data: any[]) => void,
        keyMap: { [key: string]: string },
        nameKey: string
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const result = parseCSV(text, expectedHeaders);

            if (result.error) {
                showNotification(result.error, 'error');
                return;
            }

            const importedData = result.data
                .map(row => {
                    const mappedRow: { [key: string]: any } = { id: db.generateId(), updatedAt: new Date().toISOString() };
                    for (const csvHeader in keyMap) {
                        const modelKey = keyMap[csvHeader];
                        const actualHeader = Object.keys(row).find(h => h.toLowerCase() === csvHeader.toLowerCase());
                        if (actualHeader) {
                            mappedRow[modelKey] = row[actualHeader].replace(/"/g, '').replace(/,/g, '');
                        }
                    }
                    return mappedRow;
                })
                .filter(item => item[nameKey] && item[nameKey].trim().toLowerCase() !== 'none' && item[nameKey].trim() !== '');

            if (importedData.length > 0) {
                const combinedData = [...currentData, ...importedData];
                saveFunction(combinedData);
                showNotification(`Import success: ${importedData.length} entries added.`);
            } else {
                showNotification('No valid entries found in CSV.', 'warning');
            }
        };
        reader.readAsText(file);
        if (event.target) event.target.value = '';
    };

    // Specific handler for framing materials
    const handleFramingImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileImport(
            e,
            ['MATERIAL / GROUP', 'FRAMING MATERIALS', 'RATE', 'Surface Area'],
            framingMaterials,
            handleFramingSave,
            {
                'MATERIAL / GROUP': 'MATERIAL / GROUP',
                'FRAMING MATERIALS': 'FRAMING MATERIALS',
                'RATE': 'RATE',
                'Surface Area': 'Surface Area'
            },
            'FRAMING MATERIALS'
        );
    };

    // Specific handler for finishes materials
    const handleFinishesImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileImport(
            e,
            ['MATERIAL / GROUP', 'NAME - MATERIAL', 'PRICE', 'Coverage'],
            finishMaterials,
            handleFinishesSave,
            {
                'MATERIAL / GROUP': 'MATERIAL / GROUP',
                'NAME - MATERIAL': 'NAME - MATERIAL',
                'PRICE': 'PRICE',
                'Coverage': 'Coverage'
            },
            'NAME - MATERIAL'
        );
    };

    return (
        <ManagePage title="Production Materials Vault" icon="fas fa-boxes" goBack={goBack}>
            <div className="flex border-b border-slate-200 mb-8 bg-slate-50 p-2 rounded-t-xl gap-2">
                <button 
                    onClick={() => setActiveTab('framing')} 
                    className={`flex-1 py-4 px-6 text-sm font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-3 ${activeTab === 'framing' ? 'bg-white text-blue-700 shadow-md border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Icon name="fas fa-vector-square" /> Framing Sections
                </button>
                <button 
                    onClick={() => setActiveTab('finishes')} 
                    className={`flex-1 py-4 px-6 text-sm font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-3 ${activeTab === 'finishes' ? 'bg-white text-blue-700 shadow-md border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Icon name="fas fa-fill-drip" /> Finishes & Accessories
                </button>
            </div>
            
            {activeTab === 'framing' && (
                <div className="animate-fade-in">
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-sm">
                        <div className="flex gap-2">
                            <input type="file" accept=".csv" ref={framingImportRef} onChange={handleFramingImport} className="hidden" />
                            <Button onClick={() => framingImportRef.current?.click()} variant="warning" icon="fas fa-upload" size="sm">Import CSV</Button>
                            <Button onClick={() => exportToCSV(framingMaterials, ['MATERIAL / GROUP', 'FRAMING MATERIALS', 'RATE', 'Surface Area'], 'Framing_Catalog')} variant="outline" icon="fas fa-download" size="sm">Export Catalog</Button>
                        </div>
                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-blue-200">
                           Headers Required: MATERIAL / GROUP, FRAMING MATERIALS, RATE, Surface Area
                        </div>
                    </div>
                    <CrudTable<FramingMaterial> columns={framingColumns} data={framingMaterials} onSave={handleFramingSave} newItemFactory={newFramingItem} itemName="Framing Material"/>
                </div>
            )}

            {activeTab === 'finishes' && (
                 <div className="animate-fade-in">
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-sm">
                        <div className="flex gap-2">
                            <input type="file" accept=".csv" ref={finishesImportRef} onChange={handleFinishesImport} className="hidden" />
                            <Button onClick={() => finishesImportRef.current?.click()} variant="warning" icon="fas fa-upload" size="sm" className="bg-emerald-600 hover:bg-emerald-700">Import CSV</Button>
                            <Button onClick={() => exportToCSV(finishMaterials, ['MATERIAL / GROUP', 'NAME - MATERIAL', 'PRICE', 'Coverage'], 'Finishes_Catalog')} variant="outline" icon="fas fa-download" size="sm">Export Catalog</Button>
                        </div>
                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-emerald-200">
                           Headers Required: MATERIAL / GROUP, NAME - MATERIAL, PRICE, Coverage
                        </div>
                    </div>
                    <CrudTable<FinishMaterial> columns={finishesColumns} data={finishMaterials} onSave={handleFinishesSave} newItemFactory={newFinishItem} itemName="Accessory"/>
                </div>
            )}
        </ManagePage>
    );
};

export default ManageMaterialsPage;