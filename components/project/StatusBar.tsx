import React from 'react';
import { STATUS_STAGES } from '../../constants';

interface StatusBarProps {
    statusValue: number;
    onSetStatus?: (value: number) => void;
}

const StatusBar: React.FC<StatusBarProps> = ({ statusValue, onSetStatus }) => {
    return (
        <div className="bg-white p-2 rounded-lg shadow-sm mb-2 overflow-x-auto">
             <div className="flex justify-between min-w-[700px]">
                {STATUS_STAGES.map((stage) => {
                    const isActive = stage.value <= statusValue;
                    const isCurrent = stage.value === statusValue;
                    
                    return (
                        <button 
                            key={stage.name} 
                            onClick={() => onSetStatus && onSetStatus(stage.value)}
                            className={`text-center p-1 flex-1 transition-all duration-300 group focus:outline-none`}
                            title={`Set status to ${stage.name}`}
                        >
                            <div className={`w-4 h-4 rounded-full mx-auto mb-1 flex items-center justify-center transition-all duration-300 border-2 ${isActive ? 'bg-green-600 border-green-600 shadow-[0_0_5px] shadow-green-500' : 'bg-slate-100 border-slate-300 group-hover:border-blue-400'}`}>
                                {isCurrent && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}
                            </div>
                            <div className={`text-[9px] font-black uppercase tracking-tighter ${isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                {stage.name}
                            </div>
                        </button>
                    );
                })}
            </div>
            {/* Progress Bar Line */}
            <div className="relative h-1 bg-slate-100 mt-1 mx-4 rounded-full overflow-hidden">
                <div 
                    className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-500 ease-in-out" 
                    style={{ width: `${statusValue}%` }}
                ></div>
            </div>
        </div>
    );
};

export default StatusBar;