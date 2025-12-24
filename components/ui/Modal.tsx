import React from 'react';
import Button from './Button';
import Icon from './Icon';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    titleIcon?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, titleIcon }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-fade-in-up">
                <header className="p-5 border-b border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        {titleIcon && <Icon name={titleIcon} />}
                        {title}
                    </h3>
                </header>
                <main className="p-6 overflow-y-auto flex-grow">
                    {children}
                </main>
                <footer className="p-4 bg-slate-50 rounded-b-lg flex justify-end">
                    <Button onClick={onClose} variant="danger" size="sm" icon="fas fa-times">
                        Close
                    </Button>
                </footer>
            </div>
        </div>
    );
};

export default Modal;