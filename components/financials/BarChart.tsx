import React, { useMemo } from 'react';
import { formatCurrency } from '../../utils/finance';

interface BarChartData {
    label: string;
    value: number;
    color?: string;
}

interface BarChartProps {
    data: BarChartData[];
    height?: 'sm' | 'md' | 'lg' | 'xl';
    showValues?: boolean;
    showGrid?: boolean;
    barColor?: string;
    currency?: boolean;
    className?: string;
    animate?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({
    data,
    height = 'md',
    showValues = false,
    showGrid = true,
    barColor = 'bg-blue-500',
    currency = true,
    className = '',
    animate = true
}) => {
    const heightClasses = {
        sm: 'h-32',
        md: 'h-48',
        lg: 'h-64',
        xl: 'h-80'
    };

    const chartData = useMemo(() => {
        if (data.length === 0) return { maxValue: 0, minValue: 0, range: 0, hasNegativeValues: false };

        const values = data.map(d => d.value);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const range = maxValue - minValue;

        return {
            maxValue,
            minValue,
            range,
            hasNegativeValues: minValue < 0
        };
    }, [data]);

    const formatValue = (value: number) => {
        return currency ? formatCurrency(value) : value.toLocaleString();
    };

    const getBarHeightClass = (value: number) => {
        if (chartData.range === 0) return 'h-0';

        let percentage: number;
        if (chartData.hasNegativeValues) {
            percentage = ((Math.abs(value) - 0) / Math.max(Math.abs(chartData.maxValue), Math.abs(chartData.minValue))) * 100;
        } else {
            percentage = (value / chartData.maxValue) * 100;
        }

        // Convert to Tailwind height classes based on percentage
        if (percentage >= 95) return 'h-full';
        if (percentage >= 90) return 'h-[90%]';
        if (percentage >= 80) return 'h-4/5';
        if (percentage >= 75) return 'h-3/4';
        if (percentage >= 66) return 'h-2/3';
        if (percentage >= 60) return 'h-3/5';
        if (percentage >= 50) return 'h-1/2';
        if (percentage >= 40) return 'h-2/5';
        if (percentage >= 33) return 'h-1/3';
        if (percentage >= 25) return 'h-1/4';
        if (percentage >= 20) return 'h-1/5';
        if (percentage >= 10) return 'h-[10%]';
        if (percentage >= 5) return 'h-[5%]';
        return percentage > 0 ? 'h-1' : 'h-0';
    };

    const generateGridValues = () => {
        if (chartData.range === 0) return [];
        const step = chartData.range / 4;
        return Array.from({ length: 5 }, (_, i) => chartData.minValue + (step * i));
    };

    const gridValues = showGrid ? generateGridValues() : [];

    return (
        <div className={`w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
            <div className={`relative w-full ${heightClasses[height]}`}>
                {/* Grid lines and values */}
                {showGrid && gridValues.length > 0 && (
                    <div className="absolute inset-0 flex flex-col justify-between py-2">
                        {gridValues.reverse().map((value, index) => (
                            <div key={index} className="flex items-center">
                                <span className="text-xs text-gray-500 w-16 text-right pr-2 flex-shrink-0">
                                    {formatValue(value)}
                                </span>
                                <div className="flex-1 border-t border-gray-200 dark:border-gray-600" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Chart bars */}
                <div className="absolute bottom-0 left-0 right-0 h-full">
                    {data.length === 0 ? (
                        <div className="flex items-center justify-center w-full h-full">
                            <div className="text-gray-500 dark:text-gray-400 text-center">
                                <div className="text-4xl mb-2">📊</div>
                                <div className="text-sm">No data available</div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-end justify-around px-4 pb-4 h-full">
                            {data.map((item, index) => {
                                const isNegative = item.value < 0;
                                const heightClass = getBarHeightClass(item.value);

                                return (
                                    <div key={`${item.label}-${index}`} className="flex flex-col items-center flex-1 max-w-16 h-full">
                                        {/* Value label */}
                                        {showValues && (
                                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                                                {formatValue(item.value)}
                                            </div>
                                        )}

                                        {/* Bar container */}
                                        <div className="flex flex-col justify-end flex-1 w-full">
                                            <div
                                                className={`w-8 mx-auto ${heightClass} ${item.color || barColor
                                                    } ${animate ? 'transition-all duration-1000 ease-out' : ''
                                                    } ${isNegative ? 'rounded-b-md' : 'rounded-t-md'
                                                    } hover:opacity-80 cursor-pointer shadow-sm border border-white dark:border-gray-600`}
                                                title={`${item.label}: ${formatValue(item.value)}`}
                                            />
                                        </div>

                                        {/* Label */}
                                        <div className="text-xs text-center text-gray-600 dark:text-gray-400 mt-2 max-w-full truncate">
                                            {item.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Zero line for negative values */}
                {chartData.hasNegativeValues && (
                    <div className="absolute left-4 right-4 top-1/2 border-t-2 border-gray-400 dark:border-gray-500" />
                )}
            </div>
        </div>
    );
};

export default BarChart;
