import React, { useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import * as db from '../../services/db';

const Header: React.FC = () => {
    const [logo, setLogo] = useState<string | null>(null);

    useEffect(() => {
        setLogo(db.getSystemLogo());
    }, []);

    return (
        <header className="text-center mb-2 p-2 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-lg shadow-md flex flex-col items-center">
            <div className="flex items-center justify-center gap-3">
                {logo ? (
                    <div className="w-10 h-10 bg-white p-1 rounded shadow-inner overflow-hidden flex items-center justify-center">
                        <img src={logo} alt="AEWorks" className="max-h-full max-w-full object-contain" />
                    </div>
                ) : (
                    <Icon name="fas fa-industry" className="text-2xl text-blue-400" />
                )}
                <h1 className="text-2xl font-bold tracking-tight">
                    AEWorks Manager
                </h1>
            </div>
            <p className="text-[10px] opacity-60 uppercase tracking-[0.3em] mt-1">Enterprise Operations Database</p>
        </header>
    );
};

export default Header;