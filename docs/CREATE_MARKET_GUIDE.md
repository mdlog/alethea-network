# How to Create Markets in Dashboard

## ✅ Create Market Feature Available!

The Alethea dashboard has a complete feature for creating prediction markets through the UI.

## How to Use

### 1. Open Dashboard
Access the dashboard in your browser: `http://localhost:3000`

### 2. Click "Create Market" Button
- Button is located in the Header (top of page)
- Opens a modal form for creating markets

### 3. Fill Market Form

#### **Question** (Market Question)
- Example: "Will Bitcoin reach $100,000 by end of 2025?"
- Must be clear and specific
- Minimum 10 characters

#### **Outcomes** (Answer Options)
- Minimum 2 outcomes
- Maximum 10 outcomes
- Example for Yes/No market:
  - Outcome 1: "Yes"
  - Outcome 2: "No"
- Example for multiple choice:
  - Outcome 1: "Less than $50k"
  - Outcome 2: "$50k - $75k"
  - Outcome 3: "$75k - $100k"
  - Outcome 4: "More than $100k"

#### **Deadline** (Resolution Time Limit)
- Choose date and time when market will be resolved
- Must be in the future (minimum 1 hour from now)
- Format: YYYY-MM-DD HH:mm

### 4. Submit
- Click "Create Market" button
- Wait for confirmation (usually a few seconds)
- Market will appear on dashboard after successful creation

## Automatic Validation

Form will validate:
- ✅ Question cannot be empty and minimum 10 characters
- ✅ Minimum 2 outcomes must be filled
- ✅ Outcomes cannot be duplicates
- ✅ Deadline must be in the future
- ✅ Deadline minimum 1 hour from now

## Technology

### Market Chain GraphQL Mutation
```graphql
mutation {
  createMarket(
    question: "Your question here"
    outcomes: ["Option 1", "Option 2"]
    resolutionDeadline: 1700000000  # Unix timestamp in seconds
    initialLiquidity: "1000000"     # Default liquidity
  )
}
```

### Endpoint
```
POST http://localhost:8080/chains/{CHAIN_ID}/applications/{MARKET_CHAIN_ID}
```

### Environment Variables
```bash
NEXT_PUBLIC_CHAIN_ID=8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef
NEXT_PUBLIC_MARKET_CHAIN_ID=438a180a65594f69d27d0d53eb2072213a476489d439aeef5f857ef9699f245b
```

## Market Examples

### 1. Yes/No Market
```
Question: "Will Ethereum upgrade to Proof of Stake succeed in 2025?"
Outcomes:
  - Yes
  - No
Deadline: 2025-12-31 23:59
```

### 2. Multiple Choice Market
```
Question: "What will be the price of ETH at end of Q1 2025?"
Outcomes:
  - Below $2000
  - $2000 - $3000
  - $3000 - $4000
  - Above $4000
Deadline: 2025-03-31 23:59
```

### 3. Event Outcome Market
```
Question: "Who will win the 2025 Champions League?"
Outcomes:
  - Manchester City
  - Real Madrid
  - Bayern Munich
  - Other
Deadline: 2025-06-01 23:59
```

## Troubleshooting

### Market doesn't appear after creation
1. Refresh page (F5)
2. Check browser console for errors
3. Ensure Market Chain service is running
4. Check Network tab for GraphQL response

### Error "Failed to create market"
1. Ensure all fields are filled correctly
2. Check deadline is not in the past
3. Ensure Market Chain URL is correct in `.env.local`
4. Check Linera service logs: `linera service --port 8080`

### Validation Error
- Read error message carefully
- Ensure all requirements are met
- Check deadline format (must be YYYY-MM-DD HH:mm)

## Additional Features

### Auto-refresh
- Dashboard auto-refreshes every 30 seconds
- New markets appear automatically

### Search & Filter
- Use search box to find markets
- Filter by status: All / Open / Resolved

### Market Details
- Click market card to view details
- See outcomes, deadline, and status

## Next Steps

After market is created:
1. ✅ Market appears on dashboard with "OPEN" status
2. 🔄 Users can buy shares for each outcome
3. ⏰ After deadline, market can be resolved
4. 💰 Winners can claim winnings

## References

- [Market Display Fix](./MARKET_DISPLAY_FIX.md) - Troubleshooting market display
- [Market Chain Service](../alethea-dashboard/lib/services/market-chain.service.ts) - API reference
- [Operations Helper](../alethea-dashboard/lib/helpers/operations.ts) - Create market implementation
