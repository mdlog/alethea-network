/**
 * Debug Email Test - Detailed logging
 */

import nodemailer from 'nodemailer';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../.env.reminder') });

async function debugEmailTest() {
    console.log('🔍 Email Debug Test\n');

    // Show configuration (hide password)
    console.log('📋 Configuration:');
    console.log('   SMTP Host:', process.env.SMTP_HOST);
    console.log('   SMTP Port:', process.env.SMTP_PORT);
    console.log('   SMTP Secure:', process.env.SMTP_SECURE);
    console.log('   SMTP User:', process.env.SMTP_USER);
    console.log('   SMTP Pass:', process.env.SMTP_PASSWORD ? '***' + process.env.SMTP_PASSWORD.slice(-4) : 'NOT SET');
    console.log('');

    // Get recipient
    const recipient = process.argv[2];
    if (!recipient) {
        console.error('❌ Please provide recipient email:');
        console.error('   node server/test-email-debug.js your-email@example.com');
        process.exit(1);
    }

    console.log('📧 Recipient:', recipient);
    console.log('');

    // Create transporter with debug
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        },
        debug: true, // Enable debug output
        logger: true // Enable logger
    });

    console.log('🔌 Testing SMTP connection...\n');

    try {
        // Verify connection
        await transporter.verify();
        console.log('✅ SMTP connection successful!\n');

        // Send test email
        console.log('📤 Sending test email...\n');

        const info = await transporter.sendMail({
            from: `"Alethea Oracle Test" <${process.env.SMTP_USER}>`,
            to: recipient,
            subject: '🧪 Test Email from Alethea Oracle',
            text: 'This is a test email from Alethea Oracle Network. If you receive this, the email service is working correctly!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                    <div style="background-color: #14b8a6; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0;">🧪 Test Email</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Alethea Oracle Network</p>
                    </div>
                    <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #272429; margin-top: 0;">✅ Email Service Working!</h2>
                        <p style="color: #6b7280; line-height: 1.6;">
                            This is a test email from <strong>notifications@alethea.network</strong>.
                        </p>
                        <p style="color: #6b7280; line-height: 1.6;">
                            If you receive this email, it means the email reminder system is configured correctly and ready to use.
                        </p>
                        <div style="background-color: #f0fdfa; border-left: 4px solid #14b8a6; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #115e59; font-size: 14px;">
                                <strong>Next Steps:</strong><br>
                                • Check if this email landed in your inbox or spam folder<br>
                                • Mark as "Not Spam" if needed<br>
                                • Add notifications@alethea.network to your contacts
                            </p>
                        </div>
                        <p style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            Sent from: notifications@alethea.network<br>
                            Provider: Hostinger SMTP<br>
                            Time: ${new Date().toLocaleString()}
                        </p>
                    </div>
                </div>
            `
        });

        console.log('\n✅ Email sent successfully!');
        console.log('📧 Message ID:', info.messageId);
        console.log('📬 Accepted:', info.accepted);
        console.log('❌ Rejected:', info.rejected);
        console.log('📊 Response:', info.response);
        console.log('');
        console.log('🔍 Please check:');
        console.log('   1. Inbox folder');
        console.log('   2. Spam/Junk folder');
        console.log('   3. Promotions tab (Gmail)');
        console.log('   4. Wait 1-2 minutes for delivery');
        console.log('');
        console.log('💡 Tip: Add notifications@alethea.network to contacts to avoid spam');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\n🔧 Troubleshooting:');

        if (error.code === 'EAUTH') {
            console.error('   • Authentication failed - check email/password');
            console.error('   • Verify credentials in .env.reminder');
        } else if (error.code === 'ECONNECTION') {
            console.error('   • Connection failed - check SMTP host/port');
            console.error('   • Verify firewall settings');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('   • Connection timeout - check internet connection');
            console.error('   • Try different SMTP port (587 instead of 465)');
        } else {
            console.error('   • Full error:', error);
        }
    }
}

debugEmailTest();
