
export interface User {
    username: string;
    email: string;
    role: 'admin' | 'manager' | 'viewer';
}

export interface AuthUser extends User {
    id: string;
    password?: string;
    lastLogin?: string;
    updatedAt?: string;
}

export interface Client {
    id: string;
    mgr: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    destination: string;
    updatedAt?: string;
}

export interface Contact {
    id: string;
    name: string;
    designation: string;
    category: 'Staff - Permanent' | 'Staff - Contract' | 'Prospect' | 'Supplier' | 'Sub Contractor';
    phone1: string;
    email1: string;
    updatedAt?: string;
    rating?: number; // Lifetime Performance score (1-5)
}

export interface CustomerFeedback {
    rating: number;
    quality: number;
    timeliness: number;
    communication: number;
    comments: string;
    submittedAt: string;
    verifiedAt?: string;
    verifiedBy?: string;
}

export interface WorkerEvaluation {
    workerId: string;
    rating: number; // 1-5
    notes?: string;
}

export interface Centre {
    id: string;
    name: string;
    ship: 'Y' | 'N';
    coords: string;
    floorSpace: string;
    updatedAt?: string;
}

export interface FramingMaterial {
    id: string;
    'MATERIAL / GROUP': string;
    'FRAMING MATERIALS': string;
    'RATE': string;
    'Surface Area': string;
    updatedAt?: string;
}

export interface FinishMaterial {
    id: string;
    'MATERIAL / GROUP': string;
    'MATERIAL_GROUP'?: string; // Compatibility
    'NAME - MATERIAL': string;
    'PRICE': string;
    'Coverage': string;
    updatedAt?: string;
}

export interface FramingTakeOffItem {
    id: string;
    desc: string;
    material: string;
    length: number;
    width: number;
    qty: number;
}

export interface FinishesTakeOffItem {
    id: string;
    desc: string;
    material: string;
    qty: number;
}

export interface CostingVariables {
    [key: string]: number;
}

export interface Job {
    id: string;
    name: string;
    framingTakeOff: FramingTakeOffItem[];
    finishesTakeOff: FinishesTakeOffItem[];
}

export interface ProjectTrackingData {
    paymentConfDate?: string;
    paymentConfirmedBy?: string;
    amountCommitted?: number;
    teamLead?: string;
    projectValue?: number;
    purchaseList?: string;
    purchaserInfo?: string;
    partCount?: number;
    partComplexity?: number;
    subAssemblies?: number;
    mainAssemblies?: number;
    assemblyFinishes?: string;
    packageMaterial?: string;
    actualPackageVolume?: number;
    shippingWeight?: number;
    expectedDeliveryDate?: string;
    carrierName?: string;
    driverContact?: string;
    departureTime?: string;
    deliveryConfirmedBy?: string;
    projectSignoff?: boolean;
    balanceConfirmed?: boolean;
    stageApproved?: boolean;
    teamPaymentsApproved?: boolean;
    teamBonusesApproved?: boolean;
    teamBonusAmount?: number;
    shipmentApproved?: boolean;
    customerNotified?: boolean;
    logisticsNotified?: boolean;
    installationNotified?: boolean;
    closeoutNotes?: string;
    finalCloseoutDate?: string;
    customerFeedback?: CustomerFeedback;
    feedbackStatus?: 'none' | 'requested' | 'received' | 'verified';
    workerEvaluations?: WorkerEvaluation[];
}

export interface TaskAdjustment {
    taskId: string;
    multiplier: number; // 1.0 = standard, 1.5 = +50% time
}

export interface WorkTeamSpec {
    welders: number;
    fitters: number;
    painters: number;
    helpers: number;
    efficiencyRate: number;
    dailyShiftHours: number;
    targetDays?: number;
    manualAdjustments?: TaskAdjustment[];
    assignedStaffIds?: string[];
}

export interface ManualValuationItem {
    id: string;
    scope: string;
    amount: number;
}

export interface Project {
    id?: string;
    projName: string;
    jobsThisYear: number;
    year: number;
    projectCode: string;
    projectStatus: string;
    prodCentre: string;
    prodCoords: string;
    clientName: string;
    clientMgr: string;
    clientPhone: string;
    clientEmail: string;
    clientAddr: string;
    destCitySelect: string;
    destCoords: string;
    projMgr: string;
    mgrPhone: string;
    mgrEmail: string;
    shippingLength: number;
    shippingWidth: number;
    shippingHeight: number;
    jobs: Job[];
    framingTakeOff?: FramingTakeOffItem[];
    finishesTakeOff?: FinishesTakeOffItem[];
    costingVariables: CostingVariables;
    productImages?: string[];
    savedAt?: string;
    updatedAt?: string;
    deadline?: string;
    trackingData?: ProjectTrackingData;
    workTeamSpec?: WorkTeamSpec;
    isCloudSynced?: boolean;
    useManualValuation?: boolean;
    manualItems?: ManualValuationItem[];
}

// Performance and Profitability Tracking
export interface ProductionLog {
    id: string;
    date: string;
    projectCode: string;
    taskId: string; // e.g., 's_weld'
    outputValue: number; // quantity done today
    manHours: number;
    notes?: string;
}

export interface LocationExpense {
    id: string;
    date: string;
    centreId: string;
    category: string;
    amount: number;
    description: string;
    updatedAt?: string;
}

export interface Invoice {
    id: string;
    projectCode: string;
    number: string;
    date: string;
    dueDate: string;
    type: 'Proforma' | 'Commercial' | 'Final';
    status: 'Draft' | 'Sent' | 'Paid';
    items: { desc: string; qty: number; rate: number; amount: number }[];
    total: number;
    vat: number;
    grandTotal: number;
    notes?: string;
}

// Payroll Specific Types
export interface DisbursementItem {
    id: string;
    type: 'Salary' | 'Contract %' | 'Lump Sum';
    description: string; 
    refId?: string; 
    rate: number; 
    units: number; 
    amount: number; 
}

export interface PayrollRunItem {
    id: string;
    staffId: string;
    staffName: string;
    category: Contact['category'];
    disbursements: DisbursementItem[];
    iou: number;
    grossPay: number;
    netPay: number;
    deductions: {
        paye: number;
        staffPension: number;
        companyPension: number;
        medicals: number;
        workmen: number;
    };
    manualDeductionFlags?: {
        paye?: boolean;
        staffPension?: boolean;
        companyPension?: boolean;
        medicals?: boolean;
        workmen?: boolean;
    };
}

export interface PayrollRun {
    id: string;
    paymentDate: string;
    month: string;
    status: 'Pending Approval' | 'Approved' | 'Disbursed';
    items: PayrollRunItem[];
    rates: {
        payePerm: number;
        payeCont: number;
        staffPension: number;
        companyPension: number;
        medicals: number;
        workmen: number;
    };
    totals: {
        gross: number;
        net: number;
        personnelCost: number;
    };
    processedBy: string;
    approvedBy?: string;
    savedAt: string;
}

export enum View {
    DASHBOARD,
    MANAGE_CLIENTS,
    MANAGE_CONTACTS,
    MANAGE_CENTRES,
    MANAGE_MATERIALS,
    MANAGE_USERS,
    TRACKER
}

export interface Notification {
    message: string;
    type: 'success' | 'error' | 'warning';
}

export interface NigerianCity {
    name: string;
    coords: string;
}

export interface JobCostBreakdown {
    jobId: string;
    jobName: string;
    materialCost: number;
    laborCost: number;
    consumableCost: number;
    overheadCost: number;
    totalCost: number;
}

export interface CostResults {
    totalMaterialCost: number;
    totalLabor: number;
    totalConsumableCost: number;
    totalOverhead: number;
    shippingCost: number;
    totalCost: number;
    salesPrice: number;
    profit: number;
    jobBreakdowns: JobCostBreakdown[];
    materialDetailsHTML: string;
    otherCostsHTML: string;
    formatN: (value: number) => string;
    totalProdTime: number;
}
