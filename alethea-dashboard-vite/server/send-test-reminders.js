/**
 * Send Test Reminder Emails
 * Sends both Commit and Reveal phase examples
 */

import { sendQueryReminder } from './email-service.js';

async function sendTestReminders() {
    const recipient = process.argv[2];

    if (!recipient) {
        console.error('❌ Please provide recipient email:');
        console.error('   node server/send-test-reminders.js your-email@example.com');
        process.exit(1);
    }

    console.log('📧 Sending test reminder emails to:', recipient);
    console.log('');

    // Calculate timestamps
    const now = Date.now();
    const oneHourLater = now + (60 * 60 * 1000);
    const twoHoursLater = now + (2 * 60 * 60 * 1000);

    // Test 1: Commit Phase Reminder (1 hour before)
    console.log('📤 Sending Commit Phase reminder...');
    try {
        const commitResult = await sendQueryReminder({
            to: recipient,
            queryId: '123',
            description: 'Will Bitcoin reach $100,000 by end of 2024? Bitcoin has been showing strong momentum in 2024. This query asks whether BTC will reach the $100,000 milestone by December 31, 2024. Source: CoinMarketCap, TradingView',
            deadline: oneHourLater,
            timeRemaining: '1 hour',
            phase: 'commit',
            dashboardUrl: process.env.DASHBOARD_URL || 'https://dashboard.alethea.network'
        });

        if (commitResult.success) {
            console.log('✅ Commit phase email sent!');
            console.log('   Message ID:', commitResult.messageId);
        } else {
            console.error('❌ Failed:', commitResult.error);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    console.log('');

    // Wait 2 seconds before sending next email
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Reveal Phase Reminder (30 minutes before)
    console.log('📤 Sending Reveal Phase reminder...');
    try {
        const revealResult = await sendQueryReminder({
            to: recipient,
            queryId: '123',
            description: 'Will Bitcoin reach $100,000 by end of 2024? You have already committed your vote. Now it\'s time to reveal it! Source: CoinMarketCap, TradingView',
            deadline: twoHoursLater,
            timeRemaining: '30 minutes',
            phase: 'reveal',
            dashboardUrl: process.env.DASHBOARD_URL || 'https://dashboard.alethea.network'
        });

        if (revealResult.success) {
            console.log('✅ Reveal phase email sent!');
            console.log('   Message ID:', revealResult.messageId);
        } else {
            console.error('❌ Failed:', revealResult.error);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    console.log('');
    console.log('🎉 Test emails sent!');
    console.log('');
    console.log('📬 Check your inbox:');
    console.log('   1. Commit Phase email (blue theme, 🔒)');
    console.log('   2. Reveal Phase email (amber theme, 👁️)');
    console.log('');
    console.log('💡 If not in inbox, check Spam folder');
    console.log('   Add notifications@alethea.network to contacts');
}

sendTestReminders();
