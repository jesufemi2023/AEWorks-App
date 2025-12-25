
import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import Icon from '../ui/Icon';
import * as db from '../../services/db';
import { Project, FramingMaterial, FinishMaterial, ProductionLog, LocationExpense } from '../../types';
import HelpGuideModal from '../modules/HelpGuideModal';
import { calculateProjectCost } from '../../services/costingService';

declare const Chart: any;

interface LandingPageProps {
    onNavigate: (module: 'project-board' | 'kpi-monitor' | 'payroll-manager' | 'work-manager') => void;
    onLogout: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onLogout }) => {
    const { currentUser } = useAppContext();
    const [stats, setStats] = useState({
        pipelineValue: 0, activeJobs: 0, monthlyBurn: 0, efficiencyIndex: 0
    });
    const [recentProjects, setRecentProjects] = useState<Project[]>([]);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [logo] = useState<string | null>(db.getSystemLogo());

    const profitChartRef = useRef<HTMLCanvasElement>(null);
    const chartInstances = useRef<any[]>([]);

    useEffect(() => {
        const projects = db.getData<Project>('projects');
        const logs = db.getData<ProductionLog>('productionLogs');
        const expenses = db.getData<LocationExpense>('locationExpenses');
        const framing = db.getData<FramingMaterial>('framingMaterials');
        const finish = db.getData<FinishMaterial>('finishMaterials');

        // Logic for Financial Momentum (Last 6 Months)
        const labels: string[] = [];
        const revenueData: number[] = [];
        const burnData: number[] = [];
        const today = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            labels.push(d.toLocaleString('default', { month: 'short' }));

            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

            // Estimate Revenue from finished projects
            const monthRev = projects
                .filter(p => parseInt(p.projectStatus) >= 95 && p.updatedAt && new Date(p.updatedAt) >= monthStart && new Date(p.updatedAt) <= monthEnd)
                .reduce((acc, p) => acc + calculateProjectCost(p, framing, finish).salesPrice, 0);
            
            // Actual Burn from logged expenses
            const monthBurn = expenses
                .filter(e => new Date(e.date) >= monthStart && new Date(e.date) <= monthEnd)
                .reduce((acc, e) => acc + (parseFloat(e.amount.toString()) || 0), 0);
            
            revenueData.push(monthRev);
            burnData.push(monthBurn);
        }

        const totalPipeline = projects.reduce((acc, p) => acc + calculateProjectCost(p, framing, finish).salesPrice, 0);
        const activeCount = projects.filter(p => parseInt(p.projectStatus) > 0 && parseInt(p.projectStatus) < 100).length;

        setStats({
            pipelineValue: totalPipeline,
            activeJobs: activeCount,
            monthlyBurn: burnData[5],
            efficiencyIndex: (revenueData[5] > 0) ? (revenueData[5] / (burnData[5] || 1)) : 1.2
        });

        if (profitChartRef.current) {
            const ctx = profitChartRef.current.getContext('2d');
            chartInstances.current.push(new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'Revenue Realized', data: revenueData, backgroundColor: '#3b82f6', borderRadius: 8 },
                        { label: 'Operational Burn', data: burnData, backgroundColor: '#f87171', borderRadius: 8 }
                    ]
                },
                options: { 
                    responsive: true, maintainAspectRatio: false, 
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { weight: 'bold', size: 10 } } } },
                    scales: { y: { beginAtZero: true, grid: { display: false } } }
                }
            }));
        }

        setRecentProjects([...projects].sort((a,b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()).slice(0, 4));

        return () => {
            chartInstances.current.forEach(c => c.destroy());
            chartInstances.current = [];
        };
    }, []);

    const StatCard = ({ title, value, icon, color, subtitle, trend }: any) => (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${color}`}>
                    <Icon name={icon} />
                </div>
                {trend && <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">{trend}</span>}
            </div>
            <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-none">{value}</h3>
                {subtitle && <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">{subtitle}</p>}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
            <header className="bg-slate-900 text-white px-8 py-5 flex items-center justify-between shadow-2xl sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-1 rounded-xl w-10 h-10 flex items-center justify-center shadow-inner overflow-hidden">
                        {logo ? <img src={logo} className="max-h-full max-w-full object-contain" alt="AEWorks" /> : <Icon name="fas fa-industry" className="text-slate-900" />}
                    </div>
                    <h1 className="text-xl font-black uppercase tracking-tighter">AEWorks Enterprise</h1>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsHelpOpen(true)} 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-[10px] font-black uppercase tracking-[0.1em] hover:bg-slate-700 transition-all border border-slate-700"
                    >
                        <Icon name="fas fa-book" className="text-blue-400" /> 
                        <span className="hidden sm:inline">Operations Manual</span>
                        <span className="sm:hidden">Help</span>
                    </button>
                    <button 
                        onClick={onLogout} 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-900/20 text-red-500 text-[10px] font-black uppercase tracking-[0.1em] hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                    >
                        <Icon name="fas fa-power-off" /> 
                        <span className="hidden sm:inline">Exit Session</span>
                        <span className="sm:hidden">Logout</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
                {/* Metrics */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Pipeline Value" value={`₦${(stats.pipelineValue/1000000).toFixed(1)}M`} icon="fas fa-vault" color="bg-slate-900" subtitle={`${stats.activeJobs} Jobs WIP`} />
                    <StatCard title="Burn Rate (30d)" value={`₦${(stats.monthlyBurn/1000).toFixed(0)}K`} icon="fas fa-fire" color="bg-red-500" subtitle="Actual OPEX Logged" />
                    <StatCard title="Efficiency Index" value={stats.efficiencyIndex.toFixed(2)} icon="fas fa-bolt" color="bg-blue-600" trend="+4%" />
                    <StatCard title="User Tier" value={currentUser?.role.toUpperCase()} icon="fas fa-user-shield" color="bg-emerald-600" subtitle="Authorized Access" />
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-[400px]">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter">Performance Momentum</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Realized Revenue vs Operational Burn</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-blue-600"><div className="w-2 h-2 rounded-full bg-blue-600"></div> Revenue</span>
                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-red-400"><div className="w-2 h-2 rounded-full bg-red-400"></div> Burn</span>
                            </div>
                        </div>
                        <div className="flex-grow">
                            <canvas ref={profitChartRef}></canvas>
                        </div>
                    </div>

                    {/* Recent & Efficiency */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-3">
                            <Icon name="fas fa-history" className="text-blue-500" /> System Updates
                        </h3>
                        <div className="space-y-4">
                            {recentProjects.map(p => (
                                <div key={p.projectCode} onClick={() => onNavigate('project-board')} className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-2xl transition-all group">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <Icon name="fas fa-file-invoice" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h4 className="text-xs font-black uppercase text-slate-800 truncate">{p.projName}</h4>
                                        <p className="text-[9px] font-bold text-slate-400 tracking-tighter">#{p.projectCode} • Updated {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-auto pt-8">
                             <div className="bg-slate-900 rounded-2xl p-4 text-white">
                                <p className="text-[9px] font-black uppercase text-blue-400 mb-1">Production Health</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-black">94%</span>
                                    <div className="flex gap-0.5">
                                        {[1,2,3,4,5].map(i => <div key={i} className={`w-1 h-3 rounded-full ${i <= 4 ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>)}
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div onClick={() => onNavigate('project-board')} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-blue-50 text-blue-600 flex items-center justify-center text-3xl mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                            <Icon name="fas fa-project-diagram" />
                        </div>
                        <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Project Board</h3>
                        <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-tighter">Scope & Take-off Vault</p>
                    </div>
                    <div onClick={() => onNavigate('work-manager')} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                            <Icon name="fas fa-bolt" />
                        </div>
                        <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Production</h3>
                        <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-tighter">Floor Actuals & Speed</p>
                    </div>
                    <div onClick={() => onNavigate('payroll-manager')} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-amber-50 text-amber-600 flex items-center justify-center text-3xl mb-6 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-inner">
                            <Icon name="fas fa-hand-holding-usd" />
                        </div>
                        <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Payroll</h3>
                        <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-tighter">Personnel Disbursals</p>
                    </div>
                    <div onClick={() => { localStorage.setItem('redirect_view', 'MANAGE_CENTRES'); onNavigate('project-board'); }} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 text-white flex items-center justify-center text-3xl mb-6 group-hover:bg-blue-600 transition-all shadow-inner">
                            <Icon name="fas fa-warehouse" />
                        </div>
                        <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Facilities</h3>
                        <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-tighter">Centres & OPEX Tracker</p>
                    </div>
                </section>
            </main>
            <HelpGuideModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
};

export default LandingPage;
