// SCIP - Notification Types

export type NotificationChannel = 'email' | 'sms' | 'in_app' | 'push';

export type NotificationEventType =
  | 'incident_created'
  | 'incident_assigned'
  | 'incident_updated'
  | 'incident_closed'
  | 'incident_reopened'
  | 'incident_verified'
  | 'incident_escalated'
  | 'incident_sla_breach'
  | 'report_submitted'
  | 'report_status_changed'
  | 'report_assigned'
  | 'report_resolved'
  | 'report_acknowledged'
  | 'report_generated'
  | 'report_scheduled'
  | 'user_registered'
  | 'user_role_changed'
  | 'system_announcement'
  | 'ai_insight_generated'
  | 'department_alert';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface NotificationTemplate {
  id: string;
  eventType: NotificationEventType;
  name: string;
  description: string;
  channels: NotificationChannel[];
  subject: string;
  emailTemplate: string;
  smsTemplate: string;
  inAppTemplate: string;
  priority: NotificationPriority;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  channelPreferences: Record<NotificationEventType, NotificationChannel[]>;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };
  frequency?: 'immediate' | 'hourly_digest' | 'daily_digest';
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  data?: Record<string, any>;
  read: boolean;
  readAt?: string;
  emailSent: boolean;
  emailSentAt?: string;
  smsSent: boolean;
  smsSentAt?: string;
  pushSent: boolean;
  pushSentAt?: string;
  correlationId?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'incident' | 'report' | 'user' | 'template' | 'department';
  createdAt: string;
}

export interface NotificationSendRequest {
  userId: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  data?: Record<string, any>;
  correlationId?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'incident' | 'report' | 'user' | 'template' | 'department';
}

export interface NotificationSendResult {
  success: boolean;
  notificationId: string;
  channels: {
    email?: { success: boolean; messageId?: string; error?: string };
    sms?: { success: boolean; messageId?: string; error?: string };
    inApp?: { success: boolean; error?: string };
    push?: { success: boolean; error?: string };
  };
  errors: string[];
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationEventType, number>;
  byChannel: Record<NotificationChannel, number>;
  byPriority: Record<NotificationPriority, number>;
}

export interface NotificationFilters {
  userId?: string;
  eventType?: NotificationEventType;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  read?: boolean;
  dateFrom?: string;
  dateTo?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'incident' | 'report' | 'user' | 'template' | 'department';
  limit?: number;
  offset?: number;
}