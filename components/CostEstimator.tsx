import React, { useState } from 'react';
import { User, Project } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface CostEstimatorProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onBack: () => void;
  project?: Project;
}

interface CostEstimate {
  materials: number;
  labor: number;
  equipment: number;
  overhead: number;
  contingency: number;
  summary: string;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-GB', { 
  style: 'currency', 
  currency: 'GBP', 
  minimumFractionDigits: 0 
}).format(amount);

export const CostEstimator: React.FC<CostEstimatorProps> = ({ user, addToast, onBack, project }) => {
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    projectType: 'residential',
    size: '',
    location: '',
    duration: '',
    complexity: 'medium'
  });

  const handleGenerateEstimate = async () => {
    if (!formData.size || !formData.location || !formData.duration) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    setIsGenerating(true);

    try {
      // Simulate API call for cost estimation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock estimation calculation
      const baseSize = parseInt(formData.size) || 1000;
      const baseCostPerSqm = {
        residential: 800,
        commercial: 1200,
        industrial: 1000
      }[formData.projectType] || 800;

      const complexityMultiplier = {
        low: 0.8,
        medium: 1.0,
        high: 1.3
      }[formData.complexity] || 1.0;

      const materials = baseSize * baseCostPerSqm * 0.4 * complexityMultiplier;
      const labor = baseSize * baseCostPerSqm * 0.35 * complexityMultiplier;
      const equipment = baseSize * baseCostPerSqm * 0.15 * complexityMultiplier;
      const overhead = (materials + labor + equipment) * 0.1;
      const contingency = (materials + labor + equipment + overhead) * 0.1;

      const newEstimate: CostEstimate = {
        materials,
        labor,
        equipment,
        overhead,
        contingency,
        summary: `Cost estimate for ${formData.projectType} project of ${formData.size} sq.m in ${formData.location}`
      };

      setEstimate(newEstimate);
      addToast('Cost estimate generated successfully', 'success');
    } catch (error) {
      addToast('Failed to generate cost estimate', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const totalCost = estimate ? 
    estimate.materials + estimate.labor + estimate.equipment + estimate.overhead + estimate.contingency : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" onClick={onBack} className="p-2">
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Cost Estimator</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Project Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Type
                </label>
                <select
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size (sq.m) *
                </label>
                <input
                  type="number"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project size"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (months) *
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter estimated duration"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complexity
                </label>
                <select
                  value={formData.complexity}
                  onChange={(e) => setFormData({ ...formData, complexity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <Button 
                onClick={handleGenerateEstimate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Generating...' : 'Generate Estimate'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Results */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
            
            {!estimate ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">💰</div>
                <p>Generate an estimate to see cost breakdown</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Materials</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatCurrency(estimate.materials)}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Labor</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(estimate.labor)}
                    </p>
                  </div>
                  
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Equipment</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {formatCurrency(estimate.equipment)}
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Overhead</p>
                    <p className="text-lg font-semibold text-purple-600">
                      {formatCurrency(estimate.overhead)}
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Contingency (10%)</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    {formatCurrency(estimate.contingency)}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Estimate:</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{estimate.summary}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    * This is a preliminary estimate. Actual costs may vary based on specific requirements and market conditions.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
