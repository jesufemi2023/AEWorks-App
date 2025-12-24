import { NigerianCity, AuthUser } from './types';

export const APP_VERSION = '4.2.0'; 

export const LOCAL_SHIPPING_RATE_PER_CUBIC_METER = 250;
export const NATIONAL_SHIPPING_RATE_PER_CUBIC_METER = 350;
export const LOCAL_DISTANCE_THRESHOLD = 35;

export const NIGERIAN_CITIES: NigerianCity[] = [
    { name: "Lagos", coords: "6.5244, 3.3792" },
    { name: "Abuja", coords: "9.0765, 7.3986" },
    { name: "Kano", coords: "12.0022, 8.5920" },
    { name: "Ibadan", coords: "7.3776, 3.9470" },
    { name: "Port Harcourt", coords: "4.8156, 7.0498" },
    { name: "Benin City", coords: "6.3350, 5.6037" },
    { name: "Kaduna", coords: "10.5222, 7.4414" },
    { name: "Abeokuta", coords: "7.1475, 3.3619" },
    { name: "Onitsha", coords: "6.1667, 6.7833" },
    { name: "Warri", coords: "5.5167, 5.7500" },
    { name: "Enugu", coords: "6.4497, 7.5014" }
];

export const STATUS_STAGES = [
    { name: 'Quote Request', value: 0, color: 'border-slate-300' },
    { name: 'Started', value: 15, color: 'border-blue-400' },
    { name: 'Procurement', value: 35, color: 'border-indigo-400' },
    { name: 'WIP Parts', value: 55, color: 'border-yellow-400' },
    { name: 'Assembly', value: 75, color: 'border-orange-400' },
    { name: 'Finishes', value: 85, color: 'border-pink-400' },
    { name: 'Package', value: 90, color: 'border-purple-400' },
    { name: 'Shipped', value: 95, color: 'border-green-400' },
    { name: 'Closeout', value: 100, color: 'border-emerald-600' },
];

export const OPEX_CATEGORIES = [
    'Fuel (Diesel/Petrol)',
    'Electricity & Utilities',
    'Equipment Maintenance',
    'Consumables (General)',
    'Factory Logistics',
    'Rent & Service Charge',
    'Sundry Site Expenses',
    'Staff Welfare'
];

export const DB_KEYS = [
    'clients', 
    'contacts', 
    'centres', 
    'framingMaterials', 
    'finishMaterials', 
    'projects', 
    'defaultCostingVariables', 
    'users',
    'productionLogs',
    'locationExpenses',
    'invoices',
    'payrollRuns'
];

export const INITIAL_USER_DATA: AuthUser[] = [
    {
        id: 'master-admin',
        username: 'SuperAdmin',
        email: 'master@aeworks.com',
        password: 'masterPassword123',
        role: 'admin',
        updatedAt: new Date().toISOString()
    }
];

export const COST_VARS_STRUCTURE = {
    "Labor Rates (₦/day)": {
        general_labor: ["General Labor", 12000],
        painter_labor: ["Painter", 20000],
        support_labor: ["Support Staff", 9600],
        admin_labor: ["Admin", 16000]
    },
    "Production Rates & Assumptions": {
        fitting_hrs_per_meter: ["Fitting (hrs/m)", 0.2],
        assembly_hrs_per_frame: ["Assembly (hrs/frame)", 0.5],
        testing_hrs_per_frame: ["Testing (hrs/frame)", 0.25],
        cleaning_sqm_per_hr: ["Cleaning (m²/hr)", 8],
        priming_sqm_per_hr: ["Priming (m²/hr)", 10],
        painting_sqm_per_hr: ["Painting (m²/hr)", 8],
        packaging_mins_per_frame: ["Packaging (mins/frame)", 10],
        meters_per_cutting_disc: ["Meters per Cutting Disc", 10],
        electrodes_per_meter: ["Weld Electrodes per Meter", 2],
        brushes_per_sqm: ["Wire Brushes per m²", 0.05],
        sandpaper_per_sqm: ["Sandpaper per m²", 0.083]
    },
    "Consumables Cost (₦)": {
        cutting_disc_cost: ["Cutting Disc", 500],
        welding_electrode_cost: ["Welding Electrode", 100],
        wire_brush_cost: ["Wire Brush", 300],
        sandpaper_cost: ["Sandpaper", 200]
    },
    "Overheads": {
        facility_rate: ["Facility Rental (₦/day)", 24000],
        power_rate: ["Power Supply (₦/day)", 8000],
        design_cost: ["Design Costs (₦)", 50000],
        supervision_cost_percent: ["Supervision (% of Labor)", 15]
    },
    "Profit": {
        markup_percent: ["Markup (%)", 25]
    }
};

export const INITIAL_FRAMING_DATA = [
    { "MATERIAL / GROUP": "MILD STEEL ROD", "FRAMING MATERIALS": "#8 - Steel Rebar", "RATE": "682.54", "Surface Area": "0.0251" },
    { "MATERIAL / GROUP": "MILD STEEL ROD", "FRAMING MATERIALS": "#10 - Steel Rebar", "RATE": "832.37", "Surface Area": "0.0314" },
    { "MATERIAL / GROUP": "MILD STEEL ROD", "FRAMING MATERIALS": "#12 - Steel Rebar", "RATE": "1044.70", "Surface Area": "0.0377" },
    { "MATERIAL / GROUP": "MILD STEEL ROD", "FRAMING MATERIALS": "#16 - Steel Rebar", "RATE": "1968.86", "Surface Area": "0.0503" },
    { "MATERIAL / GROUP": "MILD STEEL ROD", "FRAMING MATERIALS": "#25 - Steel Rebar", "RATE": "4875.28", "Surface Area": "0.0785" },
    { "MATERIAL / GROUP": "H / W SECTIONS", "FRAMING MATERIALS": "W100x50 x6x4 - Section", "RATE": "22522.52", "Surface Area": "0.4" },
    { "MATERIAL / GROUP": "H / W SECTIONS", "FRAMING MATERIALS": "W140x70 x6x4 - Section", "RATE": "7567.57", "Surface Area": "0.56" },
    { "MATERIAL / GROUP": "H / W SECTIONS", "FRAMING MATERIALS": "W160x80 x8x6 - Section", "RATE": "16086.96", "Surface Area": "0.64" },
    { "MATERIAL / GROUP": "H / W SECTIONS", "FRAMING MATERIALS": "W200x100x10x8 - Section", "RATE": "23478.26", "Surface Area": "0.8" },
    { "MATERIAL / GROUP": "H / W SECTIONS", "FRAMING MATERIALS": "U203x133x30kg/m - Section", "RATE": "34782.61", "Surface Area": "0.938" },
    { "MATERIAL / GROUP": "H / W SECTIONS", "FRAMING MATERIALS": "U203x203x46kg/m - Section", "RATE": "40434.78", "Surface Area": "1.22" },
    { "MATERIAL / GROUP": "CHANNELS", "FRAMING MATERIALS": "C75 x 38 x3.5 - Channel", "RATE": "1266.97", "Surface Area": "0.302" },
    { "MATERIAL / GROUP": "CHANNELS", "FRAMING MATERIALS": "C100x50 x7 - Channel", "RATE": "1719.46", "Surface Area": "0.4" },
    { "MATERIAL / GROUP": "CHANNELS", "FRAMING MATERIALS": "C150x75 x10 - Channel", "RATE": "5000", "Surface Area": "0.6" },
    { "MATERIAL / GROUP": "ANGLE SECTIONS", "FRAMING MATERIALS": "L25 x25 x1.5 - Angle Section", "RATE": "909.09", "Surface Area": "0.1" },
    { "MATERIAL / GROUP": "ANGLE SECTIONS", "FRAMING MATERIALS": "L25 x25 x3.5 - Angle Section", "RATE": "1727.27", "Surface Area": "0.1" },
    { "MATERIAL / GROUP": "ANGLE SECTIONS", "FRAMING MATERIALS": "L38 x38 x2 - Angle Section", "RATE": "763.64", "Surface Area": "0.152" },
    { "MATERIAL / GROUP": "ANGLE SECTIONS", "FRAMING MATERIALS": "L38 x38 x4 - Angle Section", "RATE": "1636.36", "Surface Area": "0.152" },
    { "MATERIAL / GROUP": "ANGLE SECTIONS", "FRAMING MATERIALS": "L45 x45 x2.5 - Angle Section", "RATE": "1818.18", "Surface Area": "0.18" },
    { "MATERIAL / GROUP": "ANGLE SECTIONS", "FRAMING MATERIALS": "L50 x50 x3 - Angle Section", "RATE": "2363.64", "Surface Area": "0.2" },
    { "MATERIAL / GROUP": "ANGLE SECTIONS", "FRAMING MATERIALS": "L50 x50 x4 - Angle Section", "RATE": "2586.21", "Surface Area": "0.2" },
    { "MATERIAL / GROUP": "ANGLE SECTIONS", "FRAMING MATERIALS": "L50 x50 x5 - Angle Section", "RATE": "5327.59", "Surface Area": "0.2" },
    { "MATERIAL / GROUP": "ANGLE SECTIONS", "FRAMING MATERIALS": "L60 x60 x5 - Angle Section", "RATE": "6553.22", "Surface Area": "0.24" },
    { "MATERIAL / GROUP": "ANGLE SECTIONS", "FRAMING MATERIALS": "L70 x70 x5 - Angle Section", "RATE": "8620.69", "Surface Area": "0.28" },
    { "MATERIAL / GROUP": "ANGLE SECTIONS", "FRAMING MATERIALS": "L80 x80 x6 - Angle Section", "RATE": "11171.17", "Surface Area": "0.32" },
    { "MATERIAL / GROUP": "ANGLE SECTIONS", "FRAMING MATERIALS": "L85 x85 x8 - Angle Section", "RATE": "13396.09", "Surface Area": "0.34" },
    { "MATERIAL / GROUP": "ANGLE SECTIONS", "FRAMING MATERIALS": "L120x120x8 - Angle Section", "RATE": "13693.69", "Surface Area": "0.48" },
    { "MATERIAL / GROUP": "FLAT BARS", "FRAMING MATERIALS": "19.05 x 1.8 mm - Flat Bar", "RATE": "490.91", "Surface Area": "0.0417" },
    { "MATERIAL / GROUP": "FLAT BARS", "FRAMING MATERIALS": "25.45 x 2.5 mm - Flat Bar", "RATE": "700", "Surface Area": "0.0559" },
    { "MATERIAL / GROUP": "FLAT BARS", "FRAMING MATERIALS": "38.10 x 3 mm - Flat Bar", "RATE": "1136.36", "Surface Area": "0.0822" },
    { "MATERIAL / GROUP": "FLAT BARS", "FRAMING MATERIALS": "50.80 x 3 mm - Flat Bar", "RATE": "1727.27", "Surface Area": "0.1076" },
    { "MATERIAL / GROUP": "ROUND PIPES", "FRAMING MATERIALS": "Ф1.00\" - Round Pipe", "RATE": "1465.52", "Surface Area": "0.0798" },
    { "MATERIAL / GROUP": "ROUND PIPES", "FRAMING MATERIALS": "Ф1.25\" - Round Pipe", "RATE": "2500", "Surface Area": "0.0958" },
    { "MATERIAL / GROUP": "ROUND PIPES", "FRAMING MATERIALS": "Ф1.50\" - Round Pipe", "RATE": "3189.66", "Surface Area": "0.1197" },
    { "MATERIAL / GROUP": "ROUND PIPES", "FRAMING MATERIALS": "Ф2.00\" - Round Pipe", "RATE": "3402.78", "Surface Area": "0.1596" },
    { "MATERIAL / GROUP": "ROUND PIPES", "FRAMING MATERIALS": "Ф3.00\" - Round Pipe", "RATE": "9655.17", "Surface Area": "0.2394" },
    { "MATERIAL / GROUP": "ROUND PIPES", "FRAMING MATERIALS": "Ф4.00\" - Round Pipe", "RATE": "13189.66", "Surface Area": "0.3192" },
    { "MATERIAL / GROUP": "GALV. ROUND PIPES", "FRAMING MATERIALS": "Ф1.00\" - Galv. Round Pipe", "RATE": "1724.14", "Surface Area": "0.0798" },
    { "MATERIAL / GROUP": "GALV. ROUND PIPES", "FRAMING MATERIALS": "Ф1.50\" - Galv. Round Pipe", "RATE": "2586.21", "Surface Area": "0.1197" },
    { "MATERIAL / GROUP": "GALV. ROUND PIPES", "FRAMING MATERIALS": "Ф2.00\" - Galv. Round Pipe", "RATE": "3448.28", "Surface Area": "0.1596" },
    { "MATERIAL / GROUP": "GALV. ROUND PIPES", "FRAMING MATERIALS": "Ф3.00\" - Galv. Round Pipe", "RATE": "6034.48", "Surface Area": "0.2394" },
    { "MATERIAL / GROUP": "GALV. ROUND PIPES", "FRAMING MATERIALS": "Ф4.00\" - Galv. Round Pipe", "RATE": "7758.62", "Surface Area": "0.3192" },
    { "MATERIAL / GROUP": "RECTANGULAR PIPES", "FRAMING MATERIALS": "18 x 18 x 1.2mm - Rect Pipes", "RATE": "1718.18", "Surface Area": "0.072" },
    { "MATERIAL / GROUP": "RECTANGULAR PIPES", "FRAMING MATERIALS": "25 x 25 x 1.2mm - Rect Pipes", "RATE": "1054.55", "Surface Area": "0.1" },
    { "MATERIAL / GROUP": "RECTANGULAR PIPES", "FRAMING MATERIALS": "40 x 40 x 1.5mm - Rect Pipes", "RATE": "1909.09", "Surface Area": "0.16" },
    { "MATERIAL / GROUP": "RECTANGULAR PIPES", "FRAMING MATERIALS": "40 x 80 x 1.5mm - Rect Pipes", "RATE": "3600", "Surface Area": "0.24" },
    { "MATERIAL / GROUP": "RECTANGULAR PIPES", "FRAMING MATERIALS": "50 x 50 x 1.5mm - Rect Pipes", "RATE": "3181.82", "Surface Area": "0.2" },
    { "MATERIAL / GROUP": "RECTANGULAR PIPES", "FRAMING MATERIALS": "50 x 50 x 3.0mm - Rect Pipes", "RATE": "6181.82", "Surface Area": "0.2" },
    { "MATERIAL / GROUP": "RECTANGULAR PIPES", "FRAMING MATERIALS": "100x50 x 2.5 - Rect Pipes", "RATE": "1357.47", "Surface Area": "0.3" },
    { "MATERIAL / GROUP": "RECTANGULAR PIPES", "FRAMING MATERIALS": "200x200x 5 - Rect Pipes", "RATE": "8844.77", "Surface Area": "0.8" },
    { "MATERIAL / GROUP": "Z PURLINS", "FRAMING MATERIALS": "1.0 mm - Z Purlins", "RATE": "333.33", "Surface Area": "0.56" },
    { "MATERIAL / GROUP": "Z PURLINS", "FRAMING MATERIALS": "1.2 mm - Z Purlin", "RATE": "383.33", "Surface Area": "0.56" },
    { "MATERIAL / GROUP": "PLAIN STEEL SHEET", "FRAMING MATERIALS": "0.6mm - Plain Steel Sheet", "RATE": "24000", "Surface Area": "5.95" },
    { "MATERIAL / GROUP": "PLAIN STEEL SHEET", "FRAMING MATERIALS": "1.0mm - Plain Steel Sheet", "RATE": "36000", "Surface Area": "5.95" },
    { "MATERIAL / GROUP": "PLAIN STEEL SHEET", "FRAMING MATERIALS": "1.5mm - Plain Steel Sheet", "RATE": "50000", "Surface Area": "5.95" },
    { "MATERIAL / GROUP": "PLAIN STEEL SHEET", "FRAMING MATERIALS": "2.0mm - Plain Steel Sheet", "RATE": "72000", "Surface Area": "5.95" },
    { "MATERIAL / GROUP": "PLAIN STEEL SHEET", "FRAMING MATERIALS": "4.0mm - Plain Steel Sheet", "RATE": "64493", "Surface Area": "5.95" },
    { "MATERIAL / GROUP": "GALVANIZED STEEL SHEET", "FRAMING MATERIALS": "0.6mm - Galv. Sheet", "RATE": "25987", "Surface Area": "2.97" },
    { "MATERIAL / GROUP": "GALVANIZED STEEL SHEET", "FRAMING MATERIALS": "1.0mm - Galv. Sheet", "RATE": "37125", "Surface Area": "2.97" },
    { "MATERIAL / GROUP": "CHEQUERED PLATE", "FRAMING MATERIALS": "1.5mm - Chequered Plate", "RATE": "5500", "Surface Area": "5.95" },
    { "MATERIAL / GROUP": "CHEQUERED PLATE", "FRAMING MATERIALS": "3.0mm - Chequered Plate", "RATE": "21500", "Surface Area": "5.95" },
    { "MATERIAL / GROUP": "STAINLESS", "FRAMING MATERIALS": "30 x 30 x 1mm square pipe", "RATE": "34000", "Surface Area": "0.12" },
    { "MATERIAL / GROUP": "TIMBER BEAMS", "FRAMING MATERIALS": "2\" x 2\" x 10' - Hardwood", "RATE": "2700", "Surface Area": "0.2" },
    { "MATERIAL / GROUP": "TIMBER BEAMS", "FRAMING MATERIALS": "2\" x 4\" x 10' - Hardwood", "RATE": "4500", "Surface Area": "0.3" },
    { "MATERIAL / GROUP": "TIMBER PLANKS", "FRAMING MATERIALS": "1\" x 12\" x 10' Hardwood", "RATE": "10000", "Surface Area": "0.1" },
    { "MATERIAL / GROUP": "HDF PLYWOOD", "FRAMING MATERIALS": "4'x8'x6mm HDF Regular", "RATE": "12000", "Surface Area": "5.95" },
    { "MATERIAL / GROUP": "HDF PLYWOOD", "FRAMING MATERIALS": "4'x8'x18mm HDF Regular", "RATE": "22000", "Surface Area": "5.95" },
    { "MATERIAL / GROUP": "MDF PLYWOOD", "FRAMING MATERIALS": "4'x8'x18mm MDF Regular", "RATE": "14000", "Surface Area": "5.95" },
    { "MATERIAL / GROUP": "GLASS", "FRAMING MATERIALS": "5mm - Clear Glass", "RATE": "128000", "Surface Area": "16.09" },
    { "MATERIAL / GROUP": "GLASS", "FRAMING MATERIALS": "5mm - Tinted Brown Glass", "RATE": "128000", "Surface Area": "16.09" }
];

export const INITIAL_FINISH_DATA = [
    { "MATERIAL / GROUP": "Paints/Coats", "NAME - MATERIAL": "Emulsion Basic", "PRICE": "16000", "Coverage": "8.5" },
    { "MATERIAL / GROUP": "Paints/Coats", "NAME - MATERIAL": "Emulsion - High Spread", "PRICE": "15000", "Coverage": "8.5" },
    { "MATERIAL / GROUP": "Paints/Coats", "NAME - MATERIAL": "Silk", "PRICE": "35000", "Coverage": "18" },
    { "MATERIAL / GROUP": "Paints/Coats", "NAME - MATERIAL": "Gloss Paint - AEPaints", "PRICE": "18000", "Coverage": "12.5" },
    { "MATERIAL / GROUP": "Paints/Coats", "NAME - MATERIAL": "Autobase", "PRICE": "10000", "Coverage": "8" },
    { "MATERIAL / GROUP": "Paints/Coats", "NAME - MATERIAL": "Powder Coating", "PRICE": "6000", "Coverage": "15" },
    { "MATERIAL / GROUP": "Paints/Coats", "NAME - MATERIAL": "Epoxy Systems", "PRICE": "150000", "Coverage": "0" },
    { "MATERIAL / GROUP": "Package (Carton/Films)", "NAME - MATERIAL": "0.4mm Nylon Roll", "PRICE": "8000", "Coverage": "50" },
    { "MATERIAL / GROUP": "Package (Carton/Films)", "NAME - MATERIAL": "1mm clear stretch film", "PRICE": "28500", "Coverage": "40" },
    { "MATERIAL / GROUP": "Locks", "NAME - MATERIAL": "Padblock", "PRICE": "2400", "Coverage": "0" },
    { "MATERIAL / GROUP": "Locks", "NAME - MATERIAL": "Door Lock Type 1", "PRICE": "6550", "Coverage": "0" },
    { "MATERIAL / GROUP": "Latches", "NAME - MATERIAL": "Hasp 01 - Sheet", "PRICE": "850", "Coverage": "0" },
    { "MATERIAL / GROUP": "Handles", "NAME - MATERIAL": "Long Bar - Handle", "PRICE": "5000", "Coverage": "0" },
    { "MATERIAL / GROUP": "Hinges", "NAME - MATERIAL": "Butterfly Hinges", "PRICE": "1800", "Coverage": "0" },
    { "MATERIAL / GROUP": "Foot Studs", "NAME - MATERIAL": "Chroma Short (20mm)", "PRICE": "2500", "Coverage": "0" },
    { "MATERIAL / GROUP": "Screws", "NAME - MATERIAL": "3.3x12.5 - Drywall Screws", "PRICE": "10", "Coverage": "0" },
    { "MATERIAL / GROUP": "Screws", "NAME - MATERIAL": "3.3x25 - Self Tapping", "PRICE": "30", "Coverage": "0" },
    { "MATERIAL / GROUP": "Hex Bolts", "NAME - MATERIAL": "M10x25.0 - Hex Head", "PRICE": "150", "Coverage": "0" },
    { "MATERIAL / GROUP": "Hex Bolts", "NAME - MATERIAL": "M12x50.0 - Hex Head", "PRICE": "150", "Coverage": "0" },
    { "MATERIAL / GROUP": "Structural Bolts", "NAME - MATERIAL": "M16 - Stru Bolt - China", "PRICE": "500", "Coverage": "0" },
    { "MATERIAL / GROUP": "Weld Electrode", "NAME - MATERIAL": "2.5mm - Mild Steel (E6013)", "PRICE": "11000", "Coverage": "0" },
    { "MATERIAL / GROUP": "Weld Electrode", "NAME - MATERIAL": "2.5mm - Stainless Steel (E308)", "PRICE": "32000", "Coverage": "0" },
    { "MATERIAL / GROUP": "Cutting Discs", "NAME - MATERIAL": "Thin Cutting Disc (110mm)", "PRICE": "500", "Coverage": "0" },
    { "MATERIAL / GROUP": "Cutting Discs", "NAME - MATERIAL": "Grinding Disc (110mm)", "PRICE": "800", "Coverage": "0" },
    { "MATERIAL / GROUP": "Power Consumables", "NAME - MATERIAL": "Diesel (Litre)", "PRICE": "1250", "Coverage": "0" }
];

export const INITIAL_CENTRES_DATA = [
    { name: "Iju Factory - AEWorks", ship: "Y", coords: "6.613735, 3.504107", floorSpace: "150" },
    { name: "AEWorks Ologogoro", ship: "Y", coords: "6.682121, 3.268985", floorSpace: "50" },
    { name: "AEWorks Ogudu", ship: "Y", coords: "6.569357, 3.391938", floorSpace: "80" },
    { name: "Site Installation", ship: "N", coords: "0, 0", floorSpace: "0" }
];

export const INITIAL_CLIENTS_DATA = [
    { mgr: "Gbolahan Johnson", name: "AEWorks Ltd", phone: "09122483776", email: "gbola@aeworks.com", address: "Ogudu, Lagos", destination: "Lagos" },
    { mgr: "S. Manchester", name: "Jaza Energy Inc", phone: "2348123218779", email: "sebastian@jaza.com", address: "Ibadan, Oyo", destination: "Ibadan" },
    { mgr: "P. Manager", name: "Walk-In Client", phone: "", email: "", address: "Lagos", destination: "Lagos" }
];

export const INITIAL_CONTACTS_DATA = [
    { id: 'c-001', name: "Jeremiah Destiny", designation: "Trainee", category: "Staff - Contract", phone1: "08123218779", email1: "ola@grandmetallic.com" },
    { id: 'c-002', name: "Abe Olatomi O", designation: "Lead Designer", category: "Staff - Permanent", phone1: "08125865644", email1: "tomi@grandmetallic.com" },
    { id: 'c-003', name: "Abe Olatunde P", designation: "Manager/Designer", category: "Staff - Permanent", phone1: "08123218779", email1: "abe@grandmetallic.com" },
    { id: 'c-004', name: "Abe Abosede", designation: "Admin manager", category: "Staff - Permanent", phone1: "08084043665", email1: "bose@grandmetallic.com" },
    { id: 'c-005', name: "Salami Richard A", designation: "Operations Lead", category: "Staff - Permanent", phone1: "07014147762", email1: "richard@grandmetallic.com" },
    { id: 'c-006', name: "Segun Ibitoye R", designation: "Designer", category: "Staff - Contract", phone1: "09114613869", email1: "segun@grandmetallic.com" },
    { id: 'c-007', name: "Oladipo Ailara", designation: "Community Manager", category: "Staff - Permanent", phone1: "07060894999", email1: "dipo@grandmetallic.com" },
    { id: 'c-008', name: "Abe Abiola O", designation: "Admin manager", category: "Staff - Permanent", phone1: "09136964458", email1: "biola@grandmetallic.com" },
    { id: 'c-009', name: "Afeez Oladimeji (Temp)", designation: "Welder", category: "Sub Contractor", phone1: "09131468912", email1: "afeez@yahoomail.com" },
    { id: 'c-010', name: "Promise", designation: "Trainee", category: "Staff - Contract", phone1: "08115211111", email1: "" },
    { id: 'c-011', name: "Paul", designation: "Trainee", category: "Staff - Contract", phone1: "08115212222", email1: "" },
    { id: 'c-012', name: "Gbolahan Johnson", designation: "MD", category: "Staff - Permanent", phone1: "09122483776", email1: "gbola@aeworks.com" }
];