import "../config/load-environment.js";
import { Logger } from "@nestjs/common";
import { Resend } from "resend";

export type EmailMessage = {
  subject: string;
  text: string;
  to: string;
};

export interface NotificationProvider {
  sendEmail(message: EmailMessage): Promise<void>;
}

export const NOTIFICATION_PROVIDER = Symbol("NotificationProvider");

type NotificationEnvironment = {
  EMAIL_FROM?: string;
  NODE_ENV?: string;
  RESEND_API_KEY?: string;
};

type LogMessage = (message: string) => void;

const sandboxLogger = new Logger("SandboxEmail");

export class ConsoleNotificationProvider implements NotificationProvider {
  constructor(
    private readonly log: LogMessage = (message) =>
      sandboxLogger.log(message),
  ) {}

  sendEmail(message: EmailMessage): Promise<void> {
    this.log(
      [
        "[sandbox-email]",
        `to=${message.to}`,
        `subject=${message.subject}`,
        message.text,
      ].join("\n"),
    );
    return Promise.resolve();
  }
}

export class ResendNotificationProvider implements NotificationProvider {
  private readonly resend: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.resend = new Resend(apiKey);
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      subject: message.subject,
      text: message.text,
      to: message.to,
    });

    if (error) {
      throw new Error(`Resend failed: ${error.message}`);
    }
  }
}

export function createNotificationProvider(
  environment: NotificationEnvironment,
  log?: LogMessage,
): NotificationProvider {
  if (environment.RESEND_API_KEY && environment.EMAIL_FROM) {
    return new ResendNotificationProvider(
      environment.RESEND_API_KEY,
      environment.EMAIL_FROM,
    );
  }

  if (environment.NODE_ENV === "production") {
    throw new Error(
      "RESEND_API_KEY and EMAIL_FROM are required in production",
    );
  }

  return new ConsoleNotificationProvider(log);
}

export const notificationProvider = createNotificationProvider(
  process.env,
);
