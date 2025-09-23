import React from 'react';
import { formatCurrency } from '../../utils/finance';
import './BarChart.css';

interface BarChartProps {
    data: { label: string; value: number }[];
    barColor: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, barColor }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    return (
        <div className="w-full h-64 flex items-end justify-around p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
            {data.map((item, index) => (
                <div key={index} className="flex flex-col items-center justify-end h-full w-full">
                    {(() => {
                        const pct = maxValue > 0 ? Math.max(0, Math.min(100, Math.round(((item.value / maxValue) * 100) / 5) * 5)) : 0;
                        return (
                            <div
                                className={`w-3/4 rounded-t-md ${barColor} h-pct-${pct}`}
                                title={formatCurrency(item.value)}
                            ></div>
                        );
                    })()}
                    <span className="text-xs mt-2 text-slate-600">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

export default BarChart;
