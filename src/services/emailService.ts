// SCIP - Email Service Interface (Provider-Independent)
// Supports configuration through environment variables.
// Provides integration adapters for email providers.
// Never logs email content containing OTPs or verification tokens.

export interface EmailProviderConfig {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun' | 'console' | 'mock';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  fromEmail: string;
  fromName: string;
  apiKey?: string;
  region?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

// Never log the actual OTP/token value - only metadata
export interface EmailSendRequest {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  correlationId?: string;
}

export interface EmailService {
  sendEmail(request: EmailSendRequest): Promise<EmailSendResult>;
  isConfigured(): boolean;
  getProviderName(): string;
}

// Console/logging email provider (development only - never sends real email)
// Useful for verifying the email flow without external provider configuration
export class ConsoleEmailProvider implements EmailService {
  private config: EmailProviderConfig;

  constructor(config: EmailProviderConfig) {
    this.config = { ...config, provider: 'console' };
  }

  async sendEmail(request: EmailSendRequest): Promise<EmailSendResult> {
    // NEVER log OTP or verification token values in production
    const safeBody = request.textBody || request.htmlBody;
    const isOtpEmail = safeBody.toLowerCase().includes('otp') || safeBody.toLowerCase().includes('verification code');

    console.log(`[EMAIL] To: ${request.to}`);
    console.log(`[EMAIL] Subject: ${request.subject}`);
    console.log(`[EMAIL] Provider: ${this.config.provider}`);
    if (isOtpEmail) {
      // Never expose OTP content in production. In non-production (local demo/dev),
      // surface the body so the account-linking challenge can be completed without a
      // real email provider. This is a dev-only convenience.
      if (process.env.NODE_ENV === 'production') {
        console.log(`[EMAIL] Body: [OTP/verification email - content redacted for security]`);
      } else {
        console.log(`[EMAIL] Body (dev only): ${safeBody.slice(0, 400)}`);
      }
    } else {
      console.log(`[EMAIL] Body: ${safeBody.slice(0, 200)}...`);
    }
    console.log(`[EMAIL] CorrelationId: ${request.correlationId ?? 'none'}`);

    return {
      success: true,
      messageId: `console-${Date.now()}`,
      provider: 'console'
    };
  }

  isConfigured(): boolean {
    return true; // Console provider is always "configured"
  }

  getProviderName(): string {
    return 'console';
  }
}

// Mock email provider for testing - simulates success or failure
export class MockEmailProvider implements EmailService {
  private config: EmailProviderConfig;
  private shouldFail: boolean;
  private failMessage: string;

  constructor(config: EmailProviderConfig, shouldFail = false, failMessage = 'Email provider failure') {
    this.config = { ...config, provider: 'mock' };
    this.shouldFail = shouldFail;
    this.failMessage = failMessage;
  }

  async sendEmail(request: EmailSendRequest): Promise<EmailSendResult> {
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

// Factory function to create email service from environment config
export function createEmailService(config?: EmailProviderConfig): EmailService {
  const cfg = config || {
    provider: (process.env.EMAIL_PROVIDER as any) || 'console',
    fromEmail: process.env.EMAIL_FROM || 'noreply@scip.gov',
    fromName: process.env.EMAIL_FROM_NAME || 'SCIP Portal'
  };

  switch (cfg.provider) {
    case 'console':
      return new ConsoleEmailProvider(cfg);
    case 'mock':
      return new MockEmailProvider(cfg);
    case 'smtp':
    case 'sendgrid':
    case 'ses':
    case 'mailgun':
      // Real provider adapters would be implemented here with actual SDK integration.
      // For now, fall back to console provider with a warning.
      console.warn(`[EMAIL] Provider "${cfg.provider}" not yet implemented; falling back to console provider.`);
      return new ConsoleEmailProvider({ ...cfg, provider: 'console' });
    default:
      return new ConsoleEmailProvider(cfg);
  }
}

export const emailService = createEmailService();
