
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';

interface HelpGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type GuideTab = 'getting-started' | 'workflow' | 'executive' | 'financial' | 'governance';

const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<GuideTab>('getting-started');

    const TabButton = ({ id, label, icon }: { id: GuideTab, label: string, icon: string }) => (
        <button 
            onClick={() => setActiveTab(id)} 
            className={`flex items-center gap-3 py-3 px-4 w-full text-left font-black uppercase tracking-tighter text-xs transition-all ${activeTab === id ? 'bg-blue-600 text-white shadow-lg rounded-xl scale-[1.02] z-10' : 'text-slate-500 hover:text-slate-800'}`}
        >
            <Icon name={icon} className={activeTab === id ? 'text-white' : 'text-blue-500 opacity-60'} />
            {label}
        </button>
    );

    const GuideHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
        <div className="mb-6 border-b border-slate-100 pb-4">
            <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{title}</h4>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-2">{subtitle}</p>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Master Operations Manual" titleIcon="fas fa-book-reader">
            <div className="flex flex-col md:flex-row gap-8 min-h-[500px]">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 flex-shrink-0 space-y-1 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <TabButton id="getting-started" label="Introduction" icon="fas fa-play" />
                    <TabButton id="workflow" label="Production Workflow" icon="fas fa-hammer" />
                    <TabButton id="executive" label="Executive Modules" icon="fas fa-user-tie" />
                    <TabButton id="financial" label="Financial Control" icon="fas fa-coins" />
                    <TabButton id="governance" label="Data Governance" icon="fas fa-shield-alt" />
                </div>

                {/* Content Area */}
                <div className="flex-grow overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                    {activeTab === 'getting-started' && (
                        <div className="animate-fade-in">
                            <GuideHeader title="System Foundation" subtitle="Enterprise Ecosystem v4.1" />
                            <div className="space-y-6 text-slate-600 text-sm leading-relaxed">
                                <p>Welcome to the <strong>AEWorks Manager</strong>. This integrated environment is designed to manage the entire lifecycle of fabrication projects, from initial quote request to final factory sign-off.</p>
                                
                                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl">
                                    <h5 className="font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2 text-blue-400">
                                        <Icon name="fas fa-key" /> System Authentication
                                    </h5>
                                    <p className="text-xs opacity-80 leading-relaxed">
                                        Access is governed by individual tokens. Admin level 1 users have the ability to reset these tokens in the <strong>Access Key Registry</strong>. Ensure your token is stored securely as it provides a gateway to sensitive financial data.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-slate-100 p-4 rounded-xl">
                                        <Icon name="fas fa-mouse-pointer" className="text-blue-500 mb-2" />
                                        <h6 className="font-bold text-slate-800 text-xs uppercase mb-1">Navigation</h6>
                                        <p className="text-[11px]">Use the Dashboard to jump between specialized apps like the Project Board and KPI Monitor.</p>
                                    </div>
                                    <div className="border border-slate-100 p-4 rounded-xl">
                                        <Icon name="fas fa-cloud" className="text-emerald-500 mb-2" />
                                        <h6 className="font-bold text-slate-800 text-xs uppercase mb-1">Cloud Sync</h6>
                                        <p className="text-[11px]">Look for the status dot in the Toolbar. Green indicates active synchronization with the Global Repository.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'workflow' && (
                        <div className="animate-fade-in">
                            <GuideHeader title="Production Life-Cycle" subtitle="From Take-Off to Delivery" />
                            <div className="space-y-6 text-slate-600 text-sm">
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-black">1</div>
                                    <div>
                                        <h5 className="font-bold text-slate-800">Project Indexing</h5>
                                        <p className="text-[11px]">Define the project name and manager. The system automatically generates a unique <strong>AEP Code</strong> for internal tracking.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-black">2</div>
                                    <div>
                                        <h5 className="font-bold text-slate-800">Framing & Finishes</h5>
                                        <p className="text-[11px]">Use the Take-Off tables to define raw materials. Choose from the catalog to pull live pricing. <em>Linear items</em> require length, while <em>Sheets</em> require width inputs.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-black">3</div>
                                    <div>
                                        <h5 className="font-bold text-slate-800">Tracking Board</h5>
                                        <p className="text-[11px]">Once production starts, use the <strong>Project Tracker</strong> to move jobs through WIP, Assembly, and Packaging stages. Click "Info" on any card to record milestone data like payment dates or driver contacts.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'executive' && (
                        <div className="animate-fade-in">
                            <GuideHeader title="Executive Suite" subtitle="Strategy & Oversight" />
                            <div className="space-y-6 text-slate-600 text-sm">
                                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                                    <h5 className="font-black text-emerald-800 flex items-center gap-2 mb-2 uppercase text-xs">
                                        <Icon name="fas fa-chart-line" /> KPI Monitor
                                    </h5>
                                    <p className="text-[11px] leading-relaxed">
                                        Designed for regional managers to score department performance. Tracks "Knowledge Revenue" and operational efficiency. Scores directly impact performance reviews.
                                    </p>
                                </div>

                                <div className="bg-purple-50 border border-purple-100 p-5 rounded-2xl">
                                    <h5 className="font-black text-purple-800 flex items-center gap-2 mb-2 uppercase text-xs">
                                        <Icon name="fas fa-tasks" /> Work Manager
                                    </h5>
                                    <p className="text-[11px] leading-relaxed">
                                        The resource allocation engine. Input your planned team size (Welders, Painters, etc.) and the system will simulate completion dates based on production complexity. It flags bottlenecks where your team size is insufficient for the scope.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="animate-fade-in">
                            <GuideHeader title="Financial Controls" subtitle="Costing, Invoices & Payroll" />
                            <div className="space-y-6 text-slate-600 text-sm">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-xl">
                                        <h6 className="font-bold text-xs uppercase mb-2">Costing Engine</h6>
                                        <p className="text-[10px]">Calculates total overhead, direct labor, and consumables. Use the <strong>Benchmark Table</strong> to set daily rates for welders or painters.</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl">
                                        <h6 className="font-bold text-xs uppercase mb-2">Invoicing</h6>
                                        <p className="text-[10px]">Generates Proforma or Final Invoices. Your company logo is automatically applied to all PDF exports for a professional appearance.</p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <h5 className="font-bold text-slate-800 mb-2">Payroll Management</h5>
                                    <p className="text-[11px]">The Payroll module handles both Permanent and Contract staff. It calculates gross vs net pay based on a 12% statutory deduction framework.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'governance' && (
                        <div className="animate-fade-in">
                            <GuideHeader title="Data Integrity" subtitle="Vault Security & Persistence" />
                            <div className="space-y-6 text-slate-600 text-sm">
                                <p className="text-[11px]">The AEWorks engine uses a <strong>Multi-Tier Storage Architecture</strong>. All records are stored in your secure browser vault and are synchronized with the cloud if a bridge is established.</p>
                                
                                <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
                                    <h5 className="font-black text-amber-800 mb-2 uppercase text-[10px]">Deployment Persistence Policy</h5>
                                    <p className="text-[11px] leading-relaxed">
                                        Data is stored independently of the application code. Updates or redeployments to the system interface will <strong>never</strong> overwrite your saved projects. The only way to clear data is via a manual "Factory Reset" in the Database Vault.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <h6 className="font-bold text-xs text-slate-800">Disaster Recovery</h6>
                                    <p className="text-[11px]">Regularly use the <strong>Backup (Export Image)</strong> feature on the dashboard. This creates a full snapshot of all projects, clients, and materials that can be restored on any machine.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default HelpGuideModal;
