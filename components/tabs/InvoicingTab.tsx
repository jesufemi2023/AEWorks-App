
import React, { useState, useMemo } from 'react';
import TabContent from './TabContent';
import { useProjectContext } from '../../hooks/useProjectContext';
import { calculateProjectCost } from '../../services/costingService';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import * as db from '../../services/db';
import { Invoice } from '../../types';

const InvoicingTab: React.FC = () => {
    const { currentProject, framingMaterials, finishMaterials } = useProjectContext();
    const [invoiceType, setInvoiceType] = useState<Invoice['type']>('Proforma');
    const [invoiceNumber, setInvoiceNumber] = useState(`INV-${currentProject.projectCode.split('-')[1] || '000'}-${new Date().getTime().toString().slice(-4)}`);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('Payment within 7 days. 70% deposit required to commence works.');

    const costResults = useMemo(() => calculateProjectCost(currentProject, framingMaterials, finishMaterials), [currentProject, framingMaterials, finishMaterials]);
    const logo = db.getSystemLogo();

    const invoiceItems = useMemo(() => {
        // Handle Manual Valuation Override
        if (currentProject.useManualValuation && currentProject.manualItems && currentProject.manualItems.length > 0) {
            return currentProject.manualItems.map(item => ({
                desc: item.scope || 'Custom Scope Item',
                qty: 1,
                rate: item.amount || 0,
                amount: item.amount || 0
            }));
        }

        // Standard Automatic Job-based Logic
        return currentProject.jobs.map(job => {
            const jobCost = costResults.jobBreakdowns.find(jb => jb.jobId === job.id);
            // Apply markup to each job for the invoice line items
            const markup = (currentProject.costingVariables.markup_percent || 0) / 100;
            const rate = (jobCost?.totalCost || 0) * (1 + markup);
            
            return {
                desc: `Project Component: ${job.name}`,
                qty: 1,
                rate: rate,
                amount: rate
            };
        });
    }, [currentProject.jobs, currentProject.useManualValuation, currentProject.manualItems, currentProject.costingVariables.markup_percent, costResults]);

    const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const vat = subtotal * 0.075; // Standard 7.5% VAT
    const grandTotal = subtotal + vat;

    const handlePrint = () => {
        window.print();
    };

    return (
        <TabContent title="Financial Documents" icon="fas fa-file-invoice-dollar">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Control Sidebar */}
                <div className="lg:col-span-1 space-y-4 print:hidden">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b pb-1">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Document Parameters</h4>
                            {currentProject.useManualValuation && (
                                <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase">Manual Mode</span>
                            )}
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Document Type</label>
                            <select 
                                value={invoiceType} 
                                onChange={(e) => setInvoiceType(e.target.value as any)}
                                className="w-full p-2 border border-slate-200 rounded text-xs font-bold"
                            >
                                <option value="Proforma">Proforma Invoice</option>
                                <option value="Commercial">Commercial Invoice</option>
                                <option value="Final">Final Invoice</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Invoice #</label>
                            <input 
                                type="text" 
                                value={invoiceNumber} 
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded text-xs font-bold"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Date</label>
                            <input 
                                type="date" 
                                value={invoiceDate} 
                                onChange={(e) => setInvoiceDate(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded text-xs font-bold"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Notes / Terms</label>
                            <textarea 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4}
                                className="w-full p-2 border border-slate-200 rounded text-[10px] font-medium"
                            />
                        </div>
                        <Button onClick={handlePrint} variant="primary" icon="fas fa-print" className="w-full py-3 text-xs uppercase font-black">
                            Export / Print
                        </Button>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="lg:col-span-3">
                    <div className="bg-white p-8 md:p-12 rounded-xl border border-slate-200 shadow-lg min-h-[800px] font-sans print:border-0 print:shadow-none print:p-0">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center p-2 shadow-xl shrink-0 overflow-hidden">
                                    {logo ? <img src={logo} alt="AEWorks" className="max-h-full max-w-full object-contain" /> : <Icon name="fas fa-industry" className="text-3xl text-blue-500" />}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">AEWorks Ltd</h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Engineering & Fabrication Masters</p>
                                    <div className="mt-2 text-[9px] font-medium text-slate-400 leading-tight">
                                        Plot 12, Industrial Estate, Ogudu, Lagos<br/>
                                        contact@aeworks.com | +234 901 224 8377
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-300 mb-2">{invoiceType}</h3>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest">#{invoiceNumber}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Date: {invoiceDate}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Ref: {currentProject.projectCode}</p>
                                </div>
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div className="grid grid-cols-2 gap-12 mb-12">
                            <div>
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4 border-b border-slate-100 pb-1">Client Bill-To</h4>
                                <div className="space-y-1">
                                    <p className="text-base font-black text-slate-900 uppercase">{currentProject.clientName || 'Unnamed Customer'}</p>
                                    <p className="text-xs font-bold text-slate-600">{currentProject.clientMgr}</p>
                                    <p className="text-xs text-slate-500 max-w-xs">{currentProject.clientAddr}</p>
                                    <p className="text-[10px] font-mono text-slate-400">{currentProject.clientEmail}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-center">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Identifier</p>
                                    <p className="text-lg font-black text-slate-900 uppercase tracking-tighter">{currentProject.projName}</p>
                                    <p className="text-[10px] font-bold text-blue-600 mt-2">Stage: {currentProject.projectStatus}% Ready</p>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="mb-12">
                            <table className="w-full">
                                <thead className="border-b-2 border-slate-900">
                                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        <th className="py-4 text-left">Description</th>
                                        <th className="py-4 text-center w-24">Qty</th>
                                        <th className="py-4 text-right w-40">Rate</th>
                                        <th className="py-4 text-right w-40">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoiceItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-5 font-bold text-slate-800 text-sm uppercase">{item.desc}</td>
                                            <td className="py-5 text-center text-sm font-bold text-slate-500">{item.qty}</td>
                                            <td className="py-5 text-right text-sm font-bold text-slate-500">₦{item.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="py-5 text-right text-sm font-black text-slate-900">₦{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                    {invoiceItems.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-10 text-center text-slate-300 italic">No billable items detected in current mode.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end mb-12">
                            <div className="w-64 space-y-3">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                                    <span>Subtotal</span>
                                    <span>₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                                    <span>VAT (7.5%)</span>
                                    <span>₦{vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                                    <span className="text-sm font-black uppercase text-slate-900">Total Payable</span>
                                    <span className="text-xl font-black text-blue-600">₦{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Notes */}
                        <div className="mt-auto pt-12 border-t border-slate-100">
                            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Notes & Payment Instructions</h5>
                            <p className="text-[10px] leading-relaxed text-slate-500 whitespace-pre-wrap">{notes}</p>
                            <div className="mt-8 grid grid-cols-3 gap-8">
                                <div className="text-center">
                                    <div className="h-px bg-slate-200 mb-2"></div>
                                    <p className="text-[8px] font-black uppercase text-slate-400">Accountant Signature</p>
                                </div>
                                <div className="text-center">
                                    <div className="h-px bg-slate-200 mb-2"></div>
                                    <p className="text-[8px] font-black uppercase text-slate-400">Operations Lead</p>
                                </div>
                                <div className="text-center">
                                    <div className="h-px bg-slate-200 mb-2"></div>
                                    <p className="text-[8px] font-black uppercase text-slate-400">Customer Acceptance</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </TabContent>
    );
};

export default InvoicingTab;
