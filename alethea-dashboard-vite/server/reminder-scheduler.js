/**
 * Reminder Scheduler Service
 * Monitors queries and sends email reminders at appropriate times
 */

import { sendQueryReminder } from './email-service.js';

// In-memory storage for reminders (in production, use database)
const reminders = new Map();
const sentReminders = new Set();

/**
 * Subscribe user to query reminders
 */
export function subscribeToReminder(options) {
    const { email, queryId, reminderTimes } = options;

    const key = `${email}_${queryId}`;

    if (!reminders.has(queryId)) {
        reminders.set(queryId, new Map());
    }

    reminders.get(queryId).set(email, {
        email,
        queryId,
        reminderTimes: reminderTimes || ['24h', '1h'], // Default: 24h and 1h before deadline
        subscribedAt: Date.now()
    });

    console.log(`✅ Subscribed ${email} to reminders for query #${queryId}`);
    return { success: true };
}

/**
 * Unsubscribe user from query reminders
 */
export function unsubscribeFromReminder(email, queryId) {
    if (reminders.has(queryId)) {
        reminders.get(queryId).delete(email);
        console.log(`✅ Unsubscribed ${email} from query #${queryId}`);
    }
    return { success: true };
}

/**
 * Check if reminder should be sent
 */
function shouldSendReminder(timeRemaining, reminderTime) {
    const timeMap = {
        '24h': 24 * 60 * 60 * 1000,
        '12h': 12 * 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '3h': 3 * 60 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '30m': 30 * 60 * 1000,
        '15m': 15 * 60 * 1000
    };

    const threshold = timeMap[reminderTime];
    if (!threshold) return false;

    // Send reminder if time remaining is within 5 minutes of threshold
    const margin = 5 * 60 * 1000; // 5 minutes
    return timeRemaining <= threshold && timeRemaining > (threshold - margin);
}

/**
 * Format time remaining for display
 */
function formatTimeRemaining(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

/**
 * Process reminders for all queries
 */
export async function processReminders(queries, dashboardUrl) {
    const now = Date.now() * 1000; // Convert to microseconds
    let sentCount = 0;

    for (const query of queries) {
        if (!reminders.has(query.id)) continue;

        const commitEnd = parseInt(query.commitEnd);
        const revealEnd = parseInt(query.revealEnd);

        // Determine current phase
        let phase, deadline, timeRemaining;
        if (now < commitEnd) {
            phase = 'commit';
            deadline = commitEnd;
            timeRemaining = commitEnd - now;
        } else if (now < revealEnd) {
            phase = 'reveal';
            deadline = revealEnd;
            timeRemaining = revealEnd - now;
        } else {
            // Query ended, remove reminders
            reminders.delete(query.id);
            continue;
        }

        // Check each subscriber
        const subscribers = reminders.get(query.id);
        for (const [email, subscription] of subscribers) {
            for (const reminderTime of subscription.reminderTimes) {
                const reminderKey = `${email}_${query.id}_${phase}_${reminderTime}`;

                // Skip if already sent
                if (sentReminders.has(reminderKey)) continue;

                // Check if it's time to send
                if (shouldSendReminder(timeRemaining, reminderTime)) {
                    try {
                        await sendQueryReminder({
                            to: email,
                            queryId: query.id,
                            description: query.description,
                            deadline: deadline / 1000, // Convert to milliseconds
                            timeRemaining: formatTimeRemaining(timeRemaining / 1000),
                            phase,
                            dashboardUrl
                        });

                        sentReminders.add(reminderKey);
                        sentCount++;

                        console.log(`📧 Sent ${phase} reminder to ${email} for query #${query.id} (${reminderTime} before)`);
                    } catch (error) {
                        console.error(`Failed to send reminder to ${email}:`, error);
                    }
                }
            }
        }
    }

    return { sentCount };
}

/**
 * Get reminder statistics
 */
export function getReminderStats() {
    let totalSubscribers = 0;
    let totalQueries = reminders.size;

    for (const subscribers of reminders.values()) {
        totalSubscribers += subscribers.size;
    }

    return {
        totalQueries,
        totalSubscribers,
        totalSent: sentReminders.size
    };
}

/**
 * Clean up old reminders
 */
export function cleanupOldReminders() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago

    for (const [queryId, subscribers] of reminders) {
        for (const [email, subscription] of subscribers) {
            if (subscription.subscribedAt < cutoff) {
                subscribers.delete(email);
            }
        }

        if (subscribers.size === 0) {
            reminders.delete(queryId);
        }
    }
}

export default {
    subscribeToReminder,
    unsubscribeFromReminder,
    processReminders,
    getReminderStats,
    cleanupOldReminders
};
