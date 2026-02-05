/**
 * Reminder API Server
 * Express server for handling reminder subscriptions
 */

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { subscribeToReminder, unsubscribeFromReminder, getReminderStats } from './reminder-scheduler.js';
import { sendWelcomeEmail, verifyEmailConfig } from './email-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../.env.reminder') });

const app = express();
const PORT = process.env.REMINDER_API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'reminder-api' });
});

// Subscribe to reminder
app.post('/api/reminders/subscribe', async (req, res) => {
    try {
        const { email, queryId, reminderTimes } = req.body;

        // Validate input
        if (!email || !queryId) {
            return res.status(400).json({
                success: false,
                error: 'Email and queryId are required'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address'
            });
        }

        // Subscribe
        const result = subscribeToReminder({
            email,
            queryId,
            reminderTimes: reminderTimes || ['24h', '1h']
        });

        // Send welcome email (optional, only on first subscription)
        // await sendWelcomeEmail({ 
        //     to: email, 
        //     dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:5173' 
        // });

        res.json({
            success: true,
            message: 'Successfully subscribed to reminders',
            queryId,
            reminderTimes: reminderTimes || ['24h', '1h']
        });
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to subscribe to reminders'
        });
    }
});

// Unsubscribe from reminder
app.post('/api/reminders/unsubscribe', (req, res) => {
    try {
        const { email, queryId } = req.body;

        if (!email || !queryId) {
            return res.status(400).json({
                success: false,
                error: 'Email and queryId are required'
            });
        }

        const result = unsubscribeFromReminder(email, queryId);

        res.json({
            success: true,
            message: 'Successfully unsubscribed from reminders'
        });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unsubscribe from reminders'
        });
    }
});

// Get reminder statistics (admin only)
app.get('/api/reminders/stats', (req, res) => {
    try {
        const stats = getReminderStats();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get statistics'
        });
    }
});

// Start server
async function startServer() {
    // Verify email configuration
    const emailReady = await verifyEmailConfig();
    if (!emailReady) {
        console.warn('⚠️  Email service not configured properly. Check SMTP settings.');
    }

    app.listen(PORT, () => {
        console.log(`🚀 Reminder API server running on port ${PORT}`);
        console.log(`📧 Email: ${emailReady ? 'Ready' : 'Not configured'}`);
    });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

export { app, startServer };

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer();
}
