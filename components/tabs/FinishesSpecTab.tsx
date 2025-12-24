import React, { useState } from 'react';
import TabContent from './TabContent';
import Button from '../ui/Button';
import { useProjectContext } from '../../hooks/useProjectContext';
import TakeOffTable from './TakeOffTable';
import { FinishesTakeOffItem } from '../../types';
import Icon from '../ui/Icon';

const FinishesSpecTab: React.FC = () => {
    const { currentProject, setCurrentProject } = useProjectContext();
    const [activeJobId, setActiveJobId] = useState(currentProject.jobs[0]?.id || '');

    const handleAddRow = () => {
        const newItem: FinishesTakeOffItem = {
            id: crypto.randomUUID(),
            desc: '',
            material: '',
            qty: 1
        };
        setCurrentProject(prev => ({
            ...prev,
            jobs: prev.jobs.map(j => j.id === activeJobId ? { ...j, finishesTakeOff: [...j.finishesTakeOff, newItem] } : j)
        }));
    };

    const handleUpdate = (items: FinishesTakeOffItem[]) => {
      setCurrentProject(prev => ({
          ...prev,
          jobs: prev.jobs.map(j => j.id === activeJobId ? { ...j, finishesTakeOff: items } : j)
      }));
    }

    const activeJob = currentProject.jobs.find(j => j.id === activeJobId) || currentProject.jobs[0];

    return (
        <TabContent title="Finishes & Accessories" icon="fas fa-paint-roller">
             <div className="mb-4 bg-slate-900 p-2 rounded-xl border border-slate-800 flex items-center gap-3 overflow-x-auto no-scrollbar shadow-lg">
                <div className="shrink-0 flex items-center gap-2 px-3 border-r border-slate-700">
                    <Icon name="fas fa-fill-drip" className="text-pink-400 text-xs"/>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Job:</span>
                </div>
                <div className="flex gap-2">
                    {currentProject.jobs.map(job => (
                        <button
                            key={job.id}
                            onClick={() => setActiveJobId(job.id)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeJobId === job.id ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.4)]' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
                        >
                            {job.name}
                        </button>
                    ))}
                </div>
            </div>

            {activeJob ? (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{activeJob.name} <span className="text-xs font-normal text-slate-400 ml-2">Accessory Deck</span></h3>
                        </div>
                        <Button onClick={handleAddRow} variant="success" icon="fas fa-plus" size="sm">Add Accessory</Button>
                    </div>
                    <TakeOffTable 
                        type="finishes" 
                        items={activeJob.finishesTakeOff}
                        onUpdate={(newItems) => handleUpdate(newItems as FinishesTakeOffItem[])} 
                    />
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
                    <Icon name="fas fa-exclamation-triangle" className="text-3xl mb-3 opacity-20"/>
                    <p className="font-bold uppercase text-[10px] tracking-widest">No Job Active.</p>
                </div>
            )}
        </TabContent>
    );
};

export default FinishesSpecTab;