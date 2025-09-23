import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { backendGateway, __resetBackendGatewayForTests } from '../backendGateway';
import { resetMockApi } from '../mockApi';
import { resetInMemoryStorage } from '../../utils/storage';
import { configureAuthClient, resetAuthClient } from '../authClient';

const DEFAULT_USER_ID = '1';
const DEFAULT_COMPANY_ID = '1';

describe('backendGateway', () => {
  beforeEach(() => {
    resetInMemoryStorage();
    resetMockApi();
    resetAuthClient();
    configureAuthClient({ baseUrl: null, allowMockFallback: true });
    __resetBackendGatewayForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads snapshot from mock when no backend is configured', async () => {
    const snapshot = await backendGateway.getDashboardSnapshot({
      userId: DEFAULT_USER_ID,
      companyId: DEFAULT_COMPANY_ID,
    });

    expect(Array.isArray(snapshot.projects)).toBe(true);
    expect(Array.isArray(snapshot.team)).toBe(true);
    expect(snapshot.metadata.source).toBe('mock');
    expect(snapshot.metadata.projectCount).toBe(snapshot.projects.length);
    expect(typeof snapshot.metadata.generatedAt).toBe('string');
  });

  it('falls back to mock when backend request fails and fallback is allowed', async () => {
    configureAuthClient({ baseUrl: 'https://api.example.test', allowMockFallback: true });
    __resetBackendGatewayForTests();

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('connect ECONNREFUSED'));

    const snapshot = await backendGateway.getDashboardSnapshot({
      userId: DEFAULT_USER_ID,
      companyId: DEFAULT_COMPANY_ID,
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(snapshot.metadata.source).toBe('mock');
    expect(snapshot.metadata.usedFallback).toBe(true);
  });

  it('throws a friendly error when backend request fails and fallback is disabled', async () => {
    configureAuthClient({ baseUrl: 'https://api.example.test', allowMockFallback: false });
    __resetBackendGatewayForTests();

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('connect ECONNREFUSED'));

    await expect(
      backendGateway.getDashboardSnapshot({
        userId: DEFAULT_USER_ID,
        companyId: DEFAULT_COMPANY_ID,
      })
    ).rejects.toThrow(/unreachable|unavailable|service/i);
  });
});
