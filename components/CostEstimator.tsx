import React, { useState } from 'react';
import type { User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import {
  generateCostEstimate,
  type CostEstimateResult,
  type CostEstimateQuality,
} from '../services/ai';

interface CostEstimatorProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onBack: () => void;
}

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
