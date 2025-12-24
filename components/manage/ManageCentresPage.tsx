import React, { useRef, useState, useEffect } from 'react';
import ManagePage from './ManagePage';
import CrudTable from './CrudTable';
import { useProjectContext } from '../../hooks/useProjectContext';
import * as db from '../../services/db';
import { Centre, LocationExpense } from '../../types';
import { useAppContext } from '../../hooks/useAppContext';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Modal from '../ui/Modal';
import { OPEX_CATEGORIES } from '../../constants';

interface ManageCentresPageProps {
    goBack: () => void;
}

const ManageCentresPage: React.FC<ManageCentresPageProps> = ({ goBack }) => {
    const { centres, setCentres } = useProjectContext();
    const { showNotification } = useAppContext();
    const [selectedCentre, setSelectedCentre] = useState<Centre | null>(null);
    const [expenses, setExpenses] = useState<LocationExpense[]>([]);
    
    useEffect(() => {
        setExpenses(db.getData<LocationExpense>('locationExpenses'));
    }, []);

    const columns: { key: keyof Centre; label: string; render?: any }[] = [
        { key: 'name', label: 'Facility Name' },
        { key: 'ship', label: 'Shipping Ready?' },
        { key: 'floorSpace', label: 'Space (sqm)' },
        { 
            key: 'id', 
            label: 'Operational Spend',
            render: (_: any, centre: Centre) => {
                const total = expenses.filter(e => e.centreId === centre.id).reduce((s, e) => s + e.amount, 0);
                return (
                    <button 
                        onClick={() => setSelectedCentre(centre)}
                        className="flex items-center gap-2 bg-slate-900 text-blue-400 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase hover:bg-slate-800 transition-all"
                    >
                        <Icon name="fas fa-receipt" /> ₦{total.toLocaleString()}
                    </button>
                );
            }
        }
    ];

    const handleSaveCentre = (updatedData: Centre[]) => {
        if(db.saveData<Centre>('centres', updatedData)) {
            setCentres(updatedData);
            showNotification('Facility data saved!');
        }
    };

    const handleSaveExpense = (updatedExpenses: LocationExpense[]) => {
        if(db.saveData<LocationExpense>('locationExpenses', updatedExpenses)) {
            setExpenses(updatedExpenses);
            showNotification('Expense ledger updated.');
        }
    };

    return (
        <ManagePage title="Factory & Facility Operations" icon="fas fa-warehouse" goBack={goBack}>
            <div className="mb-6 bg-slate-50 p-6 rounded-3xl border border-slate-200">
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">
                    Define production centres and track location-specific overheads (OPEX). 
                    These expenses are combined with labor and material costs to calculate true operational profitability.
                </p>
            </div>
            
            <CrudTable<Centre>
                columns={columns}
                data={centres}
                onSave={handleSaveCentre}
                newItemFactory={() => ({ id: db.generateId(), name: 'New Production Center', ship: 'Y', coords: '0,0', floorSpace: '0' })}
                itemName="Facility"
            />

            {selectedCentre && (
                <Modal 
                    isOpen={!!selectedCentre} 
                    onClose={() => setSelectedCentre(null)} 
                    title={`Overhead Ledger: ${selectedCentre.name}`}
                    titleIcon="fas fa-file-invoice-dollar"
                >
                    <div className="space-y-6">
                        <CrudTable<LocationExpense>
                            columns={[
                                { key: 'date', label: 'Date', type: 'text' },
                                { 
                                    key: 'category', 
                                    label: 'Category', 
                                    type: 'select', 
                                    options: OPEX_CATEGORIES.map(c => ({ label: c, value: c }))
                                },
                                { key: 'amount', label: 'Amount (₦)', type: 'text' },
                                { key: 'description', label: 'Reference/Notes', type: 'text' }
                            ]}
                            data={expenses.filter(e => e.centreId === selectedCentre.id)}
                            onSave={(localList) => {
                                const others = expenses.filter(e => e.centreId !== selectedCentre.id);
                                handleSaveExpense([...others, ...localList]);
                            }}
                            newItemFactory={() => ({
                                id: db.generateId(),
                                date: new Date().toISOString().split('T')[0],
                                centreId: selectedCentre.id,
                                category: OPEX_CATEGORIES[0],
                                amount: 0,
                                description: ''
                            })}
                            itemName="Expense"
                        />
                    </div>
                </Modal>
            )}
        </ManagePage>
    );
};

export default ManageCentresPage;