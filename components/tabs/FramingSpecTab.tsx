import React, { useState } from 'react';
import TabContent from './TabContent';
import Button from '../ui/Button';
import { useProjectContext } from '../../hooks/useProjectContext';
import TakeOffTable from './TakeOffTable';
import { FramingTakeOffItem } from '../../types';
import Icon from '../ui/Icon';

const FramingSpecTab: React.FC = () => {
    const { currentProject, setCurrentProject } = useProjectContext();
    const [activeJobId, setActiveJobId] = useState(currentProject.jobs[0]?.id || '');

    const handleAddRow = () => {
        const newItem: FramingTakeOffItem = {
            id: crypto.randomUUID(),
            desc: '',
            material: '',
            length: 0,
            width: 0,
            qty: 1
        };
        setCurrentProject(prev => ({
            ...prev,
            jobs: prev.jobs.map(j => j.id === activeJobId ? { ...j, framingTakeOff: [...j.framingTakeOff, newItem] } : j)
        }));
    };
    
    const handleUpdate = (items: FramingTakeOffItem[]) => {
      setCurrentProject(prev => ({
          ...prev,
          jobs: prev.jobs.map(j => j.id === activeJobId ? { ...j, framingTakeOff: items } : j)
      }));
    };

    const activeJob = currentProject.jobs.find(j => j.id === activeJobId) || currentProject.jobs[0];

    return (
        <TabContent title="Framing Take-Off" icon="fas fa-ruler-combined">
            <div className="mb-4 bg-slate-900 p-2 rounded-xl border border-slate-800 flex items-center gap-3 overflow-x-auto no-scrollbar shadow-lg">
                <div className="shrink-0 flex items-center gap-2 px-3 border-r border-slate-700">
                    <Icon name="fas fa-project-diagram" className="text-blue-400 text-xs"/>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Job:</span>
                </div>
                <div className="flex gap-2">
                    {currentProject.jobs.map(job => (
                        <button
                            key={job.id}
                            onClick={() => setActiveJobId(job.id)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeJobId === job.id ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
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
                            <h3 className="text-lg font-bold text-slate-800">{activeJob.name} <span className="text-xs font-normal text-slate-400 ml-2">Material Definitions</span></h3>
                        </div>
                        <Button onClick={handleAddRow} variant="success" icon="fas fa-plus" size="sm">Add Row</Button>
                    </div>
                    <TakeOffTable 
                        type="framing" 
                        items={activeJob.framingTakeOff}
                        onUpdate={(newItems) => handleUpdate(newItems as FramingTakeOffItem[])} 
                    />
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
                    <Icon name="fas fa-exclamation-triangle" className="text-3xl mb-3 opacity-20"/>
                    <p className="font-bold uppercase text-[10px] tracking-widest">No Job Selected or Configured.</p>
                </div>
            )}
        </TabContent>
    );
};

export default FramingSpecTab;