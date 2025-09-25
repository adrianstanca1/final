/**
 * Real-time notification service with WebSocket support and offline queuing
 */
import { NotificationType } from '../types.js';
export class NotificationService {
    constructor() {
        this.websocket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.subscriptions = new Set();
        this.offlineQueue = [];
        this.isOnline = navigator.onLine;
        this.setupEventListeners();
    }
    static getInstance() {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
            // Initialize permission after instance is created
            setTimeout(() => NotificationService.instance.requestPermission(), 0);
        }
        return NotificationService.instance;
    }
    // WebSocket connection management
    connect(userId) {
        if (this.websocket?.readyState === WebSocket.OPEN) {
            return;
        }
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/notifications/${userId}`;
        try {
            this.websocket = new WebSocket(wsUrl);
            this.websocket.onopen = () => {
                console.log('Notification WebSocket connected');
                this.reconnectAttempts = 0;
                this.processOfflineQueue();
            };
            this.websocket.onmessage = (event) => {
                try {
                    const notification = JSON.parse(event.data);
                    this.handleIncomingNotification(notification);
                }
                catch (error) {
                    console.error('Failed to parse notification:', error);
                }
            };
            this.websocket.onclose = () => {
                console.log('Notification WebSocket disconnected');
                this.scheduleReconnect(userId);
            };
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        }
        catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.scheduleReconnect(userId);
        }
    }
    disconnect() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
    }
    // Subscription management
    subscribe(callback) {
        this.subscriptions.add(callback);
        return () => {
            this.subscriptions.delete(callback);
        };
    }
    // Send notification
    async sendNotification(notification) {
        const fullNotification = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            read: false,
            ...notification,
        };
        if (this.isOnline && this.websocket?.readyState === WebSocket.OPEN) {
            try {
                this.websocket.send(JSON.stringify({
                    type: 'send_notification',
                    notification: fullNotification,
                }));
            }
            catch (error) {
                console.error('Failed to send notification via WebSocket:', error);
                this.queueOfflineNotification(fullNotification);
            }
        }
        else {
            this.queueOfflineNotification(fullNotification);
        }
    }
    // Browser notification
    async showBrowserNotification(options) {
        if (!('Notification' in window)) {
            console.warn('Browser notifications not supported');
            return;
        }
        if (Notification.permission !== 'granted') {
            const permission = await this.requestPermission();
            if (permission !== 'granted') {
                return;
            }
        }
        try {
            const notification = new Notification(options.title, {
                body: options.body,
                icon: options.icon || '/favicon.ico',
                badge: options.badge,
                tag: options.tag,
                requireInteraction: options.requireInteraction,
                data: options.data,
            });
            notification.onclick = () => {
                window.focus();
                notification.close();
                // Handle notification click based on data
                if (options.data?.url) {
                    window.location.href = options.data.url;
                }
            };
            // Auto-close after 5 seconds unless requireInteraction is true
            if (!options.requireInteraction) {
                setTimeout(() => notification.close(), 5000);
            }
        }
        catch (error) {
            console.error('Failed to show browser notification:', error);
        }
    }
    // Push notification subscription
    async subscribeToPush() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications not supported');
            return null;
        }
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(process.env.VAPID_PUBLIC_KEY || ''),
            });
            const subscriptionData = {
                userId: '', // Will be set by caller
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
                    auth: this.arrayBufferToBase64(subscription.getKey('auth')),
                },
            };
            return subscriptionData;
        }
        catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            return null;
        }
    }
    // Notification templates
    createTaskNotification(taskTitle, projectName, assigneeId) {
        return {
            type: NotificationType.TASK_ASSIGNED,
            title: 'New Task Assigned',
            message: `You have been assigned to "${taskTitle}" in ${projectName}`,
            userId: assigneeId,
            metadata: {
                taskTitle,
                projectName,
                view: 'all-tasks',
            },
        };
    }
    createSafetyAlertNotification(incidentType, location, companyId) {
        return {
            type: NotificationType.SAFETY_ALERT,
            title: 'Safety Alert',
            message: `${incidentType} reported at ${location}`,
            companyId,
            metadata: {
                incidentType,
                location,
                view: 'safety',
                priority: 'high',
            },
        };
    }
    createApprovalNotification(itemType, itemName, approverId) {
        return {
            type: NotificationType.APPROVAL_REQUEST,
            title: 'Approval Required',
            message: `${itemType} "${itemName}" requires your approval`,
            userId: approverId,
            metadata: {
                itemType,
                itemName,
                view: 'approvals',
            },
        };
    }
    // Private methods
    async requestPermission() {
        if (!('Notification' in window)) {
            return 'denied';
        }
        if (Notification.permission === 'default') {
            return await Notification.requestPermission();
        }
        return Notification.permission;
    }
    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processOfflineQueue();
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }
    scheduleReconnect(userId) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.connect(userId);
        }, delay);
    }
    handleIncomingNotification(notification) {
        // Notify all subscribers
        this.subscriptions.forEach(callback => {
            try {
                callback(notification);
            }
            catch (error) {
                console.error('Error in notification callback:', error);
            }
        });
        // Show browser notification if appropriate
        if (this.shouldShowBrowserNotification(notification)) {
            this.showBrowserNotification({
                title: notification.title,
                body: notification.message,
                data: { notificationId: notification.id, ...notification.metadata },
            });
        }
    }
    shouldShowBrowserNotification(notification) {
        // Don't show if document is visible and user is active
        if (!document.hidden) {
            return false;
        }
        // Show for high-priority notifications
        if (notification.metadata?.priority === 'high') {
            return true;
        }
        // Show for safety alerts
        if (notification.type === NotificationType.SAFETY_ALERT) {
            return true;
        }
        return false;
    }
    queueOfflineNotification(notification) {
        this.offlineQueue.push(notification);
        // Limit queue size
        if (this.offlineQueue.length > 100) {
            this.offlineQueue.shift();
        }
    }
    processOfflineQueue() {
        if (this.offlineQueue.length === 0)
            return;
        const queue = [...this.offlineQueue];
        this.offlineQueue = [];
        queue.forEach(notification => {
            this.sendNotification(notification);
        });
    }
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}
// Export singleton instance
export const notificationService = NotificationService.getInstance();
//# sourceMappingURL=notificationService.js.map