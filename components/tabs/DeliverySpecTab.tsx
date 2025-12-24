import React from 'react';
import TabContent from './TabContent';
import { useProjectContext } from '../../hooks/useProjectContext';

const DeliverySpecTab: React.FC = () => {
    const { currentProject, setCurrentProject } = useProjectContext();
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        // Convert input mm back to meters for state storage
        const mm = value === '' ? 0 : parseFloat(value);
        setCurrentProject(prev => ({...prev, [id]: mm / 1000 }));
    }

    const renderInputRow = (label: string, id: keyof typeof currentProject, placeholder: string) => {
        // Convert internal meters to display millimeters
        const meterValue = currentProject[id] as number;
        const displayValue = meterValue ? Math.round(meterValue * 1000) : '';

        return (
            <tr>
                <td className="py-3 px-2 font-medium text-slate-700 w-1/3"><label htmlFor={id.toString()}>{label}</label></td>
                <td className="py-2 px-2 w-2/3">
                    <input 
                        type="number" 
                        id={id.toString()}
                        value={displayValue}
                        onChange={handleChange}
                        placeholder={placeholder}
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                </td>
            </tr>
        );
    };

    return (
        <TabContent title="Delivery & Shipping" icon="fas fa-truck">
            <p className="mb-4 text-slate-600">Enter the dimensions of the final, assembled, and packaged shipment to calculate shipping costs. <strong>All dimensions in millimeters (mm).</strong></p>
            <table className="w-full border-collapse">
                <tbody>
                    {renderInputRow("Overall Shippable Length (mm)", "shippingLength", "e.g., 2400")}
                    {renderInputRow("Overall Shippable Width (mm)", "shippingWidth", "e.g., 1200")}
                    {renderInputRow("Overall Shippable Height (mm)", "shippingHeight", "e.g., 1800")}
                </tbody>
            </table>
        </TabContent>
    );
};

export default DeliverySpecTab;