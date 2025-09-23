import React, { useEffect, useRef, useState } from 'react';
import './AdvancedDataVisualization.css';
import * as d3 from 'd3';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TenderOpportunity, AnalysisReport } from '../../types/procurement';
import { User } from '../../types';

interface VisualizationProps {
    user: User;
    tenders: TenderOpportunity[];
    analyses: AnalysisReport[];
}

interface PipelineData {
    stage: string;
    count: number;
    value: number;
    color: string;
}

interface ROIData {
    period: string;
    roi: number;
    revenue: number;
    costs: number;
}

interface PerformanceMetric {
    metric: string;
    value: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
}

export const AdvancedDataVisualization: React.FC<VisualizationProps> = ({
    user,
    tenders,
    analyses
}) => {
    const [activeView, setActiveView] = useState<'pipeline' | 'roi' | 'performance' | 'trends'>('pipeline');
    const pipelineChartRef = useRef<SVGSVGElement>(null);
    const roiChartRef = useRef<SVGSVGElement>(null);
    const performanceChartRef = useRef<SVGSVGElement>(null);
    const trendsChartRef = useRef<SVGSVGElement>(null);

    // Sample data (in production, this would come from your API)
    const pipelineData: PipelineData[] = [
        { stage: 'Identified', count: 45, value: 12500000, color: '#3B82F6' },
        { stage: 'Analyzed', count: 32, value: 9800000, color: '#8B5CF6' },
        { stage: 'Submitted', count: 18, value: 7200000, color: '#10B981' },
        { stage: 'Shortlisted', count: 8, value: 4100000, color: '#F59E0B' },
        { stage: 'Won', count: 3, value: 1850000, color: '#EF4444' },
    ];

    const roiData: ROIData[] = [
        { period: 'Q1 2024', roi: 15.2, revenue: 2400000, costs: 2085000 },
        { period: 'Q2 2024', roi: 18.7, revenue: 2850000, costs: 2400000 },
        { period: 'Q3 2024', roi: 22.1, revenue: 3200000, costs: 2620000 },
        { period: 'Q4 2024', roi: 19.8, revenue: 2950000, costs: 2462000 },
        { period: 'Q1 2025', roi: 24.3, revenue: 3450000, costs: 2775000 },
    ];

    const performanceMetrics: PerformanceMetric[] = [
        { metric: 'Win Rate', value: 16.7, target: 20.0, trend: 'up', change: 2.3 },
        { metric: 'Avg Bid Value', value: 1250000, target: 1500000, trend: 'up', change: 15.2 },
        { metric: 'Response Time', value: 12.5, target: 10.0, trend: 'down', change: -1.8 },
        { metric: 'Success Score', value: 78.2, target: 85.0, trend: 'up', change: 4.1 },
        { metric: 'Pipeline Value', value: 35600000, target: 40000000, trend: 'up', change: 8.7 },
    ];

    useEffect(() => {
        if (activeView === 'pipeline' && pipelineChartRef.current) {
            createPipelineChart();
        } else if (activeView === 'roi' && roiChartRef.current) {
            createROIChart();
        } else if (activeView === 'performance' && performanceChartRef.current) {
            createPerformanceChart();
        } else if (activeView === 'trends' && trendsChartRef.current) {
            createTrendsChart();
        }
    }, [activeView]);

    const createPipelineChart = () => {
        if (!pipelineChartRef.current) return;

        // Clear previous chart
        d3.select(pipelineChartRef.current).selectAll('*').remove();

        const svg = d3.select(pipelineChartRef.current);
        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const xScale = d3.scaleBand()
            .domain(pipelineData.map(d => d.stage))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(pipelineData, d => d.count) || 0])
            .range([height, 0]);

        // Bars
        g.selectAll('.bar')
            .data(pipelineData)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.stage) || 0)
            .attr('width', xScale.bandwidth())
            .attr('y', height)
            .attr('height', 0)
            .attr('fill', d => d.color)
            .attr('rx', 4)
            .transition()
            .duration(1000)
            .ease(d3.easeElastic)
            .attr('y', d => yScale(d.count))
            .attr('height', d => height - yScale(d.count));

        // Value labels on bars
        g.selectAll('.value-label')
            .data(pipelineData)
            .enter().append('text')
            .attr('class', 'value-label')
            .attr('x', d => (xScale(d.stage) || 0) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.count) - 5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#374151')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(d => d.count);

        // Count labels below bars
        g.selectAll('.stage-value')
            .data(pipelineData)
            .enter().append('text')
            .attr('class', 'stage-value')
            .attr('x', d => (xScale(d.stage) || 0) + xScale.bandwidth() / 2)
            .attr('y', height + 15)
            .attr('text-anchor', 'middle')
            .attr('fill', '#6B7280')
            .attr('font-size', '12px')
            .text(d => `$${(d.value / 1000000).toFixed(1)}M`);

        // Axes
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .attr('fill', '#374151')
            .attr('font-size', '12px');

        g.append('g')
            .call(d3.axisLeft(yScale))
            .selectAll('text')
            .attr('fill', '#374151')
            .attr('font-size', '12px');

        // Y-axis label
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .attr('fill', '#374151')
            .attr('font-size', '14px')
            .text('Number of Tenders');
    };

    const createROIChart = () => {
        if (!roiChartRef.current) return;

        d3.select(roiChartRef.current).selectAll('*').remove();

        const svg = d3.select(roiChartRef.current);
        const margin = { top: 20, right: 80, bottom: 40, left: 60 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const xScale = d3.scaleBand()
            .domain(roiData.map(d => d.period))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(roiData, d => Math.max(d.revenue, d.costs)) || 0])
            .range([height, 0]);

        const roiScale = d3.scaleLinear()
            .domain([0, d3.max(roiData, d => d.roi) || 0])
            .range([height, 0]);

        // Revenue bars
        g.selectAll('.revenue-bar')
            .data(roiData)
            .enter().append('rect')
            .attr('class', 'revenue-bar')
            .attr('x', d => xScale(d.period) || 0)
            .attr('width', xScale.bandwidth() / 2 - 2)
            .attr('y', height)
            .attr('height', 0)
            .attr('fill', '#10B981')
            .attr('rx', 2)
            .transition()
            .duration(1000)
            .attr('y', d => yScale(d.revenue))
            .attr('height', d => height - yScale(d.revenue));

        // Cost bars
        g.selectAll('.cost-bar')
            .data(roiData)
            .enter().append('rect')
            .attr('class', 'cost-bar')
            .attr('x', d => (xScale(d.period) || 0) + xScale.bandwidth() / 2 + 2)
            .attr('width', xScale.bandwidth() / 2 - 2)
            .attr('y', height)
            .attr('height', 0)
            .attr('fill', '#EF4444')
            .attr('rx', 2)
            .transition()
            .duration(1000)
            .delay(200)
            .attr('y', d => yScale(d.costs))
            .attr('height', d => height - yScale(d.costs));

        // ROI line
        const line = d3.line<ROIData>()
            .x(d => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
            .y(d => roiScale(d.roi))
            .curve(d3.curveMonotoneX);

        const path = g.append('path')
            .datum(roiData)
            .attr('fill', 'none')
            .attr('stroke', '#8B5CF6')
            .attr('stroke-width', 3)
            .attr('d', line);

        const totalLength = (path.node() as SVGPathElement)?.getTotalLength() || 0;
        path
            .attr('stroke-dasharray', totalLength + ' ' + totalLength)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0);

        // ROI points
        g.selectAll('.roi-point')
            .data(roiData)
            .enter().append('circle')
            .attr('class', 'roi-point')
            .attr('cx', d => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
            .attr('cy', d => roiScale(d.roi))
            .attr('r', 0)
            .attr('fill', '#8B5CF6')
            .transition()
            .duration(1000)
            .delay(1500)
            .attr('r', 5);

        // ROI labels
        g.selectAll('.roi-label')
            .data(roiData)
            .enter().append('text')
            .attr('class', 'roi-label')
            .attr('x', d => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
            .attr('y', d => roiScale(d.roi) - 10)
            .attr('text-anchor', 'middle')
            .attr('fill', '#8B5CF6')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text(d => `${d.roi}%`);

        // Axes
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        g.append('g')
            .call(d3.axisLeft(yScale).tickFormat(d => `$${(d as number) / 1000000}M`));

        g.append('g')
            .attr('transform', `translate(${width}, 0)`)
            .call(d3.axisRight(roiScale).tickFormat(d => `${d as number}%`))
            .selectAll('text')
            .attr('fill', '#8B5CF6');

        // Legend
        const legend = g.append('g')
            .attr('transform', `translate(${width - 100}, 20)`);

        legend.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', '#10B981');

        legend.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .attr('fill', '#374151')
            .attr('font-size', '12px')
            .text('Revenue');

        legend.append('rect')
            .attr('x', 0)
            .attr('y', 20)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', '#EF4444');

        legend.append('text')
            .attr('x', 20)
            .attr('y', 32)
            .attr('fill', '#374151')
            .attr('font-size', '12px')
            .text('Costs');

        legend.append('line')
            .attr('x1', 0)
            .attr('x2', 15)
            .attr('y1', 47)
            .attr('y2', 47)
            .attr('stroke', '#8B5CF6')
            .attr('stroke-width', 3);

        legend.append('text')
            .attr('x', 20)
            .attr('y', 52)
            .attr('fill', '#374151')
            .attr('font-size', '12px')
            .text('ROI %');
    };

    const createPerformanceChart = () => {
        if (!performanceChartRef.current) return;

        d3.select(performanceChartRef.current).selectAll('*').remove();

        const svg = d3.select(performanceChartRef.current);
        const margin = { top: 20, right: 30, bottom: 100, left: 100 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Radar chart data preparation
        const angles = performanceMetrics.map((_, i) => (i * 2 * Math.PI) / performanceMetrics.length);
        const radius = Math.min(width, height) / 2 - 40;

        // Normalize values to 0-1 scale
        const normalizedData = performanceMetrics.map(d => ({
            ...d,
            normalizedValue: d.value / d.target,
            normalizedTarget: 1
        }));

        // Draw radar chart
        const centerX = width / 2;
        const centerY = height / 2;

        // Grid circles
        for (let i = 1; i <= 5; i++) {
            g.append('circle')
                .attr('cx', centerX)
                .attr('cy', centerY)
                .attr('r', (radius * i) / 5)
                .attr('fill', 'none')
                .attr('stroke', '#E5E7EB')
                .attr('stroke-width', 1);
        }

        // Grid lines
        angles.forEach(angle => {
            g.append('line')
                .attr('x1', centerX)
                .attr('y1', centerY)
                .attr('x2', centerX + Math.cos(angle - Math.PI / 2) * radius)
                .attr('y2', centerY + Math.sin(angle - Math.PI / 2) * radius)
                .attr('stroke', '#E5E7EB')
                .attr('stroke-width', 1);
        });

        // Target polygon
        const targetPoints = normalizedData.map((d, i) => {
            const angle = angles[i];
            const r = radius * d.normalizedTarget;
            return [
                centerX + Math.cos(angle - Math.PI / 2) * r,
                centerY + Math.sin(angle - Math.PI / 2) * r
            ];
        });

        g.append('polygon')
            .attr('points', targetPoints.map(p => p.join(',')).join(' '))
            .attr('fill', '#3B82F6')
            .attr('fill-opacity', 0.1)
            .attr('stroke', '#3B82F6')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');

        // Actual values polygon
        const actualPoints = normalizedData.map((d, i) => {
            const angle = angles[i];
            const r = radius * d.normalizedValue;
            return [
                centerX + Math.cos(angle - Math.PI / 2) * r,
                centerY + Math.sin(angle - Math.PI / 2) * r
            ];
        });

        g.append('polygon')
            .attr('points', actualPoints.map(p => p.join(',')).join(' '))
            .attr('fill', '#10B981')
            .attr('fill-opacity', 0.3)
            .attr('stroke', '#10B981')
            .attr('stroke-width', 3);

        // Data points
        actualPoints.forEach((point, i) => {
            g.append('circle')
                .attr('cx', point[0])
                .attr('cy', point[1])
                .attr('r', 5)
                .attr('fill', '#10B981')
                .attr('stroke', 'white')
                .attr('stroke-width', 2);
        });

        // Labels
        normalizedData.forEach((d, i) => {
            const angle = angles[i];
            const labelRadius = radius + 20;
            const x = centerX + Math.cos(angle - Math.PI / 2) * labelRadius;
            const y = centerY + Math.sin(angle - Math.PI / 2) * labelRadius;

            g.append('text')
                .attr('x', x)
                .attr('y', y)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', '#374151')
                .attr('font-size', '12px')
                .attr('font-weight', 'bold')
                .text(d.metric);
        });
    };

    const createTrendsChart = () => {
        if (!trendsChartRef.current) return;

        d3.select(trendsChartRef.current).selectAll('*').remove();

        const svg = d3.select(trendsChartRef.current);
        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Sample trend data
        const trendData = [
            { month: 'Jan', winRate: 14.2, avgValue: 1100000, submissions: 28 },
            { month: 'Feb', winRate: 15.8, avgValue: 1180000, submissions: 32 },
            { month: 'Mar', winRate: 13.5, avgValue: 1250000, submissions: 29 },
            { month: 'Apr', winRate: 16.7, avgValue: 1320000, submissions: 35 },
            { month: 'May', winRate: 18.2, avgValue: 1280000, submissions: 41 },
            { month: 'Jun', winRate: 19.1, avgValue: 1450000, submissions: 38 },
        ];

        // Scales
        const xScale = d3.scaleBand()
            .domain(trendData.map(d => d.month))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(trendData, d => d.winRate) || 0])
            .range([height, 0]);

        // Line for win rate
        const line = d3.line<typeof trendData[0]>()
            .x(d => (xScale(d.month) || 0) + xScale.bandwidth() / 2)
            .y(d => yScale(d.winRate))
            .curve(d3.curveMonotoneX);

        // Area under the line
        const area = d3.area<typeof trendData[0]>()
            .x(d => (xScale(d.month) || 0) + xScale.bandwidth() / 2)
            .y0(height)
            .y1(d => yScale(d.winRate))
            .curve(d3.curveMonotoneX);

        // Add gradient
        const gradient = g.append('defs')
            .append('linearGradient')
            .attr('id', 'area-gradient')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', height)
            .attr('x2', 0).attr('y2', 0);

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#3B82F6')
            .attr('stop-opacity', 0.1);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#3B82F6')
            .attr('stop-opacity', 0.5);

        // Draw area
        g.append('path')
            .datum(trendData)
            .attr('fill', 'url(#area-gradient)')
            .attr('d', area);

        // Draw line
        g.append('path')
            .datum(trendData)
            .attr('fill', 'none')
            .attr('stroke', '#3B82F6')
            .attr('stroke-width', 3)
            .attr('d', line);

        // Add points
        g.selectAll('.trend-point')
            .data(trendData)
            .enter().append('circle')
            .attr('class', 'trend-point')
            .attr('cx', d => (xScale(d.month) || 0) + xScale.bandwidth() / 2)
            .attr('cy', d => yScale(d.winRate))
            .attr('r', 5)
            .attr('fill', '#3B82F6')
            .attr('stroke', 'white')
            .attr('stroke-width', 2);

        // Add value labels
        g.selectAll('.trend-label')
            .data(trendData)
            .enter().append('text')
            .attr('class', 'trend-label')
            .attr('x', d => (xScale(d.month) || 0) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.winRate) - 10)
            .attr('text-anchor', 'middle')
            .attr('fill', '#374151')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text(d => `${d.winRate}%`);

        // Axes
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        g.append('g')
            .call(d3.axisLeft(yScale).tickFormat(d => `${d}%`));

        // Y-axis label
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .attr('fill', '#374151')
            .text('Win Rate (%)');
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'up': return '📈';
            case 'down': return '📉';
            case 'stable': return '➡️';
            default: return '📊';
        }
    };

    const formatValue = (metric: string, value: number) => {
        switch (metric) {
            case 'Win Rate':
            case 'Success Score':
                return `${value}%`;
            case 'Avg Bid Value':
            case 'Pipeline Value':
                return `$${(value / 1000000).toFixed(1)}M`;
            case 'Response Time':
                return `${value} days`;
            default:
                return value.toString();
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    📊 Advanced Data Visualization
                </h1>
                <p className="text-gray-600">
                    Interactive charts and analytics for procurement pipeline performance
                </p>
            </div>

            {/* View Toggle */}
            <div className="mb-6">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    {[
                        { id: 'pipeline', label: 'Pipeline Analysis', icon: '🔄' },
                        { id: 'roi', label: 'ROI Tracking', icon: '💰' },
                        { id: 'performance', label: 'Performance Radar', icon: '🎯' },
                        { id: 'trends', label: 'Trend Analysis', icon: '📈' },
                    ].map((view) => (
                        <Button
                            key={view.id}
                            variant={activeView === view.id ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => setActiveView(view.id as any)}
                            className="px-4 py-2 flex items-center gap-2"
                        >
                            <span>{view.icon}</span>
                            {view.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Area */}
                <div className="lg:col-span-2">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">
                            {activeView === 'pipeline' && '🔄 Procurement Pipeline'}
                            {activeView === 'roi' && '💰 ROI Analysis'}
                            {activeView === 'performance' && '🎯 Performance Overview'}
                            {activeView === 'trends' && '📈 Trend Analysis'}
                        </h3>

                        <div className="mb-4">
                            {activeView === 'pipeline' && (
                                <svg ref={pipelineChartRef} width="800" height="400"></svg>
                            )}
                            {activeView === 'roi' && (
                                <svg ref={roiChartRef} width="800" height="400"></svg>
                            )}
                            {activeView === 'performance' && (
                                <svg ref={performanceChartRef} width="800" height="400"></svg>
                            )}
                            {activeView === 'trends' && (
                                <svg ref={trendsChartRef} width="800" height="400"></svg>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Performance Metrics Sidebar */}
                <div className="space-y-4">
                    <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-4">📊 Key Metrics</h3>
                        <div className="space-y-3">
                            {performanceMetrics.map((metric, index) => (
                                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-700">
                                            {metric.metric}
                                        </span>
                                        <span className="text-lg">
                                            {getTrendIcon(metric.trend)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-bold text-gray-900">
                                            {formatValue(metric.metric, metric.value)}
                                        </span>
                                        <span className={`text-sm font-medium ${metric.change > 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {metric.change > 0 ? '+' : ''}{metric.change}%
                                        </span>
                                    </div>
                                    <div className="mt-2">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            {(() => {
                                                const pct = Math.min((metric.value / metric.target) * 100, 100);
                                                const step = Math.round(pct / 5) * 5;
                                                const cls = `advdv-width-${step}`;
                                                return <div className={`bg-blue-600 h-2 rounded-full transition-all duration-500 ${cls}`}></div>;
                                            })()}
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>Current</span>
                                            <span>Target: {formatValue(metric.metric, metric.target)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Quick Stats */}
                    <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-4">⚡ Quick Stats</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Active Tenders:</span>
                                <span className="font-semibold">{tenders.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Completed Analyses:</span>
                                <span className="font-semibold">{analyses.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Success Rate:</span>
                                <span className="font-semibold text-green-600">78.2%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Pipeline Value:</span>
                                <span className="font-semibold text-blue-600">$35.6M</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdvancedDataVisualization;