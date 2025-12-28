
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { Notification as NotificationType } from '../../types';

const Notification: React.FC<NotificationType> = ({ message, type }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        setShow(true);
        // Errors persist longer (10s) to allow reading/clicking URLs and instructions
        const duration = type === 'error' ? 10000 : 3800;
        const timer = setTimeout(() => setShow(false), duration);
        return () => clearTimeout(timer);
    }, [message, type]);

    const baseClasses = "fixed top-5 right-5 p-4 rounded-lg font-medium z-50 flex items-start gap-3 shadow-xl transition-transform duration-300 ease-in-out max-w-md w-full sm:w-auto border-l-4";
    
    const typeClasses: { [key in NotificationType['type']]: string } = {
        success: 'bg-green-700 text-white border-green-500',
        error: 'bg-red-800 text-white border-red-500',
        warning: 'bg-amber-500 text-black border-amber-400',
    };
    
    const iconClasses: { [key in NotificationType['type']]: string } = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
    };

    const transformClass = show ? 'translate-x-0' : 'translate-x-[120%]';

    // Helper to render text with clickable links
    const renderMessage = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a 
                        key={i} 
                        href={part} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="underline decoration-2 underline-offset-2 hover:text-blue-300 font-bold break-all inline-block mt-1"
                    >
                        {part} <Icon name="fas fa-external-link-alt" className="text-[10px] ml-1" />
                    </a>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]} ${transformClass}`}>
            <Icon name={iconClasses[type]} className="text-xl mt-0.5 shrink-0" />
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase opacity-60 mb-1 tracking-widest">
                    {type === 'error' ? 'Critical Repository Exception' : 'System Update'}
                </span>
                <div className="text-xs leading-relaxed whitespace-pre-wrap">
                    {renderMessage(message)}
                </div>
            </div>
        </div>
    );
};

export default Notification;
