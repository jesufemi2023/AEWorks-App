import React from 'react';
import { FramingTakeOffItem, FinishesTakeOffItem } from '../../types';
import Button from '../ui/Button';
import { useProjectContext } from '../../hooks/useProjectContext';
import { isSheetMaterial } from '../../services/utils';

type Item = FramingTakeOffItem | FinishesTakeOffItem;

interface TakeOffTableProps {
    type: 'framing' | 'finishes';
    items: Item[];
    onUpdate: (items: Item[]) => void;
}

const TakeOffTable: React.FC<TakeOffTableProps> = ({ type, items, onUpdate }) => {
    const { framingMaterials, finishMaterials } = useProjectContext();
    const materialOptions = type === 'framing' ? framingMaterials.map(m => m['FRAMING MATERIALS']) : finishMaterials.map(m => m['NAME - MATERIAL']);

    const handleItemChange = (index: number, field: string, value: string | number) => {
        const newItems = [...items];
        const item = { ...newItems[index] };
        (item as any)[field] = value;
        
        if (type === 'framing' && field === 'material') {
            if (!isSheetMaterial(value as string)) {
                (item as FramingTakeOffItem).width = 0;
            }
        }

        newItems[index] = item;
        onUpdate(newItems);
    };
    
    const handleDeleteRow = (id: string) => {
        onUpdate(items.filter(item => (item as any).id !== id));
    };

    const renderFramingRow = (item: FramingTakeOffItem, index: number) => {
        const isSheet = isSheetMaterial(item.material);
        const displayLength = item.length ? Math.round(item.length * 1000) : '';
        const displayWidth = item.width ? Math.round(item.width * 1000) : '';

        return (
            <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-50 last:border-0">
                <td className="py-1 px-1.5 text-center text-slate-400 text-[10px]">{index + 1}</td>
                <td className="py-1 px-1 min-w-[120px]">
                    <input type="text" value={item.desc} onChange={e => handleItemChange(index, 'desc', e.target.value)} className="w-full p-1 border border-slate-200 rounded bg-slate-50 text-xs font-medium" placeholder="Desc" />
                </td>
                <td className="py-1 px-1 min-w-[150px]">
                    <select value={item.material} onChange={e => handleItemChange(index, 'material', e.target.value)} className="w-full p-1 border border-slate-200 rounded bg-slate-50 text-xs font-bold">
                        <option value="">-- Material --</option>
                        {materialOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </td>
                <td className="py-1 px-1 min-w-[60px]">
                    <input 
                        type="number" 
                        value={displayLength} 
                        onChange={e => {
                            const mm = parseFloat(e.target.value) || 0;
                            handleItemChange(index, 'length', mm / 1000);
                        }} 
                        className="w-full p-1 border border-slate-200 rounded bg-slate-50 text-xs text-center" 
                        placeholder="L"
                    />
                </td>
                <td className="py-1 px-1 min-w-[60px]">
                    <input 
                        type="number" 
                        value={displayWidth} 
                        disabled={!isSheet} 
                        onChange={e => {
                            const mm = parseFloat(e.target.value) || 0;
                            handleItemChange(index, 'width', mm / 1000);
                        }} 
                        className="w-full p-1 border border-slate-200 rounded disabled:opacity-20 bg-slate-50 text-xs text-center" 
                        placeholder="W"
                    />
                </td>
                <td className="py-1 px-1 min-w-[50px]">
                    <input type="number" value={item.qty} onChange={e => handleItemChange(index, 'qty', parseInt(e.target.value, 10) || 0)} className="w-full p-1 border border-slate-200 rounded bg-slate-50 text-xs text-center font-bold" />
                </td>
                <td className="py-1 px-1 text-center">
                    <button onClick={() => handleDeleteRow(item.id)} className="text-red-300 hover:text-red-600 transition-colors p-1"><i className="fas fa-trash-alt text-[10px]"></i></button>
                </td>
            </tr>
        );
    };

    const renderFinishesRow = (item: FinishesTakeOffItem, index: number) => (
         <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-50 last:border-0">
            <td className="py-1 px-1.5 text-center text-slate-400 text-[10px]">{index + 1}</td>
            <td className="py-1 px-1 min-w-[150px]">
                <input type="text" value={item.desc} onChange={e => handleItemChange(index, 'desc', e.target.value)} className="w-full p-1 border border-slate-200 rounded bg-slate-50 text-xs font-medium" placeholder="Description" />
            </td>
            <td className="py-1 px-1 min-w-[180px]">
                <select value={item.material} onChange={e => handleItemChange(index, 'material', e.target.value)} className="w-full p-1 border border-slate-200 rounded bg-slate-50 text-xs font-bold">
                    <option value="">-- Finish/Part --</option>
                    {materialOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </td>
            <td className="py-1 px-1 min-w-[60px]">
                <input type="number" value={item.qty} onChange={e => handleItemChange(index, 'qty', parseInt(e.target.value, 10) || 0)} className="w-full p-1 border border-slate-200 rounded bg-slate-50 text-xs text-center font-bold" />
            </td>
            <td className="py-1 px-1 text-center">
                <button onClick={() => handleDeleteRow(item.id)} className="text-red-300 hover:text-red-600 transition-colors p-1"><i className="fas fa-trash-alt text-[10px]"></i></button>
            </td>
        </tr>
    );

    const headers = type === 'framing' 
        ? ['#', 'Description', 'Material', 'L', 'W', 'Qty', '']
        : ['#', 'Description', 'Material', 'Qty', ''];
    
    return (
        <div className="border border-slate-100 rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs min-w-max">
                    <thead className="bg-slate-800 text-white">
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} className="p-1.5 text-left font-black uppercase tracking-widest text-[9px]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={headers.length} className="p-4 text-center text-slate-300 italic text-[10px]">Vault Empty. Add items above.</td>
                            </tr>
                        ) : (
                            items.map((item, index) => type === 'framing' ? renderFramingRow(item as FramingTakeOffItem, index) : renderFinishesRow(item as FinishesTakeOffItem, index))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TakeOffTable;