import React, { useState, useEffect } from 'react';
import { NotificationService, Notification } from '../../services/NotificationService';
import { useNavigate } from 'react-router-dom';

export const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        loadNotifications();
        // Poll for notifications every minute (simple solution)
        const interval = setInterval(loadNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await NotificationService.getMyNotifications();
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        } catch (e) {
            console.error(e);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await NotificationService.markAsRead(notification.id);
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setIsOpen(false);
        if (notification.resource_link) {
            navigate(notification.resource_link);
        }
    };

    const handleMarkAllRead = async () => {
        await NotificationService.markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative transition-colors"
            >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                        <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <span className="font-semibold text-sm dark:text-white">Notifications</span>
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                            ) : (
                                notifications.map(note => (
                                    <div
                                        key={note.id}
                                        onClick={() => handleNotificationClick(note)}
                                        className={`p-3 border-b border-gray-50 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!note.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                                            }`}
                                    >
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{note.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{note.message}</p>
                                        <p className="text-[10px] text-gray-400 mt-2">{new Date(note.created_at).toLocaleDateString()}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
