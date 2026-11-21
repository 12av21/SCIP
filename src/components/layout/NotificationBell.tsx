// SCIP - Notification Bell Component
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Mail, MessageSquare, Smartphone, AlertTriangle, Clock, Check, ChevronRight } from 'lucide-react';
import { api } from '../../services/apiClient';
import { Notification, NotificationEventType, NotificationPriority, NotificationChannel } from '../../types/scip';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface NotificationBellProps {
  className?: string;
}

const EVENT_TYPE_LABELS: Record<NotificationEventType, string> = {
  incident_created: 'Incident Created',
  incident_assigned: 'Incident Assigned',
  incident_updated: 'Incident Updated',
  incident_closed: 'Incident Closed',
  incident_reopened: 'Incident Reopened',
  incident_verified: 'Incident Verified',
  incident_escalated: 'Incident Escalated',
  incident_sla_breach: 'SLA Breach',
  report_submitted: 'Report Submitted',
  report_status_changed: 'Report Status Changed',
  report_assigned: 'Report Assigned',
  report_resolved: 'Report Resolved',
  report_acknowledged: 'Report Acknowledged',
  report_generated: 'Report Generated',
  report_scheduled: 'Report Scheduled',
  user_registered: 'User Registered',
  user_role_changed: 'Role Changed',
  system_announcement: 'System Announcement',
  ai_insight_generated: 'AI Insight Generated',
  department_alert: 'Department Alert'
};

const PRIORITY_STYLES: Record<NotificationPriority, string> = {
  low: 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]',
  medium: 'bg-[#FFF3E0] text-[#EF6C00] border-[#FFE0B2]',
  high: 'bg-[#FCE4EC] text-[#C62828] border-[#F8BBD0]',
  critical: 'bg-[#FBE9E7] text-[#BF360C] border-[#FFCCBC] animate-pulse'
};

const CHANNEL_ICONS: Record<NotificationChannel, React.ReactNode> = {
  email: <Mail className="w-3.5 h-3.5" />,
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  in_app: <Bell className="w-3.5 h-3.5" />,
  push: <Smartphone className="w-3.5 h-3.5" />
};

const PRIORITY_ICONS: Record<NotificationPriority, React.ReactNode> = {
  low: <Clock className="w-3.5 h-3.5" />,
  medium: <AlertTriangle className="w-3.5 h-3.5" />,
  high: <AlertTriangle className="w-3.5 h-3.5" />,
  critical: <AlertTriangle className="w-3.5 h-3.5" />
};

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const { user, isAuthenticated } = useAuth();
  const { language, t } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const LIMIT = 20;

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.getUnreadCount();
      if (res.success && res.data) {
        setUnreadCount(res.data.unread);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async (reset = false) => {
    if (!isAuthenticated || loading) return;
    setLoading(true);
    try {
      const newOffset = reset ? 0 : offset;
      const res = await api.getNotifications({ limit: LIMIT, offset: newOffset, read: false });
      if (res.success && res.data) {
        if (reset) {
          setNotifications(res.data);
        } else {
          setNotifications(prev => [...prev, ...res.data]);
        }
        setHasMore(res.data.length === LIMIT);
        setOffset(newOffset + res.data.length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, offset, loading]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      // Poll for unread count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchUnreadCount]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
    }
  }, [isOpen, fetchNotifications]);

  if (!isAuthenticated) {
    return null;
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return language === 'HI' ? 'अभी' : 'Just now';
    if (diffMins < 60) return language === 'HI' ? `${diffMins} मिनट पहले` : `${diffMins}m ago`;
    if (diffHours < 24) return language === 'HI' ? `${diffHours} घंटे पहले` : `${diffHours}h ago`;
    if (diffDays < 7) return language === 'HI' ? `${diffDays} दिन पहले` : `${diffDays}d ago`;
    return date.toLocaleDateString(language === 'HI' ? 'hi-IN' : 'en-IN');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          unreadCount > 0
            ? 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A]'
            : 'text-[#657586] hover:bg-[#EAF2F8] hover:text-[#153E63]'
        }`}
        aria-label={language === 'HI' ? 'सूचनाएं' : 'Notifications'}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-5 bg-[#DC2626] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 sm:w-[420px] bg-white rounded-xl shadow-lg border border-[#DCE3EA] z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#DCE3EA] bg-[#F5F7FA]">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#1F5F91]" />
              <h3 className="font-semibold text-[#153E63] text-base">
                {language === 'HI' ? 'सूचनाएं' : 'Notifications'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-[#1F5F91] hover:text-[#153E63] font-medium px-2 py-1 rounded hover:bg-[#EAF2F8] transition-colors"
                >
                  {language === 'HI' ? 'सभी पढ़े' : 'Mark all read'}
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-[#EAF2F8] transition-colors text-[#657586]"
                aria-label={language === 'HI' ? 'बंद करें' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[500px] overflow-y-auto">
            {notifications.length === 0 && !loading ? (
              <div className="p-8 text-center text-[#657586]">
                <Bell className="w-10 h-10 mx-auto mb-3 text-[#DCE3EA]" />
                <p className="font-medium text-[#253443] mb-1">
                  {language === 'HI' ? 'कोई सूचना नहीं' : 'No notifications'}
                </p>
                <p className="text-sm">
                  {language === 'HI' ? 'जब आपको नई सूचनाएं मिलेंगी, वे यहाँ दिखाई देंगी' : 'New notifications will appear here'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#F0F2F4]">
                {notifications.map(notification => (
                  <li
                    key={notification.id}
                    className={`p-4 hover:bg-[#F5F7FA] transition-colors ${
                      !notification.read ? 'bg-[#FEFBF3]' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${PRIORITY_STYLES[notification.priority]}`}>
                        {PRIORITY_ICONS[notification.priority]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-medium text-sm ${!notification.read ? 'text-[#153E63]' : 'text-[#253443]'}`}>
                            {notification.title}
                          </h4>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_STYLES[notification.priority]} whitespace-nowrap`}>
                            {language === 'HI' 
                              ? notification.priority === 'critical' ? 'गंभीर' : notification.priority === 'high' ? 'उच्च' : notification.priority === 'medium' ? 'मध्यम' : 'कम'
                              : notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)
                            }
                          </span>
                        </div>
                        <p className="text-sm text-[#657586] mt-1 line-clamp-2">{notification.message}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-[#9CA3AF]">
                          <span className="flex items-center gap-1">
                            {CHANNEL_ICONS[notification.channels[0]] || <Bell className="w-3 h-3" />}
                            {notification.channels.length > 1 && <span>+{notification.channels.length - 1}</span>}
                          </span>
                          <span>{EVENT_TYPE_LABELS[notification.eventType] || notification.eventType}</span>
                          <span>{formatTime(notification.createdAt)}</span>
                        </div>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#EAF2F8] transition-colors text-[#657586]"
                          aria-label={language === 'HI' ? 'पढ़े के रूप में चिह्नित करें' : 'Mark as read'}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {loading && notifications.length > 0 && (
              <div className="p-4 text-center text-[#657586]">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1F5F91] border-t-transparent mx-auto" />
              </div>
            )}
            {hasMore && !loading && (
              <button
                onClick={() => fetchNotifications(false)}
                className="w-full p-3 text-center text-sm text-[#1F5F91] hover:bg-[#F5F7FA] border-t border-[#F0F2F4] font-medium"
              >
                {language === 'HI' ? 'और लोड करें' : 'Load more'}
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[#DCE3EA] bg-[#F5F7FA]">
            <a
              href="/notifications"
              className="block text-center text-sm font-medium text-[#1F5F91] hover:text-[#153E63] flex items-center justify-center gap-1.5"
            >
              {language === 'HI' ? 'सभी सूचनाएं देखें' : 'View all notifications'}
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}