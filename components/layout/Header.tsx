// full contents of components/layout/Header.tsx

import React, { useState } from 'react';
import { User, Notification } from '../../types';
import { Avatar } from '../ui/Avatar';
import { NotificationDropdown } from './NotificationDropdown';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onSearchClick: () => void;
  onCommandPaletteClick: () => void;
  unreadNotificationCount: number;
  onNotificationClick: (notification: Notification) => void;
  onMarkAllNotificationsAsRead: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onSearchClick, onCommandPaletteClick, unreadNotificationCount, onNotificationClick, onMarkAllNotificationsAsRead }) => {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);

    return (
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-700/80 h-16 flex-shrink-0 flex items-center justify-end px-6 gap-4">
            <button onClick={onSearchClick} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
             <button onClick={onCommandPaletteClick} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hidden md:block">
                ⌘K
            </button>
            <div className="relative">
                <button onClick={() => setIsNotificationMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 relative">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                     {unreadNotificationCount > 0 && <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"></span>}
                </button>
                {isNotificationMenuOpen && <NotificationDropdown user={user} onClose={() => setIsNotificationMenuOpen(false)} addToast={() => {}} onNotificationClick={onNotificationClick} onMarkAllAsRead={onMarkAllNotificationsAsRead} />}
            </div>
            <div className="relative">
                <button onClick={() => setIsUserMenuOpen(prev => !prev)} className="flex items-center gap-2">
                    <Avatar name={user.name} imageUrl={user.avatarUrl} className="w-9 h-9" />
                    <div className="hidden md:block text-left">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.role}</p>
                    </div>
                </button>
                {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200/80 dark:border-slate-700 z-10 py-1">
                        <a href="#" className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700">My Profile</a>
                        <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Logout</button>
                    </div>
                )}
            </div>
        </header>
    );
};