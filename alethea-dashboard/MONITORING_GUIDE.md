# Alethea Oracle Monitoring Dashboard

## Overview

The monitoring dashboard provides real-time visibility into the Oracle Registry's performance and health metrics.

## Features

### Key Metrics
- **Total Markets**: Breakdown of external vs internal markets
- **Callback Success Rate**: Percentage of successful callback deliveries
- **Average Callback Time**: Time taken to deliver resolution callbacks
- **Vote Response Rate**: Percentage of vote requests that receive responses
- **Average Resolution Time**: Time from market creation to resolution
- **Total Fees Collected**: Revenue generated from external market registrations

### Visualizations
- **Market Distribution Chart**: Doughnut chart showing market types and status
- **Callback Performance Chart**: Bar chart showing callback success/failure/retry counts

### Alerts
The dashboard automatically monitors for:
- **High Callback Failure Rate**: Alerts when > 10% of callbacks fail
- **Low Vote Response Rate**: Alerts when < 70% of vote requests receive responses
- **Slow Callback Time**: Alerts when average callback time > 5 seconds

## Accessing the Dashboard

### Option 1: Static HTML (Standalone)
Open the monitoring dashboard directly in your browser:

```bash
# From the alethea-dashboard directory
open public/monitoring.html
```

Or navigate to: `http://localhost:3000/monitoring.html` when the dashboard is running.

### Option 2: Integrated with Next.js Dashboard
The monitoring page can be accessed at `/monitoring` when the main dashboard is running:

```bash
cd alethea-dashboard
npm run dev
```

Then visit: `http://localhost:3000/monitoring.html`

## Configuration

### Registry Endpoint
The dashboard connects to the Oracle Registry GraphQL endpoint. By default, it uses:
- `http://localhost:8080` (local development)

To change the endpoint, set the `NEXT_PUBLIC_REGISTRY_ENDPOINT` environment variable:

```bash
export NEXT_PUBLIC_REGISTRY_ENDPOINT=https://your-registry-endpoint.com
```

### Alert Thresholds
You can customize alert thresholds by editing the `ALERT_THRESHOLDS` object in `monitoring.html`:

```javascript
const ALERT_THRESHOLDS = {
    callbackFailureRate: 10,  // Alert if > 10% failures
    voteResponseRate: 70,     // Alert if < 70% response rate
    avgCallbackTime: 5000,    // Alert if > 5 seconds
};
```

### Auto-Refresh Interval
The dashboard auto-refreshes every 30 seconds. To change this, modify the interval in `monitoring.html`:

```javascript
// Auto-refresh every 30 seconds (30000ms)
setInterval(loadMetrics, 30000);
```

## Metrics Explained

### Market Metrics
- **Total External Markets**: Markets registered by external dApps
- **Total Internal Markets**: Markets from the Market Chain (legacy)
- **External Markets Resolved**: Completed external markets
- **Internal Markets Resolved**: Completed internal markets

### Callback Metrics
- **Total Callbacks Sent**: Successfully delivered resolution callbacks
- **Total Callbacks Failed**: Failed callback delivery attempts
- **Total Callback Retries**: Number of retry attempts
- **Average Callback Time**: Mean time to deliver callbacks (in milliseconds)
- **Callback Success Rate**: (Sent / (Sent + Failed)) * 100

### Fee Metrics
- **Total External Fees Collected**: Sum of all registration fees
- **Average Fee Per Market**: Mean fee per external market

### Voter Metrics
- **Total Vote Requests Sent**: Number of vote requests broadcast to voters
- **Total Votes Received**: Number of votes submitted by voters
- **Average Votes Per Market**: Mean votes per market
- **Vote Response Rate**: (Votes Received / Requests Sent) * 100

### Time Metrics
- **Average Resolution Time**: Mean time from market creation to resolution (in hours)
- **Fastest Resolution Time**: Shortest resolution time (in hours)
- **Slowest Resolution Time**: Longest resolution time (in hours)

## Troubleshooting

### Dashboard shows "Error loading metrics"
1. Ensure the Oracle Registry service is running
2. Check that the GraphQL endpoint is accessible
3. Verify the `NEXT_PUBLIC_REGISTRY_ENDPOINT` is correct
4. Check browser console for detailed error messages

### Metrics show all zeros
1. Ensure markets have been created and resolved
2. Check that the Registry contract has been deployed
3. Verify the metrics are being tracked in the contract

### Charts not displaying
1. Ensure Chart.js is loaded (check browser console)
2. Try refreshing the page
3. Check for JavaScript errors in the console

## Production Deployment

For production use, consider:

1. **Authentication**: Add authentication to restrict access
2. **HTTPS**: Serve the dashboard over HTTPS
3. **Rate Limiting**: Implement rate limiting on the GraphQL endpoint
4. **Monitoring**: Set up external monitoring for the dashboard itself
5. **Alerting**: Integrate with alerting systems (PagerDuty, Slack, etc.)

## Example Integration with Alerting

```javascript
// Example: Send alert to Slack webhook
async function sendSlackAlert(alert) {
    const webhookUrl = 'YOUR_SLACK_WEBHOOK_URL';
    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: `🚨 Oracle Alert: ${alert.message}`,
            attachments: [{
                color: alert.type === 'error' ? 'danger' : 'warning',
                fields: [{
                    title: 'Time',
                    value: alert.time.toISOString(),
                    short: true
                }]
            }]
        })
    });
}
```

## API Reference

The dashboard queries the following GraphQL endpoint:

```graphql
query {
    metrics {
        totalExternalMarkets
        totalInternalMarkets
        externalMarketsResolved
        internalMarketsResolved
        totalCallbacksSent
        totalCallbacksFailed
        totalCallbackRetries
        averageCallbackTimeMs
        callbackSuccessRate
        totalExternalFeesCollected
        averageFeePerMarket
        totalVoteRequestsSent
        totalVotesReceived
        averageVotesPerMarket
        voteResponseRate
        averageResolutionTimeHours
        fastestResolutionTimeHours
        slowestResolutionTimeHours
        lastUpdated
    }
}
```

## Support

For issues or questions:
- Check the main [README](../README.md)
- Review the [Architecture documentation](../ARCHITECTURE.md)
- Open an issue on GitHub
