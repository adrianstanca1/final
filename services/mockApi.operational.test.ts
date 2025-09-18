import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createMockLocalStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  } as Storage;
};

const importApi = async () => {
  vi.resetModules();
  (globalThis as any).localStorage = createMockLocalStorage();
  const module = await import('./mockApi');
  return module.api;
};

describe('mockApi operational insights', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-30T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('summarises workforce, safety, and finance signals for a company', async () => {
    const api = await importApi();

    const insightsPromise = api.getOperationalInsights('1');
    await vi.runAllTimersAsync();
    const insights = await insightsPromise;

    expect(insights.updatedAt).toBeTruthy();
    expect(insights.workforce.complianceRate).toBe(0);
    expect(insights.workforce.pendingApprovals).toBeGreaterThanOrEqual(1);
    expect(insights.workforce.averageHours).toBeGreaterThan(0);
    expect(insights.safety.daysSinceLastIncident).toBe(0);
    expect(insights.financial.currency).toBe('GBP');
    expect(insights.financial.approvedExpensesThisMonth).toBeCloseTo(150, 2);
    expect(insights.schedule.atRiskProjects).toBe(0);
    expect(insights.trends.workforce).toHaveLength(6);
    expect(insights.trends.safety).toHaveLength(6);
    expect(insights.trends.financial).toHaveLength(6);
    expect(insights.trends.workforce[insights.trends.workforce.length - 1].periodLabel).toBeTruthy();
    expect(insights.trends.financial[0].periodLabel).toMatch(/\d{4}/);
    expect(['positive', 'neutral', 'negative']).toContain(insights.rolePulse.owner.sentiment);
    expect(insights.rolePulse.owner.metrics.length).toBeGreaterThanOrEqual(4);
    expect(insights.rolePulse.projectManager.recommendations.length).toBeGreaterThan(0);
    const crewMetric = insights.rolePulse.foreman.metrics.find(metric => metric.id === 'crew-on-shift');
    expect(crewMetric?.value).toBeGreaterThanOrEqual(0);
  });

  it('produces actionable alerts when compliance or tasks need attention', async () => {
    const api = await importApi();

    const insightsPromise = api.getOperationalInsights('1');
    await vi.runAllTimersAsync();
    const insights = await insightsPromise;

    expect(Array.isArray(insights.alerts)).toBe(true);
    expect(insights.alerts.some(alert => alert.id === 'low-timesheet-compliance')).toBe(true);
    expect(insights.rolePulse.foreman.recommendations.length).toBeGreaterThan(0);
  });
});
