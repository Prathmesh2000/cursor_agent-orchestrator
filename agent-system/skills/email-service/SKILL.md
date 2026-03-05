---
name: "email-service"
description: "Use when implementing transactional email. Triggers: \"email\", \"send email\", \"transactional email\", \"email template\", \"nodemailer\", \"SendGrid\", \"Resend\", \"email verification\", \"password reset email\", \"notification email\", or any feature that sends emails to users."
---


# Email Service Skill

Implement reliable transactional email: templated emails with React Email, queued delivery, bounce handling, and delivery monitoring.

---

## Stack Decision

```
Resend (recommended for new projects): Simple API, React Email support, good deliverability
SendGrid: Enterprise features, extensive analytics
SES: Cheapest at scale ($0.10/1000), needs warm-up period
```

---

## Email Service Layer

```typescript
// services/email.service.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { WelcomeEmail } from '../emails/WelcomeEmail';
import { PasswordResetEmail } from '../emails/PasswordResetEmail';
import { queue } from '../lib/queue'; // Bull/BullMQ

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailResult = { success: boolean; messageId?: string; error?: string };

async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// High-level email functions (always queue for reliability)
export const emailService = {
  async sendWelcome(user: { email: string; name: string }) {
    await queue.add('email:welcome', { userId: user.email, name: user.name });
  },

  async sendPasswordReset(user: { email: string; name: string }, resetToken: string) {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    // Send immediately for password reset (time-sensitive)
    return sendEmail({
      to: user.email,
      subject: 'Reset your password',
      html: await render(<PasswordResetEmail name={user.name} resetUrl={resetUrl} />),
    });
  },

  async sendEmailVerification(user: { email: string; name: string }, token: string) {
    const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
    return sendEmail({
      to: user.email,
      subject: 'Verify your email address',
      html: await render(<VerifyEmailTemplate name={user.name} verifyUrl={verifyUrl} />),
    });
  },
};
```

---

## React Email Template

```tsx
// emails/PasswordResetEmail.tsx
import {
  Html, Head, Body, Container, Heading, Text, Button,
  Hr, Preview, Section, Img,
} from '@react-email/components';

interface Props {
  name: string;
  resetUrl: string;
}

export function PasswordResetEmail({ name, resetUrl }: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Reset your password — link expires in 1 hour</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '40px auto', padding: 0 }}>
          {/* Header */}
          <Section style={{ backgroundColor: '#2563eb', borderRadius: '12px 12px 0 0', padding: '32px 40px' }}>
            <Img src="https://yourapp.com/logo-white.png" alt="YourApp" height={32} />
          </Section>

          {/* Body */}
          <Section style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '0 0 12px 12px', border: '1px solid #e5e7eb' }}>
            <Heading style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 0 }}>
              Reset your password
            </Heading>
            <Text style={{ color: '#374151', lineHeight: 1.6, fontSize: 16 }}>
              Hi {name}, we received a request to reset your password.
              Click the button below to choose a new password.
            </Text>
            <Button
              href={resetUrl}
              style={{
                backgroundColor: '#2563eb', color: '#ffffff',
                borderRadius: 8, padding: '12px 24px',
                fontSize: 16, fontWeight: 600, textDecoration: 'none',
                display: 'inline-block', marginTop: 8, marginBottom: 8,
              }}
            >
              Reset Password
            </Button>
            <Text style={{ color: '#6b7280', fontSize: 14, marginTop: 16 }}>
              This link expires in 1 hour. If you didn't request a reset, ignore this email.
            </Text>
            <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
            <Text style={{ color: '#9ca3af', fontSize: 12 }}>
              Or copy and paste: <span style={{ color: '#2563eb' }}>{resetUrl}</span>
            </Text>
          </Section>

          {/* Footer */}
          <Text style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', margin: '20px 0' }}>
            © 2025 YourApp Inc. · 123 Main St, City, CA · <a href="{unsubscribeUrl}">Unsubscribe</a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

---

## Email Queue (BullMQ)

```typescript
// workers/email.worker.ts
import { Worker } from 'bullmq';
import { render } from '@react-email/render';
import { WelcomeEmail } from '../emails/WelcomeEmail';

new Worker('email', async (job) => {
  const { to, name } = job.data;
  await sendEmail({
    to,
    subject: 'Welcome to YourApp!',
    html: await render(<WelcomeEmail name={name} />),
  });
}, {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
  concurrency: 5,
  limiter: { max: 50, duration: 1000 }, // 50 emails/second
});
```

---

## Deliverability Checklist

- [ ] SPF record added to DNS
- [ ] DKIM configured (Resend/SendGrid handles this)
- [ ] DMARC policy set (start with p=none, monitor)
- [ ] Custom sending domain (not shared IP)
- [ ] List-Unsubscribe header on all marketing email
- [ ] Hard bounce handling: disable user email on bounce
- [ ] Spam complaint handler: remove from list immediately
- [ ] Never send to unverified or opted-out addresses
