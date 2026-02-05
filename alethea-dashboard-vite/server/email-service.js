/**
 * Email Notification Service for Alethea Oracle Network
 * Minimalist & Professional Design
 */

import nodemailer from 'nodemailer';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../.env.reminder') });

// Email configuration
const EMAIL_CONFIG = {
    from: {
        name: process.env.EMAIL_FROM_NAME || 'Alethea Oracle',
        address: process.env.EMAIL_FROM_ADDRESS || 'notifications@alethea.network'
    },
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || 'notifications@alethea.network',
            pass: process.env.SMTP_PASSWORD || ''
        }
    }
};

// Create reusable transporter
let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport(EMAIL_CONFIG.smtp);
    }
    return transporter;
}

/**
 * Send query deadline reminder email - Minimalist Design
 */
export async function sendQueryReminder(options) {
    const {
        to,
        queryId,
        description,
        deadline,
        timeRemaining,
        phase,
        dashboardUrl
    } = options;

    const subject = `${phase === 'commit' ? '🔒' : '👁️'} Query #${queryId} • ${timeRemaining} left`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1a1a1a;
            background-color: #f8f9fa;
            padding: 20px;
        }
        .container { 
            max-width: 560px; 
            margin: 0 auto; 
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .header {
            padding: 32px 32px 24px 32px;
            border-bottom: 1px solid #f0f0f0;
        }
        .logo { 
            width: 32px; 
            height: 32px; 
            border-radius: 6px;
            margin-bottom: 16px;
        }
        .title {
            font-size: 13px;
            font-weight: 500;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .query-id {
            font-size: 20px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 8px;
        }
        .phase-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            ${phase === 'commit'
            ? 'background: #eff6ff; color: #1e40af;'
            : 'background: #fef3c7; color: #92400e;'}
        }
        .content { padding: 32px; }
        .time-box {
            background: ${phase === 'commit' ? '#f0f9ff' : '#fffbeb'};
            border: 1px solid ${phase === 'commit' ? '#bae6fd' : '#fde68a'};
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin-bottom: 24px;
        }
        .time-label {
            font-size: 12px;
            font-weight: 500;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .time-value {
            font-size: 28px;
            font-weight: 700;
            color: ${phase === 'commit' ? '#0369a1' : '#b45309'};
        }
        .description {
            font-size: 15px;
            line-height: 1.6;
            color: #4a4a4a;
            margin-bottom: 20px;
        }
        .meta {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 24px;
        }
        .meta-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
        }
        .meta-label {
            color: #666;
            font-weight: 500;
        }
        .meta-value {
            color: #1a1a1a;
            font-weight: 500;
            text-align: right;
        }
        .info-box {
            padding: 16px;
            background: ${phase === 'commit' ? '#f0f9ff' : '#fffbeb'};
            border-left: 3px solid ${phase === 'commit' ? '#0ea5e9' : '#f59e0b'};
            border-radius: 4px;
            margin-bottom: 24px;
        }
        .info-box p {
            font-size: 13px;
            line-height: 1.5;
            color: #4a4a4a;
            margin: 0;
        }
        .cta {
            text-align: center;
            margin-bottom: 24px;
        }
        .button {
            display: inline-block;
            padding: 12px 32px;
            background: ${phase === 'commit' ? '#0ea5e9' : '#f59e0b'};
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
        }
        .note {
            text-align: center;
            font-size: 13px;
            color: #666;
            padding: 0 16px;
        }
        .footer {
            padding: 24px 32px;
            border-top: 1px solid #f0f0f0;
            text-align: center;
        }
        .footer-brand {
            font-size: 13px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 8px;
        }
        .footer-links {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-bottom: 16px;
        }
        .footer-link {
            font-size: 13px;
            color: #666;
            text-decoration: none;
        }
        .footer-text {
            font-size: 12px;
            color: #999;
            line-height: 1.5;
        }
        @media only screen and (max-width: 600px) {
            body { padding: 12px; }
            .container { border-radius: 8px; }
            .header, .content, .footer { padding: 24px 20px; }
            .time-value { font-size: 24px; }
            .query-id { font-size: 18px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://vote.alethea.network/logo.png" alt="Alethea" class="logo" />
            <div class="title">Query Reminder</div>
            <div class="query-id">Query #${queryId}</div>
            <span class="phase-badge">
                ${phase === 'commit' ? '🔒 Commit Phase' : '👁️ Reveal Phase'}
            </span>
        </div>

        <div class="content">
            <div class="time-box">
                <div class="time-label">Time Remaining</div>
                <div class="time-value">${timeRemaining}</div>
            </div>

            <div class="description">${description.split('.')[0]}.</div>

            <div class="meta">
                <div class="meta-item">
                    <span class="meta-label">Deadline</span>
                    <span class="meta-value">${new Date(deadline).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Phase</span>
                    <span class="meta-value">${phase === 'commit' ? 'Commit' : 'Reveal'}</span>
                </div>
            </div>

            <div class="info-box">
                <p>${phase === 'commit'
            ? 'Submit your vote privately. Your vote is encrypted and hidden from other voters.'
            : 'Reveal your committed vote now. Failure to reveal may result in penalties.'
        }</p>
            </div>

            <div class="cta">
                <a href="${dashboardUrl}/queries" class="button">
                    ${phase === 'commit' ? 'Vote Now →' : 'Reveal Vote →'}
                </a>
            </div>

            <div class="note">
                ${phase === 'commit'
            ? 'Remember to return during reveal phase'
            : 'This is your final reminder'
        }
            </div>
        </div>

        <div class="footer">
            <div class="footer-brand">Alethea Oracle</div>
            <div class="footer-links">
                <a href="${dashboardUrl}" class="footer-link">Dashboard</a>
                <a href="${dashboardUrl}/docs" class="footer-link">Docs</a>
                <a href="https://alethea.network" class="footer-link">Website</a>
            </div>
            <div class="footer-text">
                You're receiving this because you subscribed to reminders.<br>
                <a href="${dashboardUrl}/profile" style="color: #0ea5e9; text-decoration: none;">Manage preferences</a>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    const text = `
Alethea Oracle - Query #${queryId} Reminder

${phase === 'commit' ? 'Commit' : 'Reveal'} Phase Ending Soon!
Time Remaining: ${timeRemaining}

${description}

Deadline: ${new Date(deadline).toLocaleString()}

${phase === 'commit' ? 'Vote now' : 'Reveal your vote'}: ${dashboardUrl}/queries

---
Alethea Oracle Network
    `;

    try {
        const info = await getTransporter().sendMail({
            from: `"${EMAIL_CONFIG.from.name}" <${EMAIL_CONFIG.from.address}>`,
            to,
            subject,
            text,
            html
        });

        console.log('✅ Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(options) {
    const { to, dashboardUrl } = options;

    const subject = '🎉 Welcome to Alethea Oracle Notifications';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; background-color: #f8f9fa; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .header { padding: 32px; text-align: center; border-bottom: 1px solid #f0f0f0; }
        .logo { width: 32px; height: 32px; border-radius: 6px; margin-bottom: 16px; }
        .content { padding: 32px; }
        .footer { padding: 24px; text-align: center; border-top: 1px solid #f0f0f0; font-size: 12px; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://vote.alethea.network/logo.png" alt="Alethea" class="logo" />
            <h1 style="font-size: 20px; font-weight: 600; margin: 0;">Welcome to Alethea!</h1>
        </div>
        <div class="content">
            <p>Thank you for subscribing to query reminders!</p>
            <p style="text-align: center; margin-top: 32px;">
                <a href="${dashboardUrl}" style="display: inline-block; background-color: #0ea5e9; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                    Go to Dashboard
                </a>
            </p>
        </div>
        <div class="footer">
            <p>Alethea Oracle Network</p>
            <p><a href="${dashboardUrl}/profile" style="color: #0ea5e9; text-decoration: none;">Manage preferences</a></p>
        </div>
    </div>
</body>
</html>
    `;

    try {
        await getTransporter().sendMail({
            from: `"${EMAIL_CONFIG.from.name}" <${EMAIL_CONFIG.from.address}>`,
            to,
            subject,
            html
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig() {
    try {
        await getTransporter().verify();
        console.log('✅ Email service is ready');
        return true;
    } catch (error) {
        console.error('❌ Email service configuration error:', error);
        return false;
    }
}

export default {
    sendQueryReminder,
    sendWelcomeEmail,
    verifyEmailConfig
};
