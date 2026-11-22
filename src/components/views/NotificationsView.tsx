// SCIP - Notifications View
// Comprehensive notification center with filtering, preferences, and history
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/apiClient';
import { Notification, NotificationEventType, NotificationPriority, NotificationChannel, NotificationPreference } from '../../types/scip';
import { Bell, X, Mail, MessageSquare, Smartphone, AlertTriangle, Clock, Check, ChevronRight, Filter, BellOff, Settings, RefreshCw } from 'lucide-react';

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

const PRIORITY_LABELS: Record<NotificationPriority, { en: string; hi: string }> = {
  low: { en: 'Low', hi: 'कम' },
  medium: { en: 'Medium', hi: 'मध्यम' },
  high: { en: 'High', hi: 'उच्च' },
  critical: { en: 'Critical', hi: 'गंभीर' }
};

const CHANNEL_ICONS: Record<NotificationChannel, React.ReactNode> = {
  email: <Mail className="w-3.5 h-3.5" />,
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  in_app: <Bell className="w-3.5 h-3.5" />,
  push: <Smartphone className="w-3.5 h-3.5" />
};

export function NotificationsView() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({
    eventType: '',
    priority: '',
    read: '',
    dateFrom: '',
    dateTo: '',
    channel: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [stats, setStats] = useState({ total: 0, unread: 0, byType: {}, byChannel: {}, byPriority: {} });
  const LIMIT = 20;

  const fetchNotifications = useCallback(async (reset = false) => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const newOffset = reset ? 0 : offset;
      const filterParams: any = { limit: LIMIT, offset: newOffset };
      if (filters.eventType) filterParams.eventType = filters.eventType;
      if (filters.priority) filterParams.priority = filters.priority;
      if (filters.read !== '') filterParams.read = filters.read === 'true';
      if (filters.dateFrom) filterParams.dateFrom = filters.dateFrom;
      if (filters.dateTo) filterParams.dateTo = filters.dateTo;
      if (filters.channel) filterParams.channels = [filters.channel];

      const res = await api.getNotifications(filterParams);
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
  }, [user, loading, offset, filters]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getNotificationStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [user]);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getNotificationPreferences();
      if (res.success && res.data) {
        setPreferences(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch preferences:', err);
    }
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n));
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
      setStats(prev => ({ ...prev, unread: 0 }));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleSavePreferences = async () => {
    if (!preferences) return;
    setSavingPrefs(true);
    try {
      const res = await api.updateNotificationPreferences(preferences);
      if (res.success) {
        alert(language === 'HI' ? 'प्राथमिकताएं सहेजी गईं' : 'Preferences saved');
        setShowPreferences(false);
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
      alert(language === 'HI' ? 'प्राथमिकताएं सहेजने में विफल' : 'Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

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

  useEffect(() => {
    if (user) {
      fetchNotifications(true);
      fetchStats();
      fetchPreferences();
    }
  }, [user, fetchNotifications, fetchStats, fetchPreferences]);

  useEffect(() => {
    if (user) {
      fetchNotifications(true);
    }
  }, [filters, user]);

  const eventTypes = Object.keys(EVENT_TYPE_LABELS) as NotificationEventType[];
  const priorities: NotificationPriority[] = ['critical', 'high', 'medium', 'low'];
  const channels: NotificationChannel[] = ['email', 'sms', 'in_app', 'push'];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#153E63]">
            {language === 'HI' ? 'सूचना केंद्र' : 'Notification Center'}
          </h1>
          <p className="text-[#657586] mt-1">
            {language === 'HI' ? 'अपनी सभी सूचनाएं देखें और प्रबंधित करें' : 'View and manage all your notifications'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreferences(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1F5F91] bg-[#EAF2F8] border border-[#DCE3EA] rounded-lg hover:bg-[#DCE3EA] transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>{language === 'HI' ? 'प्राथमिकताएं' : 'Preferences'}</span>
          </button>
          {stats.unread > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#DC2626] border border-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{language === 'HI' ? 'सभी पढ़े' : 'Mark all read'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#DCE3EA] p-4">
          <div className="text-2xl font-bold text-[#153E63]">{stats.total}</div>
          <div className="text-sm text-[#657586]">{language === 'HI' ? 'कुल' : 'Total'}</div>
        </div>
        <div className="bg-white rounded-xl border border-[#DCE3EA] p-4">
          <div className="text-2xl font-bold text-[#DC2626]">{stats.unread}</div>
          <div className="text-sm text-[#657586]">{language === 'HI' ? 'अपठित' : 'Unread'}</div>
        </div>
        <div className="bg-white rounded-xl border border-[#DCE3EA] p-4">
          <div className="text-2xl font-bold text-[#1F5F91]">
            {Object.values(stats.byPriority || {}).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0)}
          </div>
          <div className="text-sm text-[#657586]">{language === 'HI' ? 'इस महीने' : 'This Month'}</div>
        </div>
        <div className="bg-white rounded-xl border border-[#DCE3EA] p-4">
          <div className="text-2xl font-bold text-[#28834A]">
            {Object.keys(stats.byType || {}).length}
          </div>
          <div className="text-sm text-[#657586]">{language === 'HI' ? 'प्रकार' : 'Types'}</div>
        </div>
      </div>

      {/* Filters */}
      <div className={`bg-white rounded-xl border border-[#DCE3EA] ${showFilters ? '' : 'hidden'}`}>
        <div className="p-4 border-b border-[#DCE3EA] flex items-center justify-between">
          <h3 className="font-semibold text-[#153E63] flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {language === 'HI' ? 'फ़िल्टर' : 'Filters'}
          </h3>
          <button
            onClick={() => setShowFilters(false)}
            className="text-sm text-[#657586] hover:text-[#153E63]"
          >
            {language === 'HI' ? 'छुपाएं' : 'Hide'}
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#657586] mb-1">
                {language === 'HI' ? 'प्रकार' : 'Event Type'}
              </label>
              <select
                value={filters.eventType}
                onChange={e => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#DCE3EA] rounded-lg bg-white focus:border-[#1F5F91] focus:outline-none"
              >
                <option value="">{language === 'HI' ? 'सभी प्रकार' : 'All Types'}</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>{EVENT_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#657586] mb-1">
                {language === 'HI' ? 'प्राथमिकता' : 'Priority'}
              </label>
              <select
                value={filters.priority}
                onChange={e => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#DCE3EA] rounded-lg bg-white focus:border-[#1F5F91] focus:outline-none"
              >
                <option value="">{language === 'HI' ? 'सभी' : 'All'}</option>
                {priorities.map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p][language === 'HI' ? 'hi' : 'en']}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#657586] mb-1">
                {language === 'HI' ? 'स्थिति' : 'Status'}
              </label>
              <select
                value={filters.read}
                onChange={e => setFilters(prev => ({ ...prev, read: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#DCE3EA] rounded-lg bg-white focus:border-[#1F5F91] focus:outline-none"
              >
                <option value="">{language === 'HI' ? 'सभी' : 'All'}</option>
                <option value="false">{language === 'HI' ? 'अपठित' : 'Unread'}</option>
                <option value="true">{language === 'HI' ? 'पठित' : 'Read'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#657586] mb-1">
                {language === 'HI' ? 'चैनल' : 'Channel'}
              </label>
              <select
                value={filters.channel}
                onChange={e => setFilters(prev => ({ ...prev, channel: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#DCE3EA] rounded-lg bg-white focus:border-[#1F5F91] focus:outline-none"
              >
                <option value="">{language === 'HI' ? 'सभी' : 'All'}</option>
                {channels.map(c => (
                  <option key={c} value={c}>
                    {c === 'in_app' ? (language === 'HI' ? 'इन-ऐप' : 'In-App') : c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#657586] mb-1">
                {language === 'HI' ? 'प्रारंभ तिथि' : 'From Date'}
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#DCE3EA] rounded-lg bg-white focus:border-[#1F5F91] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#657586] mb-1">
                {language === 'HI' ? 'अंतिम तिथि' : 'To Date'}
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#DCE3EA] rounded-lg bg-white focus:border-[#1F5F91] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFilters({ eventType: '', priority: '', read: '', dateFrom: '', dateTo: '', channel: '' });
                fetchNotifications(true);
              }}
              className="px-4 py-2 text-sm font-medium text-[#657586] bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg hover:bg-[#EAF2F8] transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              {language === 'HI' ? 'रीसेट' : 'Reset'}
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Filters Button (when hidden) */}
      {!showFilters && (
        <button
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1F5F91] bg-[#EAF2F8] border border-[#DCE3EA] rounded-lg hover:bg-[#DCE3EA] transition-colors w-fit"
        >
          <Filter className="w-4 h-4" />
          <span>{language === 'HI' ? 'फ़िल्टर दिखाएं' : 'Show Filters'}</span>
        </button>
      )}

      {/* Notification List */}
      <div className="bg-white rounded-xl border border-[#DCE3EA] overflow-hidden">
        <div className="p-4 border-b border-[#DCE3EA] bg-[#F5F7FA]">
          <h3 className="font-semibold text-[#153E63] flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {language === 'HI' ? 'सूचनाएं' : 'Notifications'}
            <span className="text-sm font-normal text-[#657586]">({notifications.length})</span>
          </h3>
        </div>

        {notifications.length === 0 && !loading ? (
          <div className="p-12 text-center text-[#657586]">
            <BellOff className="w-16 h-16 mx-auto mb-4 text-[#DCE3EA]" />
            <p className="font-medium text-[#253443] text-lg mb-2">
              {language === 'HI' ? 'कोई सूचना नहीं' : 'No notifications'}
            </p>
            <p className="text-sm">
              {language === 'HI' ? 'जब आपको नई सूचनाएं मिलेंगी, वे यहाँ दिखाई देंगी' : 'New notifications will appear here'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#F0F2F4] max-h-[600px] overflow-y-auto">
            {notifications.map(notification => (
              <li
                key={notification.id}
                className={`p-4 hover:bg-[#F5F7FA] transition-colors ${
                  !notification.read ? 'bg-[#FEFBF3]' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${PRIORITY_STYLES[notification.priority]}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`font-medium text-sm ${!notification.read ? 'text-[#153E63]' : 'text-[#253443]'}`}>
                        {notification.title}
                      </h4>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${PRIORITY_STYLES[notification.priority]} whitespace-nowrap`}>
                        {PRIORITY_LABELS[notification.priority][language === 'HI' ? 'hi' : 'en']}
                      </span>
                    </div>
                    <p className="text-sm text-[#657586] mt-1 line-clamp-2">{notification.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-[#9CA3AF] flex-wrap">
                      <span className="flex items-center gap-1">
                        {notification.channels.map((c, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {CHANNEL_ICONS[c]}
                          </span>
                        ))}
                      </span>
                      <span>{EVENT_TYPE_LABELS[notification.eventType] || notification.eventType}</span>
                      <span>{formatTime(notification.createdAt)}</span>
                      {notification.relatedEntityId && (
                        <span className="font-mono text-[#1F5F91]">
                          {notification.relatedEntityType}: {notification.relatedEntityId}
                        </span>
                      )}
                    </div>
                  </div>
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="flex-shrink-0 p-2 rounded-lg hover:bg-[#EAF2F8] transition-colors text-[#657586]"
                      aria-label={language === 'HI' ? 'पढ़े के रूप में चिह्नित करें' : 'Mark as read'}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {(loading || hasMore) && (
          <div className="p-4 border-t border-[#F0F2F4]">
            {loading && notifications.length > 0 && (
              <div className="flex items-center justify-center gap-2 text-[#657586]">
                <RefreshCw className="w-5 h-5 animate-spin text-[#1F5F91]" />
                <span>{language === 'HI' ? 'लोड हो रहा है...' : 'Loading...'}</span>
              </div>
            )}
            {hasMore && !loading && (
              <button
                onClick={() => fetchNotifications(false)}
                className="w-full py-3 text-center text-sm font-medium text-[#1F5F91] hover:bg-[#F5F7FA] border-t border-[#F0F2F4] rounded-none transition-colors"
              >
                {language === 'HI' ? 'और लोड करें' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-[#DCE3EA] flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-[#153E63] flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {language === 'HI' ? 'सूचना प्राथमिकताएं' : 'Notification Preferences'}
              </h3>
              <button
                onClick={() => setShowPreferences(false)}
                className="p-2 rounded-lg hover:bg-[#F5F7FA] transition-colors text-[#657586]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {preferences && (
                <>
                  <div>
                    <h4 className="font-medium text-[#153E63] mb-3 flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      {language === 'HI' ? 'चैनल प्राथमिकताएं' : 'Channel Preferences'}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { key: 'emailEnabled', label: language === 'HI' ? 'ईमेल' : 'Email', icon: Mail },
                        { key: 'smsEnabled', label: language === 'HI' ? 'SMS' : 'SMS', icon: MessageSquare },
                        { key: 'inAppEnabled', label: language === 'HI' ? 'इन-ऐप' : 'In-App', icon: Bell },
                        { key: 'pushEnabled', label: language === 'HI' ? 'पुश' : 'Push', icon: Smartphone }
                      ].map(({ key, label, icon: Icon }) => (
                        <label key={key} className="flex items-center justify-center gap-2 p-3 border border-[#DCE3EA] rounded-lg cursor-pointer hover:bg-[#F5F7FA] transition-colors">
                          <input
                            type="checkbox"
                            checked={preferences[key as keyof NotificationPreference] as boolean}
                            onChange={e => setPreferences(prev => prev ? { ...prev, [key]: e.target.checked } : null)}
                            className="w-4 h-4 text-[#1F5F91] border-[#DCE3EA] rounded focus:ring-[#1F5F91]"
                          />
                          <Icon className="w-5 h-5 text-[#657586]" />
                          <span className="text-sm font-medium text-[#253443]">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-[#153E63] mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      {language === 'HI' ? 'शांत घंटे' : 'Quiet Hours'}
                    </h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={preferences.quietHours?.enabled || false}
                          onChange={e => setPreferences(prev => prev ? { ...prev, quietHours: { ...(prev.quietHours || { enabled: false, start: '22:00', end: '08:00', timezone: 'Asia/Kolkata' }), enabled: e.target.checked } } : null)}
                          className="w-4 h-4 text-[#1F5F91] border-[#DCE3EA] rounded focus:ring-[#1F5F91]"
                        />
                        <span className="text-sm font-medium text-[#253443]">
                          {language === 'HI' ? 'शांत घंटे सक्षम करें' : 'Enable Quiet Hours'}
                        </span>
                      </label>
                      {preferences.quietHours?.enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 ml-7">
                          <div>
                            <label className="block text-xs text-[#657586] mb-1">{language === 'HI' ? 'प्रारंभ' : 'Start'}</label>
                            <input
                              type="time"
                              value={preferences.quietHours.start}
                              onChange={e => setPreferences(prev => prev ? { ...prev, quietHours: { ...(prev.quietHours || { enabled: false, start: '22:00', end: '08:00', timezone: 'Asia/Kolkata' }), start: e.target.value } } : null)}
                              className="w-full px-3 py-2 text-sm border border-[#DCE3EA] rounded-lg bg-white focus:border-[#1F5F91] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#657586] mb-1">{language === 'HI' ? 'समाप्त' : 'End'}</label>
                            <input
                              type="time"
                              value={preferences.quietHours.end}
                              onChange={e => setPreferences(prev => prev ? { ...prev, quietHours: { ...(prev.quietHours || { enabled: false, start: '22:00', end: '08:00', timezone: 'Asia/Kolkata' }), end: e.target.value } } : null)}
                              className="w-full px-3 py-2 text-sm border border-[#DCE3EA] rounded-lg bg-white focus:border-[#1F5F91] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#657586] mb-1">{language === 'HI' ? 'समय क्षेत्र' : 'Timezone'}</label>
                            <input
                              type="text"
                              value={preferences.quietHours.timezone}
                              onChange={e => setPreferences(prev => prev ? { ...prev, quietHours: { ...(prev.quietHours || { enabled: false, start: '22:00', end: '08:00', timezone: 'Asia/Kolkata' }), timezone: e.target.value } } : null)}
                              className="w-full px-3 py-2 text-sm border border-[#DCE3EA] rounded-lg bg-white focus:border-[#1F5F91] focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-[#153E63] mb-3 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5" />
                      {language === 'HI' ? 'घटना प्रकार प्राथमिकताएं' : 'Event Type Preferences'}
                    </h4>
                    <p className="text-sm text-[#657586] mb-3">
                      {language === 'HI' ? 'प्रत्येक घटना प्रकार के लिए सूचना चैनल चुनें' : 'Choose notification channels for each event type'}
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(preferences.channelPreferences || {}).map(([eventType, channels]) => (
                        <div key={eventType} className="p-3 border border-[#DCE3EA] rounded-lg bg-[#F5F7FA]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm text-[#253443]">{EVENT_TYPE_LABELS[eventType as NotificationEventType] || eventType}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['email', 'sms', 'in_app', 'push'].map(channel => (
                              <label key={channel} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={channels.includes(channel as NotificationChannel)}
                                  onChange={e => {
                                    const newChannels = e.target.checked
                                      ? [...channels, channel as NotificationChannel]
                                      : channels.filter(c => c !== channel);
                                    setPreferences(prev => prev ? {
                                      ...prev,
                                      channelPreferences: {
                                        ...prev.channelPreferences,
                                        [eventType]: newChannels
                                      }
                                    } : null);
                                  }}
                                  className="w-3.5 h-3.5 text-[#1F5F91] border-[#DCE3EA] rounded focus:ring-[#1F5F91]"
                                />
                                <span className="text-xs text-[#657586] capitalize">{channel === 'in_app' ? 'in-app' : channel}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#DCE3EA]">
                    <button
                      onClick={() => setShowPreferences(false)}
                      className="px-4 py-2 text-sm font-medium text-[#657586] bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg hover:bg-[#EAF2F8] transition-colors"
                    >
                      {language === 'HI' ? 'रद्द करें' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleSavePreferences}
                      disabled={savingPrefs}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#1F5F91] border border-[#1F5F91] rounded-lg hover:bg-[#153E63] transition-colors disabled:opacity-50"
                    >
                      {savingPrefs
                        ? (language === 'HI' ? 'सहेजा जा रहा है...' : 'Saving...')
                        : (language === 'HI' ? 'सहेजें' : 'Save')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}