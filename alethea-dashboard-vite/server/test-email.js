/**
 * Test Email Service
 * Quick test to verify email configuration works
 */

import { sendQueryReminder, verifyEmailConfig } from './email-service.js';

async function testEmailService() {
    console.log('🧪 Testing Email Service Configuration...\n');

    // Step 1: Verify SMTP connection
    console.log('Step 1: Verifying SMTP connection...');
    const isVerified = await verifyEmailConfig();

    if (!isVerified) {
        console.error('❌ SMTP verification failed!');
        console.error('Please check your .env.reminder configuration');
        process.exit(1);
    }

    console.log('✅ SMTP connection verified!\n');

    // Step 2: Send test email
    console.log('Step 2: Sending test email...');
    console.log('Enter recipient email address:');

    // Get email from command line argument
    const testEmail = process.argv[2];

    if (!testEmail) {
        console.log('\n⚠️  No email provided. Usage:');
        console.log('   node server/test-email.js your-email@example.com\n');
        console.log('✅ SMTP configuration is valid and ready to use!');
        process.exit(0);
    }

    try {
        const result = await sendQueryReminder({
            to: testEmail,
            queryId: '999',
            description: 'Test Query: Will Bitcoin reach $100,000 by end of 2024? This is a test email to verify the reminder system is working correctly.',
            deadline: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
            timeRemaining: '24 hours',
            phase: 'commit',
            dashboardUrl: process.env.DASHBOARD_URL || 'https://dashboard.alethea.network'
        });

        if (result.success) {
            console.log('✅ Test email sent successfully!');
            console.log(`📧 Message ID: ${result.messageId}`);
            console.log(`📬 Sent to: ${testEmail}`);
            console.log('\n✨ Email service is fully configured and working!');
        } else {
            console.error('❌ Failed to send test email:', result.error);
        }
    } catch (error) {
        console.error('❌ Error sending test email:', error.message);
    }
}

// Run test
testEmailService();
