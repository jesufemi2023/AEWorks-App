import React, { useRef, useEffect } from 'react';
import Button from '../ui/Button';

interface LegacyAppContainerProps {
    htmlContent: string;
    title: string;
    onBack: () => void;
}

const LegacyAppContainer: React.FC<LegacyAppContainerProps> = ({ htmlContent, title, onBack }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                doc.write(htmlContent);
                doc.close();
            }
        }
    }, [htmlContent]);

    return (
        <div className="flex flex-col h-screen bg-slate-100">
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center shadow-md z-10">
                <div className="flex items-center gap-4">
                    <Button onClick={onBack} size="sm" variant="outline" className="border-white text-white hover:bg-slate-700">
                        <i className="fas fa-arrow-left mr-2"></i> Dashboard
                    </Button>
                    <h2 className="text-xl font-bold">{title}</h2>
                </div>
            </div>
            <div className="flex-grow w-full h-full overflow-hidden relative">
                <iframe
                    ref={iframeRef}
                    title={title}
                    className="w-full h-full border-none absolute inset-0"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                />
            </div>
        </div>
    );
};

export default LegacyAppContainer;