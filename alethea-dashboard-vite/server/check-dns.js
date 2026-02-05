/**
 * Check DNS Records for Email Deliverability
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkDNS() {
    console.log('🔍 Checking DNS Records for alethea.network\n');

    const domain = 'alethea.network';

    // Check MX Records
    console.log('📧 MX Records (Mail Exchange):');
    try {
        const { stdout } = await execAsync(`nslookup -type=MX ${domain}`);
        console.log(stdout);
    } catch (error) {
        console.error('❌ Error checking MX:', error.message);
    }

    // Check SPF Record
    console.log('\n🛡️  SPF Record (Sender Policy Framework):');
    try {
        const { stdout } = await execAsync(`nslookup -type=TXT ${domain}`);
        const lines = stdout.split('\n');
        const spfLine = lines.find(line => line.includes('v=spf1'));
        if (spfLine) {
            console.log('✅ SPF Found:', spfLine.trim());
        } else {
            console.log('❌ No SPF record found');
            console.log('   Add this to DNS: v=spf1 include:_spf.hostinger.com ~all');
        }
    } catch (error) {
        console.error('❌ Error checking SPF:', error.message);
    }

    // Check DKIM
    console.log('\n🔐 DKIM Record:');
    try {
        const { stdout } = await execAsync(`nslookup -type=TXT default._domainkey.${domain}`);
        if (stdout.includes('v=DKIM1')) {
            console.log('✅ DKIM Found');
        } else {
            console.log('❌ No DKIM record found');
            console.log('   Enable DKIM in Hostinger Email settings');
        }
    } catch (error) {
        console.log('❌ DKIM not configured');
        console.log('   Enable DKIM in Hostinger Email settings');
    }

    // Check DMARC
    console.log('\n📊 DMARC Record:');
    try {
        const { stdout } = await execAsync(`nslookup -type=TXT _dmarc.${domain}`);
        if (stdout.includes('v=DMARC1')) {
            console.log('✅ DMARC Found');
        } else {
            console.log('⚠️  No DMARC record found (optional but recommended)');
            console.log('   Add this to DNS: v=DMARC1; p=none; rua=mailto:dmarc@alethea.network');
        }
    } catch (error) {
        console.log('⚠️  DMARC not configured (optional)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📝 Summary & Recommendations:');
    console.log('='.repeat(60));
    console.log('\n1. Check Hostinger Email Logs:');
    console.log('   https://hpanel.hostinger.com → Email → Logs');
    console.log('\n2. Verify SPF Record exists:');
    console.log('   Should include: include:_spf.hostinger.com');
    console.log('\n3. Enable DKIM in Hostinger:');
    console.log('   Email Settings → DKIM Authentication → Enable');
    console.log('\n4. Test with different email provider:');
    console.log('   npm run test:email:debug your-email@yahoo.com');
    console.log('\n5. Contact Hostinger Support:');
    console.log('   Ask them to check why emails to Gmail are not delivered');
    console.log('   Queue ID: 4f5p2923P2z3wnP');
}

checkDNS();
