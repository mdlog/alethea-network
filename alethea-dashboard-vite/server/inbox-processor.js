/**
 * Simple Express server to process inbox for cross-chain messages
 * Run with: npm run inbox
 */

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const app = express();
const PORT = 4003;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'inbox-processor' });
});

// Process inbox using curl command (most reliable - same as manual)
async function processInboxWithCurl(chainId) {
    const curlCommand = `curl -s -X POST http://localhost:8080 -H "Content-Type: application/json" -d '{"query": "mutation { processInbox(chainId: \\"${chainId}\\") }"}'`;

    console.log(`🔧 Executing: ${curlCommand}`);

    const { stdout, stderr } = await execPromise(curlCommand, { timeout: 30000 });

    if (stderr) {
        console.log('stderr:', stderr);
    }

    console.log('📥 Curl response:', stdout);

    // Parse response
    try {
        const result = JSON.parse(stdout);
        if (result.errors) {
            throw new Error(result.errors[0].message);
        }
        return { success: true, data: result.data };
    } catch (parseErr) {
        // If can't parse, check if it contains error
        if (stdout.includes('error')) {
            throw new Error(stdout);
        }
        return { success: true, raw: stdout };
    }
}

// Process inbox for a specific chain
app.post('/process-inbox', async (req, res) => {
    const { chainId } = req.body;

    if (!chainId) {
        return res.status(400).json({ error: 'chainId is required' });
    }

    // Validate chainId format (64 hex characters)
    if (!/^[a-f0-9]{64}$/i.test(chainId)) {
        return res.status(400).json({ error: 'Invalid chainId format' });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📥 Processing inbox for chain: ${chainId}`);
    console.log(`${'='.repeat(60)}`);

    try {
        const result = await processInboxWithCurl(chainId);
        console.log(`✅ Inbox processed successfully!`);

        res.json({
            success: true,
            chainId,
            message: 'Inbox processed successfully',
            ...result
        });
    } catch (error) {
        console.error(`❌ Failed:`, error.message);
        res.status(500).json({
            success: false,
            chainId,
            error: error.message
        });
    }
});

// Process inbox with retry
app.post('/process-inbox-retry', async (req, res) => {
    const { chainId, maxRetries = 5, delayMs = 2000 } = req.body;

    if (!chainId) {
        return res.status(400).json({ error: 'chainId is required' });
    }

    // Validate chainId format
    if (!/^[a-f0-9]{64}$/i.test(chainId)) {
        return res.status(400).json({ error: 'Invalid chainId format' });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📥 Processing inbox with retry for chain: ${chainId}`);
    console.log(`   Max retries: ${maxRetries}, Delay: ${delayMs}ms`);
    console.log(`${'='.repeat(60)}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`\n🔄 Attempt ${attempt}/${maxRetries}...`);

            const result = await processInboxWithCurl(chainId);

            console.log(`✅ Inbox processed on attempt ${attempt}!`);
            return res.json({
                success: true,
                chainId,
                attempt,
                message: 'Inbox processed successfully',
                ...result
            });
        } catch (error) {
            console.log(`⚠️ Attempt ${attempt} failed: ${error.message}`);

            if (attempt === maxRetries) {
                console.error(`❌ All ${maxRetries} attempts failed`);
                return res.status(500).json({
                    success: false,
                    chainId,
                    attempts: maxRetries,
                    error: error.message
                });
            }

            console.log(`⏳ Waiting ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
});

app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Inbox Processor running on http://localhost:${PORT}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\nEndpoints:`);
    console.log(`  POST /process-inbox        { chainId: "..." }`);
    console.log(`  POST /process-inbox-retry  { chainId: "...", maxRetries: 5, delayMs: 2000 }`);
    console.log(`  GET  /health`);
    console.log(`\nWaiting for requests...\n`);
});
