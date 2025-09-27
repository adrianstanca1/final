import React, { useState } from 'react';
import type { User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
<<<<<<< HEAD
import {
  generateCostEstimate,
  type CostEstimateResult,
  type CostEstimateQuality,
} from '../services/ai';
=======
import * as api from '../services/mockApi';
import { GoogleGenAI } from "@google/genai";
>>>>>>> origin/main

interface CostEstimatorProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onBack: () => void;
}

<<<<<<< HEAD
const QUALITY_OPTIONS: Array<{ value: CostEstimateQuality; label: string; helper: string }> = [
  { value: 'basic', label: 'Basic', helper: 'Shell and core with economical finishes.' },
  { value: 'standard', label: 'Standard', helper: 'Balanced specification for commercial fit-out.' },
  { value: 'high-end', label: 'High-End', helper: 'Premium finishes and complex MEP integration.' },
];

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

const DEFAULT_CURRENCY = 'GBP';

export const CostEstimator: React.FC<CostEstimatorProps> = ({ user, addToast, onBack }) => {
  const [description, setDescription] = useState('');
  const [squareFootage, setSquareFootage] = useState<number | ''>('');
  const [quality, setQuality] = useState<CostEstimateQuality>('standard');
  const [estimate, setEstimate] = useState<CostEstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEstimate = async () => {
    const trimmedDescription = description.trim();
    const sqftValue = typeof squareFootage === 'number' ? squareFootage : Number(squareFootage);

    if (!trimmedDescription) {
      addToast('Please describe the project to scope the estimate.', 'error');
      return;
    }

    if (!Number.isFinite(sqftValue) || sqftValue <= 0) {
      addToast('Enter a positive square footage to size the works.', 'error');
      return;
    }

    setIsLoading(true);
    setEstimate(null);

    try {
      const result = await generateCostEstimate({
        description: trimmedDescription,
        squareFootage: sqftValue,
        quality,
        currency: DEFAULT_CURRENCY,
        requestedBy: `${user.firstName} ${user.lastName}`.trim(),
      });

      setEstimate(result);
      if (result.isFallback) {
        addToast('Using offline baseline costs. Configure Gemini for live market pricing.', 'error');
      } else {
        addToast('Gemini generated a fresh cost model.', 'success');
      }
    } catch (error) {
      console.error('[CostEstimator] Unable to generate estimate', error);
      addToast('Failed to generate cost estimate. Please try again shortly.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-slate-800">AI Cost Estimator</h3>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div>
            <label htmlFor="cost-description" className="block text-sm font-medium text-slate-600">
              Project scope
            </label>
            <textarea
              id="cost-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
              rows={5}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
              placeholder="e.g. 2-storey office with meeting suites, cafe, and exposed services."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cost-square-footage" className="block text-sm font-medium text-slate-600">
                Floor area (sq ft)
              </label>
              <input
                id="cost-square-footage"
                type="number"
                min={1}
                value={squareFootage}
                onChange={event => {
                  const value = event.target.value;
                  setSquareFootage(value === '' ? '' : Number(value));
                }}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
                placeholder="5000"
              />
            </div>

            <div>
              <label htmlFor="cost-quality" className="block text-sm font-medium text-slate-600">
                Finish quality
              </label>
              <select
                id="cost-quality"
                value={quality}
                onChange={event => setQuality(event.target.value as CostEstimateQuality)}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm shadow-sm focus:border-sky-500 focus:outline-none"
              >
                {QUALITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                {QUALITY_OPTIONS.find(option => option.value === quality)?.helper}
              </p>
            </div>
          </div>

          <Button onClick={handleEstimate} isLoading={isLoading} disabled={isLoading}>
            Generate estimate
          </Button>
        </div>

        <div className="space-y-4">
          {isLoading && <p className="text-sm text-slate-500">Gemini is preparing the estimate…</p>}

          {estimate && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-inner">
              <div className="rounded-lg bg-sky-100 p-4 text-center">
                <p className="text-sm font-medium text-sky-700">Total estimated cost</p>
                <p className="text-3xl font-bold text-sky-900">
                  {formatCurrency(
                    estimate.totalEstimate,
                    typeof estimate.metadata.currency === 'string'
                      ? (estimate.metadata.currency as string)
                      : DEFAULT_CURRENCY,
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {estimate.isFallback ? 'Baseline offline calculation' : estimate.model ?? 'Gemini'}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700">Cost allocation</h4>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {estimate.breakdown.map(item => (
                    <li key={item.category} className="flex items-start justify-between gap-3">
                      <span className="font-medium text-slate-700">{item.category}</span>
                      <span>
                        {formatCurrency(
                          item.cost,
                          typeof estimate.metadata.currency === 'string'
                            ? (estimate.metadata.currency as string)
                            : DEFAULT_CURRENCY,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-slate-500">
                  Contingency allowance:{' '}
                  {formatCurrency(
                    estimate.contingency,
                    typeof estimate.metadata.currency === 'string'
                      ? (estimate.metadata.currency as string)
                      : DEFAULT_CURRENCY,
                  )}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700">Summary</h4>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{estimate.summary}</p>
              </div>
            </div>
          )}

          {!estimate && !isLoading && (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              Provide scope and size to calculate a Gemini-backed budget envelope.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
=======
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
            // Try Gemini AI first if API key is available
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            
            if (apiKey && apiKey !== 'your_gemini_api_key_here') {
                try {
                    const genAI = new GoogleGenAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    
                    const prompt = `Provide a UK-based construction cost estimate for the following project: "${description}". Square footage: ${sqft} sq ft. Quality: ${quality}. 

Please respond with a JSON object containing:
- totalEstimate: total cost in GBP (number)
- breakdown: array of cost categories with category name, cost, and details
- contingency: contingency amount in GBP (number, typically 10-15% of total)
- summary: brief summary of the estimate

Use realistic UK construction costs per square foot based on the quality level.`;

                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text();
                    
                    // Try to extract JSON from the response
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const estimateData = JSON.parse(jsonMatch[0]);
                        setEstimate(estimateData);
                        addToast("AI cost estimate generated!", "success");
                        return;
                    }
                } catch (aiError) {
                    console.warn('Gemini AI error, falling back to local estimation:', aiError);
                }
            }
            
            // Fallback to local estimation
            const result = await api.generateCostEstimate(description, Number(sqft), quality);
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
>>>>>>> origin/main
