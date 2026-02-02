#!/usr/bin/env node

/**
 * Feedback Tracker Script
 * 
 * This script helps track and prioritize developer feedback from GitHub issues.
 * It generates reports and helps identify high-priority items.
 * 
 * Usage:
 *   node scripts/feedback-tracker.js
 * 
 * Requirements:
 *   - GitHub Personal Access Token (set as GITHUB_TOKEN env var)
 *   - Node.js 16+
 */

const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'your-org';
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'alethea-network';

if (!GITHUB_TOKEN) {
    console.error('Error: GITHUB_TOKEN environment variable is required');
    console.error('Get a token from: https://github.com/settings/tokens');
    process.exit(1);
}

// Fetch issues from GitHub
async function fetchIssues(label = null) {
    return new Promise((resolve, reject) => {
        const path = label
            ? `/repos/${REPO_OWNER}/${REPO_NAME}/issues?labels=${label}&state=all`
            : `/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=all`;

        const options = {
            hostname: 'api.github.com',
            path,
            method: 'GET',
            headers: {
                'User-Agent': 'Alethea-Feedback-Tracker',
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`GitHub API error: ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

// Calculate priority score
function calculatePriority(issue) {
    let score = 0;

    // Reactions (thumbs up = votes)
    score += (issue.reactions['+1'] || 0) * 3;

    // Comments (engagement)
    score += Math.min(issue.comments, 10);

    // Labels
    if (issue.labels.some(l => l.name === 'critical')) score += 20;
    if (issue.labels.some(l => l.name === 'high-priority')) score += 15;
    if (issue.labels.some(l => l.name === 'bug')) score += 10;
    if (issue.labels.some(l => l.name === 'enhancement')) score += 5;

    // Age (older issues get slight boost)
    const ageInDays = (Date.now() - new Date(issue.created_at)) / (1000 * 60 * 60 * 24);
    score += Math.min(Math.floor(ageInDays / 7), 5);

    return score;
}

// Generate feedback report
async function generateReport() {
    console.log('🔍 Fetching feedback from GitHub...\n');

    try {
        const [bugs, features, questions] = await Promise.all([
            fetchIssues('bug'),
            fetchIssues('enhancement'),
            fetchIssues('question')
        ]);

        console.log('📊 Feedback Summary');
        console.log('===================\n');

        // Bug statistics
        const openBugs = bugs.filter(b => b.state === 'open');
        const closedBugs = bugs.filter(b => b.state === 'closed');
        console.log(`🐛 Bugs: ${bugs.length} total`);
        console.log(`   - Open: ${openBugs.length}`);
        console.log(`   - Closed: ${closedBugs.length}`);
        console.log(`   - Resolution rate: ${((closedBugs.length / bugs.length) * 100).toFixed(1)}%\n`);

        // Feature statistics
        const openFeatures = features.filter(f => f.state === 'open');
        const closedFeatures = features.filter(f => f.state === 'closed');
        console.log(`✨ Feature Requests: ${features.length} total`);
        console.log(`   - Open: ${openFeatures.length}`);
        console.log(`   - Implemented: ${closedFeatures.length}`);
        console.log(`   - Implementation rate: ${((closedFeatures.length / features.length) * 100).toFixed(1)}%\n`);

        // Question statistics
        const openQuestions = questions.filter(q => q.state === 'open');
        const closedQuestions = questions.filter(q => q.state === 'closed');
        console.log(`❓ Questions: ${questions.length} total`);
        console.log(`   - Open: ${openQuestions.length}`);
        console.log(`   - Answered: ${closedQuestions.length}\n`);

        // Top priority bugs
        console.log('🔥 Top Priority Bugs');
        console.log('====================\n');
        const prioritizedBugs = openBugs
            .map(bug => ({ ...bug, priority: calculatePriority(bug) }))
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 5);

        prioritizedBugs.forEach((bug, i) => {
            console.log(`${i + 1}. [Score: ${bug.priority}] ${bug.title}`);
            console.log(`   ${bug.html_url}`);
            console.log(`   👍 ${bug.reactions['+1'] || 0} | 💬 ${bug.comments} | 📅 ${new Date(bug.created_at).toLocaleDateString()}\n`);
        });

        // Top requested features
        console.log('⭐ Top Requested Features');
        console.log('=========================\n');
        const prioritizedFeatures = openFeatures
            .map(feature => ({ ...feature, priority: calculatePriority(feature) }))
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 5);

        prioritizedFeatures.forEach((feature, i) => {
            console.log(`${i + 1}. [Score: ${feature.priority}] ${feature.title}`);
            console.log(`   ${feature.html_url}`);
            console.log(`   👍 ${feature.reactions['+1'] || 0} | 💬 ${feature.comments} | 📅 ${new Date(feature.created_at).toLocaleDateString()}\n`);
        });

        // Response time analysis
        console.log('⏱️  Response Time Analysis');
        console.log('==========================\n');

        const recentIssues = [...bugs, ...features, ...questions]
            .filter(issue => {
                const ageInDays = (Date.now() - new Date(issue.created_at)) / (1000 * 60 * 60 * 24);
                return ageInDays <= 30; // Last 30 days
            });

        const respondedIssues = recentIssues.filter(issue => issue.comments > 0);
        const avgResponseTime = respondedIssues.reduce((sum, issue) => {
            // Simplified: assume first comment is response
            const responseTime = issue.comments > 0 ? 24 : 0; // Placeholder
            return sum + responseTime;
        }, 0) / respondedIssues.length;

        console.log(`Issues in last 30 days: ${recentIssues.length}`);
        console.log(`Issues with responses: ${respondedIssues.length}`);
        console.log(`Response rate: ${((respondedIssues.length / recentIssues.length) * 100).toFixed(1)}%`);
        console.log(`Avg response time: ~${avgResponseTime.toFixed(0)} hours\n`);

        // Recommendations
        console.log('💡 Recommendations');
        console.log('==================\n');

        if (openBugs.length > 10) {
            console.log('⚠️  High number of open bugs. Consider a bug-fix sprint.');
        }

        if (prioritizedBugs.length > 0 && prioritizedBugs[0].priority > 30) {
            console.log('🚨 Critical bug detected. Immediate attention recommended.');
        }

        if (openQuestions.length > 5) {
            console.log('📚 Many open questions. Consider improving documentation.');
        }

        if (prioritizedFeatures.length > 0) {
            console.log(`🎯 Top feature request: "${prioritizedFeatures[0].title}"`);
        }

        console.log('\n✅ Report generated successfully!');

    } catch (error) {
        console.error('Error generating report:', error.message);
        process.exit(1);
    }
}

// Run the report
generateReport();
