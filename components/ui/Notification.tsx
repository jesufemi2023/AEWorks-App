import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { Notification as NotificationType } from '../../types';

const Notification: React.FC<NotificationType> = ({ message, type }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        setShow(true);
        const timer = setTimeout(() => setShow(false), 3800);
        return () => clearTimeout(timer);
    }, [message, type]);

    const baseClasses = "fixed top-5 right-5 p-4 rounded-lg font-medium z-50 flex items-center gap-3 shadow-xl transition-transform duration-300 ease-in-out";
    
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
            <Icon name={iconClasses[type]} className="text-xl" />
            <span>{message}</span>
        </div>
    );
};

export default Notification;