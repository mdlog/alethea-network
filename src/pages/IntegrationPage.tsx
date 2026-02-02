import { useState } from 'react';
import { Code, Zap, CheckCircle, ArrowRight, Database, MessageSquare, Shield, Copy, Check } from 'lucide-react';

export default function IntegrationPage() {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const copyCode = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">DApp Integration Guide</h1>
                <p className="text-lg text-gray-600">
                    How prediction markets and other DApps use Alethea Oracle for trustless resolution
                </p>
            </div>

            {/* Key Concept */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Zap className="w-6 h-6 text-blue-600" />
                    Key Concept: Oracle as Resolution Layer
                </h2>
                <p className="text-gray-700 mb-4">
                    Alethea Oracle is <strong>NOT</strong> a prediction market. It's a <strong>resolution layer</strong> that
                    verifies real-world events. Prediction markets create markets, users bet, and when the event occurs,
                    they ask Alethea Oracle: "Did this event happen?"
                </p>
                <div className="bg-white/70 rounded-xl p-4">
                    <div className="flex items-center justify-between text-sm">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Database className="w-6 h-6 text-purple-600" />
                            </div>
                            <span className="font-medium">Prediction Market</span>
                            <p className="text-xs text-gray-500">Creates markets, handles bets</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400" />
                        <div className="text-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <MessageSquare className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="font-medium">Alethea Oracle</span>
                            <p className="text-xs text-gray-500">Verifies event outcome</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400" />
                        <div className="text-center">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <span className="font-medium">Resolution</span>
                            <p className="text-xs text-gray-500">Market settles, payouts distributed</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Flow Diagram */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Integration Flow</h2>
                <div className="bg-slate-900 rounded-lg p-6 text-sm font-mono text-gray-300 overflow-x-auto">
                    <pre>{`
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PREDICTION MARKET + ALETHEA ORACLE FLOW                  │
└─────────────────────────────────────────────────────────────────────────────┘

  STEP 1: Market Creation (Prediction Market DApp)
  ════════════════════════════════════════════════
  
  User ──▶ Prediction Market Contract
           │
           └──▶ CreateMarket {
                  question: "Did Arsenal beat Liverpool on Jan 8, 2026?",
                  outcomes: ["Yes", "No", "Draw"],
                  betting_end: Jan 8, 2026 20:00 UTC
                }
           
           Market Status: OPEN
           Users place bets on Yes/No/Draw


  STEP 2: Event Occurs (Real World)
  ═════════════════════════════════
  
  🏟️ Arsenal vs Liverpool match happens on Jan 8, 2026
  📊 Final Score: Arsenal 2 - 1 Liverpool
  ✅ Arsenal wins!


  STEP 3: Request Resolution (Market → Oracle)
  ════════════════════════════════════════════
  
  Market Contract ──▶ Alethea Oracle Registry
                      │
                      │ CreateQueryWithCallback {
                      │   description: "Did Arsenal beat Liverpool on Jan 8, 2026?",
                      │   outcomes: ["Yes", "No", "Draw"],
                      │   callback_chain: <market_chain>,
                      │   callback_app: <market_app>,
                      │   callback_data: [market_id]
                      │ }
                      │
                      Market Status: VOTING


  STEP 4: Oracle Voting (Alethea Network)
  ═══════════════════════════════════════
  
  ┌─────────────────────────────────────────────────────────────┐
  │  Registered voters verify the real-world event:            │
  │                                                             │
  │  Voter A (1000 stake): Commits vote ████████                │
  │  Voter B (500 stake):  Commits vote ████████                │
  │  Voter C (2000 stake): Commits vote ████████                │
  │                                                             │
  │  After reveal phase:                                        │
  │  - Voter A voted: "Yes" ✓                                   │
  │  - Voter B voted: "Yes" ✓                                   │
  │  - Voter C voted: "Yes" ✓                                   │
  │                                                             │
  │  Consensus: "Yes" (Arsenal won)                             │
  └─────────────────────────────────────────────────────────────┘


  STEP 5: Callback to Market (Oracle → Market)
  ════════════════════════════════════════════
  
  Alethea Oracle ──▶ Prediction Market Contract
                     │
                     │ QueryResolutionCallback {
                     │   query_id: 42,
                     │   resolved_outcome: "Yes",
                     │   resolved_at: Jan 9, 2026 10:00 UTC,
                     │   callback_data: [market_id]
                     │ }
                     │
                     Market Status: RESOLVED
                     Winning Outcome: "Yes"


  STEP 6: Payout Distribution (Prediction Market)
  ═══════════════════════════════════════════════
  
  Winners ──▶ Market Contract
              │
              └──▶ ClaimPayout { market_id: 1 }
              
              Payout = (user_stake × total_pool) / winning_pool
              
              Example:
              - Total Pool: 10,000 USDC
              - Yes Pool: 4,000 USDC
              - User bet 100 USDC on "Yes"
              - Payout = (100 × 10,000) / 4,000 = 250 USDC
`}</pre>
                </div>
            </div>

            {/* Code Examples */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Code Examples (Rust/Linera)</h2>

                {/* Step 1: Define Message Type */}
                <CodeBlock
                    title="1. Define Callback Message Type"
                    description="Your contract must handle the callback message from Alethea Oracle"
                    code={`// In your contract's lib.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    // Your other messages...
    
    /// Oracle resolution callback from Alethea
    QueryResolutionCallback {
        query_id: u64,
        resolved_outcome: String,
        resolved_at: Timestamp,
        callback_data: Vec<u8>,  // Contains your market_id
    },
}`}
                    copied={copiedCode === 'msg'}
                    onCopy={() => copyCode(`#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    QueryResolutionCallback {
        query_id: u64,
        resolved_outcome: String,
        resolved_at: Timestamp,
        callback_data: Vec<u8>,
    },
}`, 'msg')}
                />

                {/* Step 2: Request Resolution */}
                <CodeBlock
                    title="2. Request Resolution from Oracle"
                    description="When your market expires, call Alethea Oracle to verify the outcome"
                    code={`// In your contract's execute_operation
async fn request_resolution(&mut self, market_id: u64) {
    let market = self.state.markets.get(&market_id).await?;
    
    // Encode market_id as callback data
    let callback_data = market_id.to_le_bytes().to_vec();
    
    // Create query in Alethea Oracle
    let operation = oracle_registry_v2::Operation::CreateQueryWithCallback {
        description: market.question.clone(),
        outcomes: vec!["Yes".to_string(), "No".to_string()],
        strategy: DecisionStrategy::WeightedByStake,
        min_votes: Some(3),
        reward_amount: Amount::from_tokens(100),
        deadline: None,  // Use default duration
        callback_chain: self.runtime.chain_id(),
        callback_app: self.runtime.application_id().forget_abi(),
        callback_data,
    };
    
    // Cross-application call to Oracle Registry
    self.runtime.call_application(true, registry_app_id, &operation);
    
    // Update market status
    market.status = MarketStatus::Voting;
    self.state.markets.insert(&market_id, market).await;
}`}
                    copied={copiedCode === 'request'}
                    onCopy={() => copyCode(`async fn request_resolution(&mut self, market_id: u64) {
    let market = self.state.markets.get(&market_id).await?;
    let callback_data = market_id.to_le_bytes().to_vec();
    
    let operation = oracle_registry_v2::Operation::CreateQueryWithCallback {
        description: market.question.clone(),
        outcomes: vec!["Yes".to_string(), "No".to_string()],
        strategy: DecisionStrategy::WeightedByStake,
        min_votes: Some(3),
        reward_amount: Amount::from_tokens(100),
        deadline: None,
        callback_chain: self.runtime.chain_id(),
        callback_app: self.runtime.application_id().forget_abi(),
        callback_data,
    };
    
    self.runtime.call_application(true, registry_app_id, &operation);
}`, 'request')}
                />

                {/* Step 3: Handle Callback */}
                <CodeBlock
                    title="3. Handle Resolution Callback"
                    description="Process the oracle result and settle your market"
                    code={`// In your contract's execute_message
async fn execute_message(&mut self, message: Message) {
    match message {
        Message::QueryResolutionCallback {
            query_id,
            resolved_outcome,
            resolved_at,
            callback_data,
        } => {
            // Decode market_id from callback_data
            let market_id = u64::from_le_bytes(
                callback_data[..8].try_into().unwrap()
            );
            
            // Get and update market
            let mut market = self.state.markets.get(&market_id).await?;
            
            // Verify this is the expected query
            if market.query_id != Some(query_id) {
                panic!("Query ID mismatch");
            }
            
            // Update market with resolution
            market.status = MarketStatus::Resolved;
            market.winning_outcome = Some(resolved_outcome);
            market.resolved_at = Some(resolved_at);
            
            self.state.markets.insert(&market_id, market).await;
            
            log::info!("Market {} resolved: {}", market_id, resolved_outcome);
        }
        // ... other messages
    }
}`}
                    copied={copiedCode === 'callback'}
                    onCopy={() => copyCode(`async fn execute_message(&mut self, message: Message) {
    match message {
        Message::QueryResolutionCallback {
            query_id,
            resolved_outcome,
            resolved_at,
            callback_data,
        } => {
            let market_id = u64::from_le_bytes(
                callback_data[..8].try_into().unwrap()
            );
            
            let mut market = self.state.markets.get(&market_id).await?;
            market.status = MarketStatus::Resolved;
            market.winning_outcome = Some(resolved_outcome);
            market.resolved_at = Some(resolved_at);
            
            self.state.markets.insert(&market_id, market).await;
        }
    }
}`, 'callback')}
                />

                {/* Step 4: Payout */}
                <CodeBlock
                    title="4. Calculate and Distribute Payouts"
                    description="Winners can claim their payouts based on oracle result"
                    code={`// Payout calculation
async fn claim_payout(&mut self, market_id: u64, bettor: ChainId) {
    let market = self.state.markets.get(&market_id).await?;
    
    // Verify market is resolved
    if market.status != MarketStatus::Resolved {
        panic!("Market not resolved yet");
    }
    
    let bet = self.state.bets.get(&(market_id, bettor)).await?;
    
    // Check if user won
    if bet.outcome != market.winning_outcome.unwrap() {
        panic!("You did not win this market");
    }
    
    // Calculate payout
    // payout = (user_stake × total_pool) / winning_pool
    let winning_pool = if bet.outcome == "Yes" {
        market.yes_pool
    } else {
        market.no_pool
    };
    
    let payout = (bet.stake.saturating_mul(market.total_pool.into()))
        .saturating_div(winning_pool.into());
    
    // Transfer payout to winner
    self.runtime.transfer(bettor, payout);
    
    // Mark as claimed
    bet.claim_status = ClaimStatus::Claimed;
    bet.payout_amount = Some(payout);
    self.state.bets.insert(&(market_id, bettor), bet).await;
}`}
                    copied={copiedCode === 'payout'}
                    onCopy={() => copyCode(`async fn claim_payout(&mut self, market_id: u64, bettor: ChainId) {
    let market = self.state.markets.get(&market_id).await?;
    let bet = self.state.bets.get(&(market_id, bettor)).await?;
    
    let winning_pool = if bet.outcome == "Yes" {
        market.yes_pool
    } else {
        market.no_pool
    };
    
    let payout = (bet.stake.saturating_mul(market.total_pool.into()))
        .saturating_div(winning_pool.into());
    
    self.runtime.transfer(bettor, payout);
}`, 'payout')}
                />
            </div>

            {/* Use Cases */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">DApps That Can Use Alethea Oracle</h2>
                <div className="grid md:grid-cols-2 gap-4">
                    <UseCaseCard
                        icon="🎰"
                        title="Prediction Markets"
                        description="Binary and multi-outcome markets for sports, crypto, politics"
                        example="Did Team A win? → Oracle verifies → Winners get paid"
                    />
                    <UseCaseCard
                        icon="🛡️"
                        title="Insurance Protocols"
                        description="Parametric insurance with automatic claim verification"
                        example="Was flight delayed >2hrs? → Oracle verifies → Auto payout"
                    />
                    <UseCaseCard
                        icon="📈"
                        title="DeFi Derivatives"
                        description="Options and futures settlement based on verified prices"
                        example="Did BTC close above $100k? → Oracle verifies → Settle contracts"
                    />
                    <UseCaseCard
                        icon="🎮"
                        title="Gaming & Esports"
                        description="Tournament results and in-game event verification"
                        example="Who won the championship? → Oracle verifies → Distribute prizes"
                    />
                </div>
            </div>

            {/* Benefits */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-green-600" />
                    Why Use Alethea Oracle?
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white/70 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Decentralized</h3>
                        <p className="text-sm text-gray-600">No single point of failure. Multiple staked voters verify each event.</p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Trustless</h3>
                        <p className="text-sm text-gray-600">Economic incentives ensure honest reporting. Slashing for incorrect votes.</p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Automatic</h3>
                        <p className="text-sm text-gray-600">Callback system automatically notifies your contract when resolved.</p>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="text-center py-6">
                <p className="text-gray-600 mb-4">Ready to integrate Alethea Oracle into your DApp?</p>
                <div className="flex justify-center gap-4">
                    <a
                        href="/docs"
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Read Full Documentation
                    </a>
                    <a
                        href="https://github.com/alethea-network"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                        View on GitHub
                    </a>
                </div>
            </div>
        </div>
    );
}

function CodeBlock({ title, description, code, copied, onCopy }: {
    title: string;
    description: string;
    code: string;
    copied: boolean;
    onCopy: () => void;
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-start justify-between">
                <div>
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
                <button
                    onClick={onCopy}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy code"
                >
                    {copied ? (
                        <Check className="w-5 h-5 text-green-500" />
                    ) : (
                        <Copy className="w-5 h-5 text-gray-400" />
                    )}
                </button>
            </div>
            <div className="bg-slate-900 p-4 overflow-x-auto">
                <pre className="text-sm text-gray-300 font-mono">{code}</pre>
            </div>
        </div>
    );
}

function UseCaseCard({ icon, title, description, example }: {
    icon: string;
    title: string;
    description: string;
    example: string;
}) {
    return (
        <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{icon}</span>
                <h3 className="font-semibold text-gray-900">{title}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">{description}</p>
            <p className="text-xs text-gray-500 bg-white rounded px-2 py-1">
                <Code className="w-3 h-3 inline mr-1" />
                {example}
            </p>
        </div>
    );
}
