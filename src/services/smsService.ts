// SCIP - SMS Service Interface (Provider-Independent)
// Supports OTP delivery through a configurable SMS provider.
// Never logs OTP values.

export interface SmsProviderConfig {
  provider: 'twilio' | 'aws-sns' | 'msg91' | 'gupshup' | 'console' | 'mock';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  region?: string;
  apiKey?: string;
}

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface SmsSendRequest {
  to: string;
  message: string;
  correlationId?: string;
}

export interface SmsService {
  sendSms(request: SmsSendRequest): Promise<SmsSendResult>;
  isConfigured(): boolean;
  getProviderName(): string;
}

// Console/logging SMS provider (development only - never sends real SMS)
export class ConsoleSmsProvider implements SmsService {
  private config: SmsProviderConfig;

  constructor(config: SmsProviderConfig) {
    this.config = { ...config, provider: 'console' };
  }

  async sendSms(request: SmsSendRequest): Promise<SmsSendResult> {
    // NEVER log the actual OTP value
    const isOtpSms = request.message.toLowerCase().includes('otp') ||
      request.message.toLowerCase().includes('verification code') ||
      request.message.toLowerCase().includes('scip verification');

    console.log(`[SMS] To: ${request.to}`);
    console.log(`[SMS] Provider: ${this.config.provider}`);
    if (isOtpSms) {
      console.log(`[SMS] Message: [OTP SMS - content redacted for security]`);
    } else {
      console.log(`[SMS] Message: ${request.message.slice(0, 200)}...`);
    }
    console.log(`[SMS] CorrelationId: ${request.correlationId ?? 'none'}`);

    return {
      success: true,
      messageId: `console-${Date.now()}`,
      provider: 'console'
    };
  }

  isConfigured(): boolean {
    return true;
  }

  getProviderName(): string {
    return 'console';
  }
}

// Mock SMS provider for testing - simulates success or failure
export class MockSmsProvider implements SmsService {
  private config: SmsProviderConfig;
  private shouldFail: boolean;
  private failMessage: string;

  constructor(config: SmsProviderConfig, shouldFail = false, failMessage = 'SMS provider failure') {
    this.config = { ...config, provider: 'mock' };
    this.shouldFail = shouldFail;
    this.failMessage = failMessage;
  }

  async sendSms(request: SmsSendRequest): Promise<SmsSendResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: this.failMessage,
        provider: 'mock'
      };
    }
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      provider: 'mock'
    };
  }

  isConfigured(): boolean {
    return true;
  }

  getProviderName(): string {
    return 'mock';
  }

  setShouldFail(shouldFail: boolean, message?: string) {
    this.shouldFail = shouldFail;
    if (message) this.failMessage = message;
  }
}

// Factory function to create SMS service from environment config
export function createSmsService(config?: SmsProviderConfig): SmsService {
  const cfg = config || {
    provider: (process.env.SMS_PROVIDER as any) || 'console',
    fromNumber: process.env.SMS_FROM || '+91-0000000000'
  };

  switch (cfg.provider) {
    case 'console':
      return new ConsoleSmsProvider(cfg);
    case 'mock':
      return new MockSmsProvider(cfg);
    case 'twilio':
    case 'aws-sns':
    case 'msg91':
    case 'gupshup':
      // Real provider adapters would be implemented here with actual SDK integration.
      // For now, fall back to console provider with a warning.
      console.warn(`[SMS] Provider "${cfg.provider}" not yet implemented; falling back to console provider.`);
      return new ConsoleSmsProvider({ ...cfg, provider: 'console' });
    default:
      return new ConsoleSmsProvider(cfg);
  }
}

export const smsService = createSmsService();
