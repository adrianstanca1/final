import React, { useState } from 'react';
import { User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { generateCostEstimate, CostEstimateInput, CostEstimateResult } from '../services/ai';


interface CostEstimatorProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
    onBack: () => void;
}

interface Estimate {
    totalEstimate: number;
    breakdown: {
        category: string;
        cost: number;
        details: string;
    }[];
    contingency: number;
    summary: string;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0
}).format(amount);

export const CostEstimator: React.FC<CostEstimatorProps> = ({ user, addToast, onBack }) => {
    const [description, setDescription] = useState('');
    const [sqft, setSqft] = useState('');
    const [quality, setQuality] = useState('medium');
    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleEstimate = async () => {
        if (!description.trim() || !sqft || isNaN(Number(sqft))) {
            addToast('Please provide valid project description and square footage.', 'error');
            return;
        }

        setIsLoading(true);
        setEstimate(null);

        try {
            const sqftNum = Number(sqft);
            const base = quality === 'high' ? 250 : quality === 'medium' ? 200 : 150;
            const total = Math.round(base * sqftNum);
            const breakdown = [
                { category: 'Materials', cost: Math.round(total * 0.5), details: 'Concrete, steel, timber, finishes, fixtures' },
                { category: 'Labor', cost: Math.round(total * 0.35), details: 'Skilled and unskilled labor, supervision' },
                { category: 'Overheads', cost: Math.round(total * 0.1), details: 'Site setup, insurance, preliminaries' },
                { category: 'Permits & Fees', cost: Math.round(total * 0.05), details: 'Planning, building control, inspections' },
            ];
            const contingency = Math.round(total * 0.1);
            const result: Estimate = {
                totalEstimate: total,
                breakdown,
                contingency,
                summary: `Estimated cost for ${sqftNum.toLocaleString()} sq ft (${quality}) based on UK norms. Adjust for specification and site conditions.`,
            };
            setEstimate(result);
            addToast("Cost estimate generated!", "success");
        } catch (error) {
            console.error('Cost estimation error:', error);
            addToast("Failed to generate cost estimate.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cost Estimator</h2>
                <Button onClick={onBack} variant="outline">
                    ← Back
                </Button>
            </div>

            <Card className="p-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Project Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your construction project..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Square Footage
                        </label>
                        <input
                            type="number"
                            value={sqft}
                            onChange={(e) => setSqft(e.target.value)}
                            placeholder="Enter square footage"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Quality Level
                        </label>
                        <select
                            title="Quality Level"
                            value={quality}
                            onChange={(e) => setQuality(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="basic">Basic</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    <Button
                        onClick={handleEstimate}
                        disabled={isLoading}
                        className="w-full"
                    >
                        {isLoading ? 'Generating Estimate...' : 'Generate Cost Estimate'}
                    </Button>
                </div>
            </Card>

            {estimate && (
                <Card className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Cost Estimate Results
                    </h3>

                    <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                Total Estimate: {formatCurrency(estimate.totalEstimate)}
                            </div>
                            <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                Plus {formatCurrency(estimate.contingency)} contingency
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Cost Breakdown</h4>
                            <div className="space-y-2">
                                {estimate.breakdown.map((item) => (
                                    <div key={item.category + '-' + item.cost} className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-700 rounded">
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {item.category}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                {item.details}
                                            </div>
                                        </div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(item.cost)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Summary</h4>
                            <p className="text-gray-700 dark:text-gray-300">{estimate.summary}</p>
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            * This is an estimated cost based on typical UK construction rates.
                            Actual costs may vary based on location, market conditions, and specific requirements.
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};
