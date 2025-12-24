import { Project, FramingMaterial, FinishMaterial, CostResults, JobCostBreakdown } from '../types';
import { isSheetMaterial } from './utils';

const parseCurrency = (value: string): number => {
    if (!value) return 0;
    const cleanValue = value.toString().replace(/[^0-9.-]+/g, "");
    return parseFloat(cleanValue) || 0;
};

export const calculateProjectCost = (
    project: Project,
    framingDb: FramingMaterial[],
    finishesDb: FinishMaterial[]
): CostResults => {
    const vars = project.costingVariables;
    const formatN = (v: number) => `₦${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    let totalProjectMaterialCost = 0;
    let totalProjectLaborCost = 0;
    let totalProjectConsumableCost = 0;
    let totalProjectOverhead = 0;
    let totalProjectProdTime = 0;
    
    const materialDetailsHTMLParts: string[] = [];
    const jobBreakdowns: JobCostBreakdown[] = [];
    const workDayHours = 8;

    project.jobs.forEach(job => {
        let jobFramingCost = 0;
        let jobCladdingCost = 0;
        let jobFinishesCost = 0;
        let jobLinearLength = 0;
        let jobSurfaceArea = 0;
        let jobPartCount = 0;

        materialDetailsHTMLParts.push(`<tr class="bg-slate-200 font-black"><td colspan="5" class="py-2 px-3 uppercase tracking-widest text-[10px]">Job: ${job.name}</td></tr>`);

        // Framing Logic
        job.framingTakeOff.forEach(item => {
            const m = framingDb.find(db => db['FRAMING MATERIALS'] === item.material);
            if (!m) return;
            const len = item.length || 0;
            const wid = item.width || 0;
            const qty = item.qty || 0;
            const rate = parseCurrency(m.RATE);
            const saM = parseFloat(m['Surface Area']) || 0;
            
            const isClad = isSheetMaterial(item.material);
            let itemCost = 0, itemSA = 0, unitPrice = 0;

            if (isClad) {
                itemSA = (len * wid) * qty * 2;
                itemCost = (len * wid) * qty * rate;
            } else {
                itemSA = len * qty * saM;
                itemCost = len * qty * rate;
                jobLinearLength += len * qty;
            }
            
            unitPrice = rate;
            materialDetailsHTMLParts.push(`<tr><td class="py-1 px-3">${item.desc}</td><td class="py-1 px-3 text-[10px] text-slate-500">${item.material}</td><td class="py-1 px-3">${qty} ${isClad ? 'pcs' : 'm'}</td><td class="py-1 px-3 text-right">${formatN(unitPrice)}</td><td class="py-1 px-3 text-right font-semibold">${formatN(itemCost)}</td></tr>`);
            
            jobSurfaceArea += itemSA;
            jobPartCount += qty;
            if (isClad) jobCladdingCost += itemCost; else jobFramingCost += itemCost;
        });

        // Finishes Logic
        job.finishesTakeOff.forEach(item => {
            const m = finishesDb.find(db => db['NAME - MATERIAL'] === item.material);
            if (!m) return;
            const qty = item.qty || 0;
            const price = parseCurrency(m.PRICE);
            const itemCost = qty * price;
            materialDetailsHTMLParts.push(`<tr><td class="py-1 px-3">${item.desc}</td><td class="py-1 px-3 text-[10px] text-slate-500">${item.material}</td><td class="py-1 px-3">${qty} units</td><td class="py-1 px-3 text-right">${formatN(price)}</td><td class="py-1 px-3 text-right font-semibold">${formatN(itemCost)}</td></tr>`);
            jobFinishesCost += itemCost;
        });

        // Job specific labor & consumables
        const fittingTime = jobLinearLength * (vars.fitting_hrs_per_meter || 0);
        const fittingLaborCost = (fittingTime / workDayHours) * (vars.general_labor || 0);
        const numDiscs = Math.ceil(jobLinearLength / (vars.meters_per_cutting_disc || 1));
        const numElectrodes = Math.ceil(jobLinearLength * (vars.electrodes_per_meter || 0));
        const fittingConsumablesCost = (numDiscs * (vars.cutting_disc_cost || 0)) + (numElectrodes * (vars.welding_electrode_cost || 0));

        const assemblyTime = jobPartCount * (vars.assembly_hrs_per_frame || 0.1); 
        const testingTime = jobPartCount * (vars.testing_hrs_per_frame || 0.05);
        const qaqcCost = ((assemblyTime + testingTime) / workDayHours) * (vars.general_labor || 0);

        const cleaningTime = jobSurfaceArea / (vars.cleaning_sqm_per_hr || 1);
        const cleaningLabor = (cleaningTime / workDayHours) * (vars.general_labor || 0);
        const numBrushes = Math.ceil(jobSurfaceArea * (vars.brushes_per_sqm || 0));
        const numSandpaper = Math.ceil(jobSurfaceArea * (vars.sandpaper_per_sqm || 0));
        const cleaningConsumables = (numBrushes * (vars.wire_brush_cost || 0)) + (numSandpaper * (vars.sandpaper_cost || 0));

        const primingTime = jobSurfaceArea / (vars.priming_sqm_per_hr || 1);
        const primingLabor = (primingTime / workDayHours) * (vars.painter_labor || 0);
        const paintingTime = jobSurfaceArea / (vars.painting_sqm_per_hr || 1);
        const paintingLabor = (paintingTime / workDayHours) * (vars.painter_labor || 0);
        
        const packagingTime = jobPartCount * ((vars.packaging_mins_per_frame || 5) / 60);
        const packagingLabor = (packagingTime / workDayHours) * (vars.support_labor || 0);

        const jobProdTime = fittingTime + assemblyTime + testingTime + cleaningTime + primingTime + paintingTime + packagingTime;
        const jobLabor = fittingLaborCost + qaqcCost + cleaningLabor + primingLabor + paintingLabor + packagingLabor;
        const jobMaterials = jobFramingCost + jobCladdingCost + jobFinishesCost;
        const jobConsumables = fittingConsumablesCost + cleaningConsumables;
        
        // Overheads allocated to job by time
        const jobOverhead = (jobProdTime / workDayHours) * ((vars.facility_rate || 0) + (vars.power_rate || 0) + (vars.admin_labor || 0)) + (jobLabor * ((vars.supervision_cost_percent || 0) / 100));

        jobBreakdowns.push({
            jobId: job.id,
            jobName: job.name,
            materialCost: jobMaterials,
            laborCost: jobLabor,
            consumableCost: jobConsumables,
            overheadCost: jobOverhead,
            totalCost: jobMaterials + jobLabor + jobConsumables + jobOverhead
        });

        totalProjectMaterialCost += jobMaterials;
        totalProjectLaborCost += jobLabor;
        totalProjectConsumableCost += jobConsumables;
        totalProjectOverhead += jobOverhead;
        totalProjectProdTime += jobProdTime;
    });

    const totalCost = totalProjectLaborCost + totalProjectMaterialCost + totalProjectConsumableCost + totalProjectOverhead + (vars.design_cost || 0);
    const salesPrice = totalCost * (1 + (vars.markup_percent || 0) / 100);
    
    return {
        totalMaterialCost: totalProjectMaterialCost,
        totalLabor: totalProjectLaborCost,
        totalConsumableCost: totalProjectConsumableCost,
        totalOverhead: totalProjectOverhead + (vars.design_cost || 0),
        shippingCost: 0, // Calculated separately based on final volume
        totalCost,
        salesPrice,
        profit: salesPrice - totalCost,
        jobBreakdowns,
        materialDetailsHTML: materialDetailsHTMLParts.join(''),
        otherCostsHTML: `
            <tr><td>Total Material</td><td class="text-right">${formatN(totalProjectMaterialCost)}</td></tr>
            <tr><td>Total Labor</td><td class="text-right">${formatN(totalProjectLaborCost)}</td></tr>
            <tr><td>Design & Overheads</td><td class="text-right">${formatN(totalProjectOverhead + (vars.design_cost || 0))}</td></tr>
        `,
        formatN,
        totalProdTime: totalProjectProdTime
    };
};