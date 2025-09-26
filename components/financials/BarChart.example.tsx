import React from 'react';
import BarChart from './BarChart';

// Example usage of the BarChart component
export const BarChartExamples: React.FC = () => {
    // Sample data for different chart scenarios
    const revenueData = [
        { label: 'Jan', value: 12000 },
        { label: 'Feb', value: 15000 },
        { label: 'Mar', value: 18000 },
        { label: 'Apr', value: 14000 },
        { label: 'May', value: 22000 },
        { label: 'Jun', value: 19000 }
    ];

    const expenseData = [
        { label: 'Materials', value: 25000, color: 'bg-red-500' },
        { label: 'Labor', value: 18000, color: 'bg-yellow-500' },
        { label: 'Equipment', value: 12000, color: 'bg-green-500' },
        { label: 'Overhead', value: 8000, color: 'bg-purple-500' }
    ];

    const profitLossData = [
        { label: 'Q1', value: 5000 },
        { label: 'Q2', value: -2000 },
        { label: 'Q3', value: 8000 },
        { label: 'Q4', value: 12000 }
    ];

    const projectProgress = [
        { label: 'Foundation', value: 100 },
        { label: 'Framing', value: 85 },
        { label: 'Roofing', value: 60 },
        { label: 'Electrical', value: 30 },
        { label: 'Plumbing', value: 25 },
        { label: 'Finishing', value: 0 }
    ];

    return (
        <div className="space-y-8 p-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                BarChart Component Examples
            </h1>

            {/* Basic Revenue Chart */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                    Monthly Revenue
                </h2>
                <BarChart
                    data={revenueData}
                    height="md"
                    showValues={true}
                    showGrid={true}
                    barColor="bg-blue-500"
                    currency={true}
                    animate={true}
                />
            </div>

            {/* Expense Breakdown with Custom Colors */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                    Expense Breakdown
                </h2>
                <BarChart
                    data={expenseData}
                    height="lg"
                    showValues={true}
                    showGrid={true}
                    currency={true}
                    animate={true}
                />
            </div>

            {/* Profit/Loss with Negative Values */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                    Quarterly Profit/Loss
                </h2>
                <BarChart
                    data={profitLossData}
                    height="md"
                    showValues={true}
                    showGrid={true}
                    barColor="bg-indigo-500"
                    currency={true}
                    animate={true}
                />
            </div>

            {/* Project Progress (Non-Currency) */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                    Project Progress (%)
                </h2>
                <BarChart
                    data={projectProgress}
                    height="sm"
                    showValues={true}
                    showGrid={false}
                    barColor="bg-green-500"
                    currency={false}
                    animate={true}
                />
            </div>

            {/* Compact Chart Without Grid */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                    Compact View
                </h2>
                <BarChart
                    data={revenueData.slice(0, 4)}
                    height="sm"
                    showValues={false}
                    showGrid={false}
                    barColor="bg-teal-500"
                    currency={true}
                    animate={false}
                    className="max-w-md"
                />
            </div>

            {/* Empty State */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                    Empty State
                </h2>
                <BarChart
                    data={[]}
                    height="md"
                    showValues={true}
                    showGrid={true}
                    barColor="bg-gray-500"
                    currency={true}
                />
            </div>
        </div>
    );
};

export default BarChartExamples;