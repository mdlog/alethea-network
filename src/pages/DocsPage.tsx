import { useState } from 'react';
import { Book, ChevronRight, Code, Zap, Shield, ArrowRight, CheckCircle, Clock, Users, MessageSquare } from 'lucide-react';

type DocSection = 'overview' | 'market-flow' | 'oracle-flow' | 'integration' | 'api';

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState<DocSection>('overview');

    const sections = [
        { id: 'overview', label: 'Overview', icon: Book },
        { id: 'market-flow', label: 'Market → Oracle Flow', icon: Zap },
        { id: 'oracle-flow', label: 'Oracle Resolution', icon: CheckCircle },
        { id: 'integration', label: 'Integration Guide', icon: Code },
        { id: 'api', label: 'API Reference', icon: MessageSquare },
    ];

    return (
        <div className="min-h-screen">
            <div className="flex gap-8">
                {/* Sidebar */}
                <div className="w-64 flex-shrink-0">
                    <div className="sticky top-24 bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-900 mb-4">Documentation</h3>
                        <nav className="space-y-1">
                            {sections.map((section) => {
                                const Icon = section.icon;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id as DocSection)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${activeSection === section.id
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="text-sm font-medium">{section.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 max-w-4xl">
                    {activeSection === 'overview' && <OverviewSection />}
                    {activeSection === 'market-flow' && <MarketFlowSection />}
                    {activeSection === 'oracle-flow' && <OracleFlowSection />}
                    {activeSection === 'integration' && <IntegrationSection />}
                    {activeSection === 'api' && <ApiSection />}
                </div>
            </div>
        </div>
    );
}

function OverviewSection() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Alethea Network Documentation</h1>
                <p className="text-lg text-gray-600">
                    Alethea Network is a decentralized oracle protocol built on Linera's microchain architecture.
                    It provides secure, scalable, and community-driven truth verification for prediction markets
                    and other decentralized applications.
                </p>
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FeatureCard
                    icon={<Shield className="w-6 h-6 text-blue-600" />}
                    title="Decentralized Voting"
                    description="Community-driven consensus through stake-weighted voting with commit-reveal scheme"
                />
                <FeatureCard
                    icon={<Zap className="w-6 h-6 text-yellow-600" />}
                    title="Cross-Chain Callbacks"
                    description="Automatic resolution callbacks to requesting applications via Linera messaging"
                />
                <FeatureCard
                    icon={<Users className="w-6 h-6 text-green-600" />}
                    title="Reputation System"
                    description="Voters earn reputation for correct votes, increasing their voting weight"
                />
                <FeatureCard
                    icon={<Clock className="w-6 h-6 text-purple-600" />}
                    title="Time-Based Phases"
                    description="Structured commit and reveal phases ensure fair and tamper-proof voting"
                />
            </div>

            {/* Architecture Overview */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Architecture Overview</h2>
                <div className="bg-slate-900 rounded-lg p-6 text-sm font-mono text-gray-300">
                    <pre>{`┌─────────────────────────────────────────────────────────────┐
│                    Alethea Network                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    Cross-App Call    ┌─────────────────┐  │
│  │   Market    │ ──────────────────▶  │ Oracle Registry │  │
│  │  Contract   │                      │    Contract     │  │
│  │  (Chain A)  │ ◀──────────────────  │    (Chain B)    │  │
│  └─────────────┘    Callback Message  └─────────────────┘  │
│                                              │              │
│                                              │ Voters       │
│                                              ▼              │
│                                       ┌─────────────┐      │
│                                       │   Voters    │      │
│                                       │  (Staked)   │      │
│                                       └─────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘`}</pre>
                </div>
            </div>
        </div>
    );
}


function MarketFlowSection() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Market → Oracle Flow</h1>
                <p className="text-lg text-gray-600">
                    Learn how prediction markets integrate with Alethea Oracle for decentralized resolution.
                </p>
            </div>

            {/* Flow Diagram */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Complete Flow Diagram</h2>
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 text-sm font-mono text-gray-300 overflow-x-auto">
                    <pre>{`
┌──────────────────────────────────────────────────────────────────────────┐
│                         MARKET → ORACLE FLOW                             │
└──────────────────────────────────────────────────────────────────────────┘

  STEP 1: Market Creation
  ════════════════════════
  
  User ──▶ Market Contract
           │
           └──▶ CreateMarket {
                  question: "Will BTC reach $100k?",
                  end_time: 1735689600
                }
           
           Market Status: OPEN
           Users can place bets (Yes/No)


  STEP 2: Market Expires → Request Resolution
  ═══════════════════════════════════════════
  
  User ──▶ Market Contract ──▶ Oracle Registry
           │                   │
           │ RequestResolution │ CreateQueryWithCallback {
           │                   │   description: "Market #1: Will BTC...",
           │                   │   outcomes: ["Yes", "No"],
           │                   │   callback_chain: <market_chain>,
           │                   │   callback_app: <market_app>,
           │                   │   callback_data: [market_id bytes]
           │                   │ }
           │                   │
           Market Status: VOTING


  STEP 3: Oracle Voting (Commit-Reveal)
  ═════════════════════════════════════
  
  ┌─────────────────────────────────────────────────────────┐
  │                    COMMIT PHASE                         │
  │  Voters submit hashed votes (hidden)                    │
  │  hash = keccak256(outcome + salt)                       │
  └─────────────────────────────────────────────────────────┘
                          │
                          ▼
  ┌─────────────────────────────────────────────────────────┐
  │                    REVEAL PHASE                         │
  │  Voters reveal their votes with salt                    │
  │  Contract verifies hash matches                         │
  └─────────────────────────────────────────────────────────┘
                          │
                          ▼
  ┌─────────────────────────────────────────────────────────┐
  │                   RESOLUTION                            │
  │  Consensus reached → Query resolved                     │
  │  Rewards distributed to correct voters                  │
  └─────────────────────────────────────────────────────────┘


  STEP 4: Callback to Market
  ══════════════════════════
  
  Oracle Registry ──▶ Market Contract
                      │
                      │ QueryResolutionCallback {
                      │   query_id: 42,
                      │   resolved_outcome: "Yes",
                      │   resolved_at: 1735776000,
                      │   callback_data: [market_id bytes]
                      │ }
                      │
                      Market Status: RESOLVED
                      Winning Outcome: "Yes"
                      
                      
  STEP 5: Payout Claims
  ═════════════════════
  
  Winners ──▶ Market Contract
              │
              └──▶ ClaimPayout { market_id: 1 }
              
              Payout = (stake × total_pool) / winning_pool
`}</pre>
                </div>
            </div>

            {/* Step by Step */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Step-by-Step Breakdown</h2>

                <StepCard
                    step={1}
                    title="Market Creation"
                    description="A prediction market is created with a question and end time. Users can place bets on Yes or No outcomes."
                    code={`Operation::CreateMarket {
    question: "Will BTC reach $100k by end of 2025?",
    end_time: Timestamp::from(1735689600000000)
}`}
                />

                <StepCard
                    step={2}
                    title="Request Resolution"
                    description="When the market expires, anyone can trigger resolution. The market contract calls the Oracle Registry via cross-application call."
                    code={`// Market Contract calls Oracle Registry
let registry_operation = oracle_registry_v2::Operation::CreateQueryWithCallback {
    description: format!("Market #{}: {}", market_id, question),
    outcomes: vec!["Yes".to_string(), "No".to_string()],
    strategy: DecisionStrategy::Majority,
    callback_chain: self.runtime.chain_id(),
    callback_app: self.runtime.application_id(),
    callback_data: market_id.to_le_bytes().to_vec(),
};

self.runtime.call_application(true, registry_app_id, &registry_operation);`}
                />

                <StepCard
                    step={3}
                    title="Oracle Voting"
                    description="Registered voters participate in commit-reveal voting. They first commit a hash of their vote, then reveal it in the next phase."
                    code={`// Commit Phase - Submit hashed vote
Operation::CommitVote {
    query_id: 42,
    commitment: keccak256(outcome + salt)
}

// Reveal Phase - Reveal actual vote
Operation::RevealVote {
    query_id: 42,
    outcome: "Yes",
    salt: "random_salt_123"
}`}
                />

                <StepCard
                    step={4}
                    title="Resolution Callback"
                    description="Once consensus is reached, the Oracle Registry automatically sends a callback message to the market contract with the result."
                    code={`// Oracle Registry sends to Market
Message::QueryResolutionCallback {
    query_id: 42,
    resolved_outcome: "Yes",
    resolved_at: current_time,
    callback_data: market_id_bytes,
}`}
                />

                <StepCard
                    step={5}
                    title="Payout Distribution"
                    description="Winners can claim their payouts. The payout is calculated based on their stake relative to the winning pool."
                    code={`// Winners claim payout
Operation::ClaimPayout { market_id: 1 }

// Payout calculation
payout = (user_stake * total_pool) / winning_pool`}
                />
            </div>
        </div>
    );
}

function OracleFlowSection() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Oracle Resolution Process</h1>
                <p className="text-lg text-gray-600">
                    Understanding how queries are resolved through decentralized voting.
                </p>
            </div>

            {/* Voting Phases */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Commit-Reveal Voting</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PhaseCard
                        phase="Commit"
                        duration="24 hours"
                        color="blue"
                        description="Voters submit hashed votes. The actual vote is hidden to prevent copying."
                        actions={["Submit commitment hash", "Hash = keccak256(outcome + salt)", "Vote is hidden"]}
                    />
                    <PhaseCard
                        phase="Reveal"
                        duration="24 hours"
                        color="yellow"
                        description="Voters reveal their actual votes with the salt used in commit phase."
                        actions={["Reveal outcome + salt", "Contract verifies hash", "Vote is recorded"]}
                    />
                    <PhaseCard
                        phase="Resolution"
                        duration="Instant"
                        color="green"
                        description="Consensus is calculated and rewards are distributed to correct voters."
                        actions={["Calculate consensus", "Distribute rewards", "Send callbacks"]}
                    />
                </div>
            </div>

            {/* Consensus Strategies */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Consensus Strategies</h2>

                <div className="space-y-4">
                    <StrategyCard
                        name="Majority"
                        description="Simple majority wins. The outcome with more than 50% of votes is selected."
                        formula="winner = outcome with votes > 50%"
                    />
                    <StrategyCard
                        name="Supermajority"
                        description="Requires 2/3 majority for consensus. More resistant to manipulation."
                        formula="winner = outcome with votes > 66.67%"
                    />
                    <StrategyCard
                        name="Weighted"
                        description="Votes are weighted by stake and reputation. Higher stake = more influence."
                        formula="weight = stake × reputation_multiplier"
                    />
                </div>
            </div>

            {/* Reputation System */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Reputation System</h2>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Tier</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Reputation Range</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Weight Multiplier</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Benefits</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="py-3 px-4"><span className="px-2 py-1 bg-gray-100 rounded text-gray-700">Novice</span></td>
                                <td className="py-3 px-4">0 - 49</td>
                                <td className="py-3 px-4">1.0x</td>
                                <td className="py-3 px-4 text-gray-600">Basic voting rights</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-3 px-4"><span className="px-2 py-1 bg-blue-100 rounded text-blue-700">Apprentice</span></td>
                                <td className="py-3 px-4">50 - 99</td>
                                <td className="py-3 px-4">1.25x</td>
                                <td className="py-3 px-4 text-gray-600">Increased voting weight</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-3 px-4"><span className="px-2 py-1 bg-green-100 rounded text-green-700">Expert</span></td>
                                <td className="py-3 px-4">100 - 199</td>
                                <td className="py-3 px-4">1.5x</td>
                                <td className="py-3 px-4 text-gray-600">Priority selection for queries</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-3 px-4"><span className="px-2 py-1 bg-purple-100 rounded text-purple-700">Master</span></td>
                                <td className="py-3 px-4">200 - 499</td>
                                <td className="py-3 px-4">2.0x</td>
                                <td className="py-3 px-4 text-gray-600">Higher reward share</td>
                            </tr>
                            <tr>
                                <td className="py-3 px-4"><span className="px-2 py-1 bg-yellow-100 rounded text-yellow-700">Oracle</span></td>
                                <td className="py-3 px-4">500+</td>
                                <td className="py-3 px-4">2.5x</td>
                                <td className="py-3 px-4 text-gray-600">Maximum benefits</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}


function IntegrationSection() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Integration Guide</h1>
                <p className="text-lg text-gray-600">
                    How to integrate your application with Alethea Oracle Network.
                </p>
            </div>

            {/* Prerequisites */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-blue-900 mb-3">Prerequisites</h2>
                <ul className="space-y-2 text-blue-800">
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        Linera SDK installed and configured
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        Oracle Registry v2 Application ID
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        Oracle Registry Chain ID
                    </li>
                </ul>
            </div>

            {/* Step 1: Add Dependency */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Add Dependency</h2>
                <p className="text-gray-600 mb-4">Add the oracle-registry-v2 crate to your Cargo.toml:</p>
                <CodeBlock code={`[dependencies]
oracle-registry-v2 = { path = "../oracle-registry-v2" }
linera-sdk = { version = "0.12" }`} />
            </div>

            {/* Step 2: Store Registry Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 2: Store Registry Info</h2>
                <p className="text-gray-600 mb-4">Store the Oracle Registry application ID during instantiation:</p>
                <CodeBlock code={`// In your contract state
pub struct MyAppState {
    pub registry_app_id: RegisterView<Option<ApplicationId>>,
    pub registry_chain_id: RegisterView<Option<ChainId>>,
}

// During instantiation
async fn instantiate(&mut self, args: InstantiationArgument) {
    self.state.registry_app_id.set(Some(args.registry_app_id));
    self.state.registry_chain_id.set(Some(args.registry_chain_id));
}`} />
            </div>

            {/* Step 3: Create Query */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 3: Create Query with Callback</h2>
                <p className="text-gray-600 mb-4">Call the Oracle Registry to create a query:</p>
                <CodeBlock code={`async fn request_oracle_resolution(&mut self, question: String, data_id: u64) {
    let registry_app_id = self.state.registry_app_id.get()
        .expect("Registry not configured");
    
    // Prepare callback data (your app's reference ID)
    let callback_data = data_id.to_le_bytes().to_vec();
    
    // Create the oracle query
    let operation = oracle_registry_v2::Operation::CreateQueryWithCallback {
        description: question,
        outcomes: vec!["Yes".to_string(), "No".to_string()],
        strategy: oracle_registry_v2::state::DecisionStrategy::Majority,
        min_votes: None,
        reward_amount: Amount::ZERO,
        deadline: None,
        callback_chain: self.runtime.chain_id(),
        callback_app: self.runtime.application_id().forget_abi(),
        callback_data,
    };
    
    // Cross-application call
    let registry_typed = registry_app_id.with_abi::<OracleRegistryV2Abi>();
    let response = self.runtime.call_application(true, registry_typed, &operation);
    
    if !response.success {
        panic!("Failed to create oracle query: {}", response.message);
    }
}`} />
            </div>

            {/* Step 4: Handle Callback */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 4: Handle Resolution Callback</h2>
                <p className="text-gray-600 mb-4">Implement the message handler for the callback:</p>
                <CodeBlock code={`// Define your message type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    QueryResolutionCallback {
        query_id: u64,
        resolved_outcome: String,
        resolved_at: Timestamp,
        callback_data: Vec<u8>,
    },
}

// Handle the callback
async fn execute_message(&mut self, message: Message) {
    match message {
        Message::QueryResolutionCallback { 
            query_id, 
            resolved_outcome, 
            resolved_at, 
            callback_data 
        } => {
            // Extract your reference ID from callback_data
            let data_id = u64::from_le_bytes(
                callback_data[..8].try_into().unwrap()
            );
            
            // Process the resolution
            self.handle_resolution(data_id, resolved_outcome, resolved_at).await;
        }
    }
}`} />
            </div>

            {/* Important Notes */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-amber-900 mb-3">Important Notes</h2>
                <ul className="space-y-2 text-amber-800">
                    <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-1 text-amber-600" />
                        <span>The callback is sent automatically when the query is resolved</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-1 text-amber-600" />
                        <span>Linera guarantees message delivery - callbacks are reliable</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-1 text-amber-600" />
                        <span>Use callback_data to store your app's reference (e.g., market_id)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-1 text-amber-600" />
                        <span>Cross-app calls are synchronous and atomic within the same transaction</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}

function ApiSection() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">API Reference</h1>
                <p className="text-lg text-gray-600">
                    GraphQL API endpoints for interacting with Alethea Oracle Network.
                </p>
            </div>

            {/* Endpoint */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">GraphQL Endpoint</h2>
                <CodeBlock code={`POST /chains/{chain_id}/applications/{app_id}
Content-Type: application/json

{
  "query": "{ ... }",
  "variables": { ... }
}`} />
            </div>

            {/* Queries */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Queries</h2>

                <div className="space-y-6">
                    <ApiEndpoint
                        name="statistics"
                        description="Get network statistics"
                        query={`query {
  statistics {
    totalVoters
    activeVoters
    totalStake
    totalQueriesCreated
    totalQueriesResolved
  }
}`}
                    />

                    <ApiEndpoint
                        name="voters"
                        description="List registered voters"
                        query={`query {
  voters(limit: 50, offset: 0, activeOnly: true) {
    address
    stake
    reputation
    reputationTier
    totalVotes
    correctVotes
    isActive
  }
}`}
                    />

                    <ApiEndpoint
                        name="queries"
                        description="List oracle queries"
                        query={`query {
  queries {
    id
    description
    outcomes
    status
    deadline
    commitEnd
    revealEnd
    voteCount
    result
  }
}`}
                    />

                    <ApiEndpoint
                        name="voterProfile"
                        description="Get specific voter profile"
                        query={`query {
  voterProfile(address: "0x...") {
    address
    stake
    lockedStake
    reputation
    reputationTier
    totalVotes
    correctVotes
  }
}`}
                    />
                </div>
            </div>

            {/* Mutations */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Mutations</h2>

                <div className="space-y-6">
                    <ApiEndpoint
                        name="registerVoter"
                        description="Register as a voter (requires WASM)"
                        query={`mutation {
  sendRegisterVoterMessage(
    targetChain: "chain_id",
    stake: "100",
    name: "MyVoter"
  )
}`}
                    />

                    <ApiEndpoint
                        name="commitVote"
                        description="Submit vote commitment"
                        query={`mutation {
  commitVote(
    queryId: 1,
    commitment: "0x..."
  )
}`}
                    />

                    <ApiEndpoint
                        name="revealVote"
                        description="Reveal committed vote"
                        query={`mutation {
  revealVote(
    queryId: 1,
    outcome: "Yes",
    salt: "random_salt"
  )
}`}
                    />
                </div>
            </div>
        </div>
    );
}

// Helper Components
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                {icon}
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
        </div>
    );
}

function StepCard({ step, title, description, code }: { step: number; title: string; description: string; code: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {step}
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                    <p className="text-gray-600 mb-4">{description}</p>
                    <CodeBlock code={code} />
                </div>
            </div>
        </div>
    );
}

function PhaseCard({ phase, duration, color, description, actions }: {
    phase: string;
    duration: string;
    color: 'blue' | 'yellow' | 'green';
    description: string;
    actions: string[];
}) {
    const colors = {
        blue: 'bg-blue-50 border-blue-200 text-blue-900',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
        green: 'bg-green-50 border-green-200 text-green-900',
    };

    return (
        <div className={`rounded-xl border p-5 ${colors[color]}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{phase} Phase</h3>
                <span className="text-xs px-2 py-1 bg-white/50 rounded">{duration}</span>
            </div>
            <p className="text-sm mb-3 opacity-80">{description}</p>
            <ul className="space-y-1">
                {actions.map((action, i) => (
                    <li key={i} className="text-xs flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        {action}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function StrategyCard({ name, description, formula }: { name: string; description: string; formula: string }) {
    return (
        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                <Shield className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{name}</h3>
                <p className="text-sm text-gray-600 mb-2">{description}</p>
                <code className="text-xs bg-gray-200 px-2 py-1 rounded">{formula}</code>
            </div>
        </div>
    );
}

function CodeBlock({ code }: { code: string }) {
    return (
        <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre">{code}</pre>
        </div>
    );
}

function ApiEndpoint({ name, description, query }: { name: string; description: string; query: string }) {
    return (
        <div className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
            <div className="flex items-center gap-2 mb-2">
                <code className="text-sm font-semibold text-blue-600">{name}</code>
                <span className="text-sm text-gray-500">— {description}</span>
            </div>
            <CodeBlock code={query} />
        </div>
    );
}
