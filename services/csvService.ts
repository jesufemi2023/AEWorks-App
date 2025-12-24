export const parseCSV = (text: string, expectedHeaders: string[]): { data: any[]; error?: string } => {
    const lines = text.trim().replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n');
    if (lines.length < 1) {
        return { data: [], error: "CSV is empty." };
    }
    const fileHeaders = lines[0].split(',').map(h => h.trim());
    const fileHeadersLower = fileHeaders.map(h => h.toLowerCase());
    const expectedHeadersLower = expectedHeaders.map(h => h.toLowerCase());

    for (const expected of expectedHeadersLower) {
        if (!fileHeadersLower.includes(expected)) {
            return { data: [], error: `CSV missing required header: ${expectedHeaders[expectedHeadersLower.indexOf(expected)]}` };
        }
    }

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const values = lines[i].split(',');
        const obj: { [key: string]: string } = {};
        fileHeaders.forEach((header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
        });
        data.push(obj);
    }
    return { data };
};

export const exportToCSV = <T>(data: T[], fields: (keyof T)[], filename: string): void => {
    if (!data || !data.length) return;

    const csvContent = [
        fields.join(','),
        ...data.map(row => 
            fields.map(fieldName => {
                let value = row[fieldName] as any;
                if (value === null || value === undefined) value = '';
                const stringValue = String(value);
                // Simple escaping: if comma, quote, or newline exists, wrap in quotes and escape quotes
                if (stringValue.search(/("|,|\n)/g) >= 0) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};