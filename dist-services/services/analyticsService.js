/**
 * Advanced analytics service for tracking user behavior and system performance
 */
export class AnalyticsService {
    constructor() {
        this.events = [];
        this.metrics = [];
        this.batchSize = 50;
        this.flushInterval = 30000; // 30 seconds
        this.maxRetries = 3;
        this.currentSession = this.createSession();
        this.setupPerformanceMonitoring();
        this.setupAutoFlush();
        this.setupPageVisibilityTracking();
    }
    static getInstance() {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }
    // Event tracking
    track(eventName, properties) {
        const event = {
            name: eventName,
            properties: this.sanitizeProperties(properties),
            timestamp: Date.now(),
            userId: this.getCurrentUserId(),
            sessionId: this.currentSession.id,
            metadata: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
            },
        };
        this.events.push(event);
        this.currentSession.events.push(event);
        this.updateSessionActivity();
        // Auto-flush if batch size reached
        if (this.events.length >= this.batchSize) {
            this.flush();
        }
    }
    // Page view tracking
    trackPageView(path, title) {
        this.track('page_view', {
            path,
            title: title || document.title,
            referrer: document.referrer,
        });
        this.currentSession.pageViews++;
    }
    // User interaction tracking
    trackClick(element, properties) {
        this.track('click', {
            element,
            ...properties,
        });
    }
    trackFormSubmit(formName, success, errors) {
        this.track('form_submit', {
            form_name: formName,
            success,
            errors,
        });
    }
    trackSearch(query, results, filters) {
        this.track('search', {
            query,
            results_count: results,
            filters,
        });
    }
    trackError(error, context) {
        this.track('error', {
            error_name: error.name,
            error_message: error.message,
            error_stack: error.stack,
            context,
        });
    }
    // Performance tracking
    trackPerformance(name, value, unit, tags) {
        const metric = {
            name,
            value,
            unit,
            timestamp: Date.now(),
            tags,
        };
        this.metrics.push(metric);
        // Auto-flush metrics if batch size reached
        if (this.metrics.length >= this.batchSize) {
            this.flushMetrics();
        }
    }
    trackLoadTime(pageName, loadTime) {
        this.trackPerformance('page_load_time', loadTime, 'ms', { page: pageName });
    }
    trackApiCall(endpoint, method, duration, status) {
        this.trackPerformance('api_call_duration', duration, 'ms', {
            endpoint,
            method,
            status: status.toString(),
        });
    }
    // User identification
    identify(userId, traits) {
        this.currentSession.userId = userId;
        this.track('identify', {
            user_id: userId,
            traits: this.sanitizeProperties(traits),
        });
    }
    // Session management
    startNewSession() {
        this.endCurrentSession();
        this.currentSession = this.createSession();
    }
    endCurrentSession() {
        this.track('session_end', {
            session_duration: Date.now() - this.currentSession.startTime,
            page_views: this.currentSession.pageViews,
            events_count: this.currentSession.events.length,
        });
        this.flush();
    }
    // Data export and analysis
    getSessionData() {
        return { ...this.currentSession };
    }
    getEventsSummary(timeRange) {
        const events = timeRange
            ? this.events.filter(e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end)
            : this.events;
        const summary = events.reduce((acc, event) => {
            acc[event.name] = (acc[event.name] || 0) + 1;
            return acc;
        }, {});
        return {
            totalEvents: events.length,
            eventTypes: Object.keys(summary).length,
            breakdown: summary,
        };
    }
    getPerformanceMetrics(metricName) {
        const metrics = metricName
            ? this.metrics.filter(m => m.name === metricName)
            : this.metrics;
        if (metrics.length === 0)
            return null;
        const values = metrics.map(m => m.value);
        return {
            count: metrics.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((sum, val) => sum + val, 0) / values.length,
            p95: this.percentile(values, 95),
            p99: this.percentile(values, 99),
        };
    }
    // Data persistence and transmission
    async flush() {
        if (this.events.length === 0)
            return;
        const eventsToSend = [...this.events];
        this.events = [];
        try {
            await this.sendEvents(eventsToSend);
        }
        catch (error) {
            console.error('Failed to send analytics events:', error);
            // Re-queue events for retry
            this.events.unshift(...eventsToSend);
        }
    }
    async flushMetrics() {
        if (this.metrics.length === 0)
            return;
        const metricsToSend = [...this.metrics];
        this.metrics = [];
        try {
            await this.sendMetrics(metricsToSend);
        }
        catch (error) {
            console.error('Failed to send performance metrics:', error);
            // Re-queue metrics for retry
            this.metrics.unshift(...metricsToSend);
        }
    }
    // Private methods
    createSession() {
        return {
            id: this.generateSessionId(),
            startTime: Date.now(),
            lastActivity: Date.now(),
            pageViews: 0,
            events: [],
            userAgent: navigator.userAgent,
            referrer: document.referrer,
        };
    }
    updateSessionActivity() {
        this.currentSession.lastActivity = Date.now();
    }
    getCurrentUserId() {
        return this.currentSession.userId;
    }
    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
    sanitizeProperties(properties) {
        if (!properties)
            return undefined;
        const sanitized = {};
        for (const [key, value] of Object.entries(properties)) {
            // Skip functions and undefined values
            if (typeof value === 'function' || value === undefined)
                continue;
            // Truncate long strings
            if (typeof value === 'string' && value.length > 1000) {
                sanitized[key] = value.substring(0, 1000) + '...';
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    setupPerformanceMonitoring() {
        // Monitor page load performance
        if ('performance' in window && 'getEntriesByType' in performance) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const navigation = performance.getEntriesByType('navigation')[0];
                    if (navigation) {
                        this.trackLoadTime('initial_page_load', navigation.loadEventEnd - navigation.fetchStart);
                    }
                }, 0);
            });
        }
        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.trackPerformance('long_task', entry.duration, 'ms');
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            }
            catch (error) {
                console.warn('Long task monitoring not supported');
            }
        }
    }
    setupAutoFlush() {
        setInterval(() => {
            this.flush();
            this.flushMetrics();
        }, this.flushInterval);
        // Flush on page unload
        window.addEventListener('beforeunload', () => {
            this.endCurrentSession();
        });
    }
    setupPageVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.track('page_hidden');
            }
            else {
                this.track('page_visible');
                this.updateSessionActivity();
            }
        });
    }
    async sendEvents(events) {
        // In a real implementation, this would send to your analytics backend
        console.log('Sending analytics events:', events);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    async sendMetrics(metrics) {
        // In a real implementation, this would send to your metrics backend
        console.log('Sending performance metrics:', metrics);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    percentile(values, p) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[index];
    }
}
// Export singleton instance
export const analytics = AnalyticsService.getInstance();
//# sourceMappingURL=analyticsService.js.map