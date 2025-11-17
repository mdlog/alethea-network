# 🚀 Alethea Operations Guide

## Overview

Panduan lengkap untuk menggunakan Alethea operations di dashboard. Operations adalah cara untuk berinteraksi dengan Linera blockchain contracts.

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Helper Functions](#helper-functions)
3. [Create Market](#create-market)
4. [Register Voter](#register-voter)
5. [Examples](#examples)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Installation

Helper functions sudah tersedia di `lib/helpers/operations.ts`. Tidak perlu install dependencies tambahan.

### Basic Usage

```typescript
import { createMarketDirect, validateMarketParams } from '@/lib/helpers/operations';

// Create a market
const result = await createMarketDirect(
  {
    question: "Will BTC hit $100k?",
    outcomes: ["Yes", "No"],
    deadline: new Date('2024-12-31'),
  },
  chainUrl,
  applicationId
);

if (result.success) {
  console.log('Market created!', result.transactionHash);
} else {
  console.error('Error:', result.error);
}
```

---

## Helper Functions

### `createMarketDirect()`

Create a new market using direct HTTP operation.

**Signature:**
```typescript
async function createMarketDirect(
  params: CreateMarketParams,
  chainUrl: string,
  applicationId: string
): Promise<OperationResult>
```

**Parameters:**
- `params.question` - Market question (max 500 chars)
- `params.outcomes` - Array of outcomes (2-10 items, max 100 chars each)
- `params.deadline` - Date object or timestamp in milliseconds
- `params.callbackData` - Optional callback data (Uint8Array)
- `chainUrl` - Linera chain URL
- `applicationId` - Oracle Registry application ID

**Returns:**
```typescript
{
  success: boolean;
  transactionHash?: string;
  error?: string;
}
```

**Example:**
```typescript
const result = await createMarketDirect(
  {
    question: "Who will win the 2024 election?",
    outcomes: ["Candidate A", "Candidate B", "Candidate C"],
    deadline: new Date('2024-11-05'),
  },
  'http://localhost:8080/chains/...',
  '948a0e49dc424b3cfb0a997d7c7ef05b048c5f4184a2a4d546d6d7abae823261'
);
```

---

### `validateMarketParams()`

Validate market parameters before submission.

**Signature:**
```typescript
function validateMarketParams(params: CreateMarketParams): string | null
```

**Returns:**
- `null` if valid
- Error message string if invalid

**Example:**
```typescript
const error = validateMarketParams({
  question: "Will it rain?",
  outcomes: ["Yes", "No"],
  deadline: new Date('2024-12-31'),
});

if (error) {
  console.error('Validation error:', error);
} else {
  // Proceed with creation
}
```

**Validation Rules:**
- Question: Required, 1-500 characters
- Outcomes: 2-10 items, each 1-100 characters
- Deadline: Must be in the future

---

### `registerVoter()`

Register as a voter in the oracle network.

**Signature:**
```typescript
async function registerVoter(
  params: RegisterVoterParams,
  registryUrl: string
): Promise<OperationResult>
```

**Parameters:**
- `params.stake` - Stake amount (number or string)
- `registryUrl` - Oracle Registry URL

**Example:**
```typescript
const result = await registerVoter(
  { stake: 1000 },
  'http://localhost:8080/chains/.../applications/...'
);
```

---

### `getTimeUntilDeadline()`

Calculate human-readable time until deadline.

**Signature:**
```typescript
function getTimeUntilDeadline(deadline: Date | number): string
```

**Returns:**
- `"5d 3h"` - Days and hours
- `"3h 45m"` - Hours and minutes
- `"45m"` - Minutes only
- `"Expired"` - Past deadline

**Example:**
```typescript
const timeLeft = getTimeUntilDeadline(new Date('2024-12-31'));
console.log(timeLeft); // "45d 12h"
```

---

### `formatDeadline()`

Format deadline for display.

**Signature:**
```typescript
function formatDeadline(deadline: Date | number): string
```

**Example:**
```typescript
const formatted = formatDeadline(new Date('2024-12-31'));
console.log(formatted); // "12/31/2024, 12:00:00 AM"
```

---

### `generateCallbackData()`

Generate callback data for market ID.

**Signature:**
```typescript
function generateCallbackData(marketId: number): Uint8Array
```

**Example:**
```typescript
const callbackData = generateCallbackData(123);
// Use in market creation
```

---

## Create Market

### Simple Yes/No Market

```typescript
import { createYesNoMarket } from '@/lib/helpers/operations';

const result = await createYesNoMarket(
  "Will it rain tomorrow?",
  new Date('2024-12-01'),
  chainUrl,
  applicationId
);
```

### Multi-Outcome Market

```typescript
import { createMultiOutcomeMarket } from '@/lib/helpers/operations';

const result = await createMultiOutcomeMarket(
  "Who will win the championship?",
  ["Team A", "Team B", "Team C", "Team D"],
  new Date('2024-12-31'),
  chainUrl,
  applicationId
);
```

### Custom Market with Validation

```typescript
import { createMarketDirect, validateMarketParams } from '@/lib/helpers/operations';

const params = {
  question: "What will be the temperature?",
  outcomes: ["Below 0°C", "0-10°C", "10-20°C", "Above 20°C"],
  deadline: new Date('2024-12-01'),
};

// Validate first
const error = validateMarketParams(params);
if (error) {
  alert(error);
  return;
}

// Create market
const result = await createMarketDirect(params, chainUrl, applicationId);

if (result.success) {
  console.log('Market created!');
  console.log('Transaction:', result.transactionHash);
} else {
  console.error('Failed:', result.error);
}
```

---

## Register Voter

### Basic Registration

```typescript
import { registerVoter } from '@/lib/helpers/operations';

const result = await registerVoter(
  { stake: 1000 }, // 1000 tokens
  registryUrl
);

if (result.success) {
  console.log('Registered as voter!');
} else {
  console.error('Registration failed:', result.error);
}
```

---

## Examples

### Complete Create Market Flow

```typescript
'use client';

import { useState } from 'react';
import { 
  createMarketDirect, 
  validateMarketParams,
  getTimeUntilDeadline 
} from '@/lib/helpers/operations';

export default function CreateMarketPage() {
  const [question, setQuestion] = useState('');
  const [outcomes, setOutcomes] = useState(['', '']);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare params
      const params = {
        question: question.trim(),
        outcomes: outcomes.filter(o => o.trim()),
        deadline: new Date(deadline),
      };

      // Validate
      const validationError = validateMarketParams(params);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Create market
      const result = await createMarketDirect(
        params,
        process.env.NEXT_PUBLIC_CHAIN_URL!,
        process.env.NEXT_PUBLIC_REGISTRY_ID!
      );

      if (result.success) {
        alert('Market created successfully!');
        // Reset form
        setQuestion('');
        setOutcomes(['', '']);
        setDeadline('');
      } else {
        setError(result.error || 'Failed to create market');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Market'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

### Display Time Until Deadline

```typescript
import { getTimeUntilDeadline } from '@/lib/helpers/operations';

export function MarketCard({ market }) {
  const timeLeft = getTimeUntilDeadline(market.deadline);
  
  return (
    <div>
      <h3>{market.question}</h3>
      <p>Time left: {timeLeft}</p>
    </div>
  );
}
```

---

## Troubleshooting

### Common Errors

#### "Question is required"
- Make sure question is not empty
- Trim whitespace before validation

#### "At least 2 outcomes are required"
- Provide minimum 2 outcomes
- Filter empty outcomes before submission

#### "Deadline must be in the future"
- Check deadline is after current time
- Use `new Date()` for proper date handling

#### "HTTP 400" or "HTTP 500"
- Check chain URL is correct
- Verify application ID is valid
- Ensure Linera service is running

### Debug Tips

```typescript
// Enable detailed logging
const result = await createMarketDirect(params, chainUrl, applicationId);
console.log('Result:', result);

if (!result.success) {
  console.error('Error details:', result.error);
}

// Validate before submission
const error = validateMarketParams(params);
if (error) {
  console.error('Validation failed:', error);
}
```

### Check Environment Variables

```typescript
// Verify environment variables are set
console.log('Chain URL:', process.env.NEXT_PUBLIC_CHAIN_URL);
console.log('Registry ID:', process.env.NEXT_PUBLIC_REGISTRY_ID);
```

---

## Environment Variables

Add these to your `.env.local`:

```bash
# Linera Chain URL
NEXT_PUBLIC_CHAIN_URL=http://localhost:8080/chains/a2c0349ae6add80c92e26bb383aca8d98f9f3441c3097fec99111199c7f1e221

# Oracle Registry Application ID
NEXT_PUBLIC_REGISTRY_ID=948a0e49dc424b3cfb0a997d7c7ef05b048c5f4184a2a4d546d6d7abae823261

# Registry GraphQL URL (for queries)
NEXT_PUBLIC_REGISTRY_URL=http://localhost:8080/chains/a2c0349ae6add80c92e26bb383aca8d98f9f3441c3097fec99111199c7f1e221/applications/948a0e49dc424b3cfb0a997d7c7ef05b048c5f4184a2a4d546d6d7abae823261
```

---

## API Reference

### Types

```typescript
interface CreateMarketParams {
  question: string;
  outcomes: string[];
  deadline: Date | number;
  callbackData?: Uint8Array;
}

interface RegisterVoterParams {
  stake: string | number;
}

interface OperationResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}
```

---

## Best Practices

1. **Always Validate**
   ```typescript
   const error = validateMarketParams(params);
   if (error) {
     // Handle error
     return;
   }
   ```

2. **Handle Errors Gracefully**
   ```typescript
   try {
     const result = await createMarketDirect(...);
     if (!result.success) {
       // Show user-friendly error
       setError(result.error);
     }
   } catch (err) {
     // Handle unexpected errors
     setError('Something went wrong');
   }
   ```

3. **Use Environment Variables**
   ```typescript
   const chainUrl = process.env.NEXT_PUBLIC_CHAIN_URL!;
   const registryId = process.env.NEXT_PUBLIC_REGISTRY_ID!;
   ```

4. **Show Loading States**
   ```typescript
   setLoading(true);
   try {
     await createMarketDirect(...);
   } finally {
     setLoading(false);
   }
   ```

---

## Next Steps

- Read [SDK Integration Guide](../SDK_INTEGRATION_GUIDE.md)
- Check [GraphQL Guide](./GRAPHQL_GUIDE.md)
- See [Services Documentation](./lib/services/README.md)

---

**Last Updated:** November 7, 2025

**Status:** ✅ Ready to use
