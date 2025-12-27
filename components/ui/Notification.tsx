
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { Notification as NotificationType } from '../../types';

const Notification: React.FC<NotificationType> = ({ message, type }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        setShow(true);
        // Errors persist longer to allow reading/copying URLs and instructions
        const duration = type === 'error' ? 10000 : 3800;
        const timer = setTimeout(() => setShow(false), duration);
        return () => clearTimeout(timer);
    }, [message, type]);

    const baseClasses = "fixed top-5 right-5 p-4 rounded-lg font-medium z-50 flex items-start gap-3 shadow-xl transition-transform duration-300 ease-in-out max-w-md w-full sm:w-auto";
    
    const typeClasses: { [key in NotificationType['type']]: string } = {
        success: 'bg-green-700 text-white',
        error: 'bg-red-700 text-white',
        warning: 'bg-amber-500 text-black',
    };
    
    const iconClasses: { [key in NotificationType['type']]: string } = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
    };

    const transformClass = show ? 'translate-x-0' : 'translate-x-[120%]';

    return (
        <div className={`${baseClasses} ${typeClasses[type]} ${transformClass}`}>
            <Icon name={iconClasses[type]} className="text-xl mt-0.5 shrink-0" />
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase opacity-60 mb-1 tracking-widest">{type === 'error' ? 'Critical Exception' : 'System Update'}</span>
                <span className="text-xs leading-relaxed whitespace-pre-wrap break-words">{message}</span>
            </div>
        </div>
    );
};

export default Notification;
