export const isSheetMaterial = (name: string): boolean => {
    if (!name) return false;
    const keywords = ['HDF', 'MDF', 'Glass', 'Sheet', 'Board', 'Mesh', 'Plate'];
    return keywords.some(key => name.toLowerCase().includes(key.toLowerCase()));
};

export const generateProjectCode = (projName: string, jobsThisYear: number, year: number): string => {
    const name = projName.trim();
    const yearStr = year.toString().trim().slice(-2);
    if (!name) return '';
    
    const words = name.split(/\s+/);
    let acronym = '';
    if (words.length >= 3) {
        acronym = words.slice(0, 3).map(w => w[0]).join('');
    } else if (words.length === 2) {
        acronym = words[0][0] + words[1].substring(0, 2);
    } else {
        acronym = name.substring(0, 3);
    }
    
    return `AEP-${acronym.toUpperCase()}-${(jobsThisYear || 1).toString().padStart(3, '0')}.${yearStr}`;
};