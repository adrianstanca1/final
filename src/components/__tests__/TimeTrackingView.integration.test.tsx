/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import ReactDOM from 'react-dom/client';
import { TimeTrackingView } from '../TimeTrackingView';

vi.mock('../../services/mockApi', () => {
    return {
        api: {
            getProjectsByUser: vi.fn(async () => ([{
                id: 'p1', name: 'Project One', location: { lat: 51.5, lng: -0.12, address: 'A' }, geofenceRadius: 100,
                status: 'ACTIVE'
            }])),
            getTimesheetsByUser: vi.fn(async () => ([])),
            clockIn: vi.fn(async () => ({})),
            clockOut: vi.fn(async () => ({})),
        }
    };
});

vi.mock('../../hooks/useGeolocation', () => {
    return {
        useGeolocation: () => ({
            data: null,
            error: null,
            watchLocation: vi.fn(),
            stopWatching: vi.fn(),
            insideGeofenceIds: new Set(),
        }),
    };
});

describe('TimeTrackingView geofencing toggle integration', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    it('does not show geofence warning when geofencingEnabled is false', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);

        const user = { id: 'u1', firstName: 'Alex', lastName: 'Doe', email: 'a@b.c', companyId: 'c1', role: 'FOREMAN' } as any;
        const settings = { geofencingEnabled: false } as any;

        const root = ReactDOM.createRoot(container);
        await act(async () => {
            root.render(
                React.createElement(TimeTrackingView, {
                    user,
                    addToast: () => { },
                    setActiveView: () => { },
                    settings,
                })
            );
        });

        // Allow initial fetch effects to complete
        await act(async () => { await Promise.resolve(); });

        // Find and click the Clock In button
        const btns = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[];
        const clockInBtn = btns.find(b => /clock in/i.test(b.textContent || ''));
        expect(clockInBtn).toBeTruthy();

        await act(async () => {
            clockInBtn!.click();
        });

        expect(confirmSpy).not.toHaveBeenCalled();

        confirmSpy.mockRestore();
        root.unmount();
    });
});
