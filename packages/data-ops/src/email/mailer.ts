/**
 * Pluggable transactional email for Better Auth (verify / reset).
 * Default: console. Production: Resend HTTP API (no SDK required).
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type Mailer = {
  send: (input: SendEmailInput) => Promise<void>;
};

export function createConsoleMailer(): Mailer {
  return {
    send: ({ to, subject, text }) => {
      console.info(`[mail:console] to=${to} subject=${subject}\n${text}`);
      return Promise.resolve();
    },
  };
}

/**
 * Resend REST API (https://resend.com/docs/api-reference/emails/send-email).
 */
export function createResendMailer(options: { apiKey: string; from: string }): Mailer {
  const { apiKey, from } = options;
  return {
    send: async ({ to, subject, text, html }) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text,
          ...(html ? { html } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`[mail:resend] ${res.status} ${body}`);
      }
    },
  };
}

/** Prefer Resend when RESEND_API_KEY + EMAIL_FROM are set; otherwise console. */
export function createMailerFromEnv(
  env: {
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
  } = {},
): Mailer {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (apiKey && from) {
    return createResendMailer({ apiKey, from });
  }
  return createConsoleMailer();
}
