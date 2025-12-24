import React from 'react';
import Icon from '../ui/Icon';

const Footer: React.FC = () => {
    return (
        <footer className="text-center mt-10 text-slate-700 text-sm p-5 border-t border-slate-200">
            <p>© {new Date().getFullYear()} AEWorks Ltd. Integrated v4.0 | <Icon name="fas fa-shield-alt" /> Secure Database System</p>
        </footer>
    );
};

export default Footer;