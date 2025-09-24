import React from 'react';
import { User, Notification } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface NotificationDropdownProps {
  user: User;
  notifications: Notification[];
  onClose: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllAsRead?: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ 
  user: _user, 
  notifications, 
  onClose, 
  addToast, 
  onNotificationClick, 
  onMarkAllAsRead 
}) => {
  const [isMarkingAll, setIsMarkingAll] = React.useState(false);
  const hasUnread = notifications.some(n => !(n.isRead ?? n.read));

  const handleMarkAllAsRead = async () => {
    if (!onMarkAllAsRead) return;
    
    setIsMarkingAll(true);
    try {
      await onMarkAllAsRead();
      addToast('All notifications marked as read', 'success');
    } catch (error) {
      addToast('Failed to mark notifications as read', 'error');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    onClose();
  };

  return (
    <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto z-50 shadow-lg">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Notifications</h3>
          <div className="flex items-center space-x-2">
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
              >
                {isMarkingAll ? 'Marking...' : 'Mark all read'}
              </Button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            <p>No notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const isUnread = !(notification.isRead ?? notification.read);
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    isUnread ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                  } border`}
                >
                  <div className="flex items-start space-x-3">
                    {isUnread && (
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
