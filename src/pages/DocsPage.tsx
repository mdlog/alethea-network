import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Book, ChevronRight, Code, Zap, Shield, ArrowRight, CheckCircle, Clock, Users, MessageSquare } from 'lucide-react';

type DocSection = 'overview' | 'quality' | 'market-flow' | 'oracle-flow' | 'integration' | 'api';

const sections = [
    { id: 'overview', label: 'Overview', icon: Book },
    { id: 'quality', label: 'Quality Assurance', icon: Shield },
    { id: 'market-flow', label: 'Market → Oracle Flow', icon: Zap },
    { id: 'oracle-flow', label: 'Oracle Resolution', icon: CheckCircle },
    { id: 'integration', label: 'Integration Guide', icon: Code },
    { id: 'api', label: 'API Reference', icon: MessageSquare },
];

export default function DocsPage() {
    const { section } = useParams<{ section?: string }>();
    const navigate = useNavigate();

    // Default to 'overview' if no section specified
    const activeSection = (section as DocSection) || 'overview';

    // Validate section and redirect if invalid
    useEffect(() => {
        const validSections = sections.map(s => s.id);
        if (section && !validSections.includes(section)) {
            navigate('/docs/overview', { replace: true });
        }
    }, [section, navigate]);

    return (
        <div className="min-h-screen">
            <div className="flex gap-8">
                {/* Sidebar */}
                <div className="w-64 flex-shrink-0">
                    <div className="sticky top-24 bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-900 mb-4">Documentation</h3>
                        <nav className="space-y-1">
                            {sections.map((sec) => {
                                const Icon = sec.icon;
                                return (
                                    <Link
                                        key={sec.id}
                                        to={`/docs/${sec.id}`}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${activeSection === sec.id
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="text-sm font-medium">{sec.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 max-w-4xl">
                    {activeSection === 'overview' && <OverviewSection />}
                    {activeSection === 'quality' && <QualityAssuranceSection />}
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
                <p className="text-lg text-gray-600 mb-4">
                    Alethea Network is a <strong>production-ready decentralized oracle protocol</strong> built on Linera's microchain architecture.
                    It provides secure, scalable, and community-driven truth verification for prediction markets
                    and other decentralized applications.
                </p>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium">
                        🎉 <strong>FULLY FUNCTIONAL:</strong> All systems operational with real ALTH token integration,
                        secure cross-chain messaging, and production-ready oracle operations.
                    </p>
                </div>
            </div>

            {/* Current Deployment */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-green-900 mb-3">🚀 Production Deployment (January 12, 2026) - Linera Standard Token</h2>
                <div className="grid grid-cols-1 gap-2 text-sm font-mono">
                    <div className="flex flex-col">
                        <span className="text-green-600">Chain ID:</span>
                        <span className="text-green-800 break-all">268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-green-600">Registry App ID:</span>
                        <span className="text-green-800 break-all">d12cd2baf58400307a4c77b93fba378d5cce7bdc176e94241b22800b8eba55a2</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-green-600">ALTH Token App ID (Linera Standard):</span>
                        <span className="text-green-800 break-all">aae7e265025aab0a51a82fae252970d0ad58a487662570970a628d2788c94a57</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-green-600">Treasury Owner:</span>
                        <span className="text-green-800 break-all">0x97f8b39f99b4097e4f05961d3a93539dbcd99851091809eaf7588d74123649b4</span>
                    </div>
                </div>
                <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">✅ PRODUCTION STATUS:</p>
                    <ul className="text-xs text-green-700 mt-1 space-y-1">
                        <li>• Linera Standard Fungible Token (1,000,000 ALTH supply)</li>
                        <li>• Token Faucet: 1,000 ALTH per request (24h cooldown)</li>
                        <li>• Cross-chain transfers via WASM (signed transactions)</li>
                        <li>• Automatic processInbox for receiving tokens</li>
                        <li>• Owner-based accounts (0x prefix, lowercase)</li>
                    </ul>
                </div>
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FeatureCard
                    icon={<Shield className="w-6 h-6 text-blue-600" />}
                    title="Linera Standard Token"
                    description="Using official Linera fungible token standard with owner-based accounts and per-chain balances."
                />
                <FeatureCard
                    icon={<Zap className="w-6 h-6 text-yellow-600" />}
                    title="Cross-Chain Transfers"
                    description="WASM-signed token transfers with automatic processInbox for receiving cross-chain messages."
                />
                <FeatureCard
                    icon={<Users className="w-6 h-6 text-green-600" />}
                    title="Token Faucet"
                    description="Request 1,000 ALTH tokens from treasury with 24-hour cooldown for testing."
                />
                <FeatureCard
                    icon={<Clock className="w-6 h-6 text-purple-600" />}
                    title="Production Ready"
                    description="All systems operational with real token integration and secure messaging."
                />
            </div>

            {/* Stake Locking Mechanism */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Stake Locking Mechanism</h2>
                <p className="text-gray-600 mb-4">
                    When voting, 10% of available stake is locked as collateral until query resolution.
                </p>
                <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono text-gray-300 mb-4">
                    <pre>{`stake_to_lock = available_stake / 10
available_stake = total_stake - locked_stake`}</pre>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-3 font-semibold text-gray-900">Aspect</th>
                                <th className="text-left py-2 px-3 font-semibold text-gray-900">Impact</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 px-3 text-gray-700">Voting Power</td>
                                <td className="py-2 px-3 text-gray-600">stake × reputation = influence in weighted voting</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 px-3 text-gray-700">Rewards</td>
                                <td className="py-2 px-3 text-gray-600">Proportional to stake - larger stake = larger rewards</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 px-3 text-gray-700">Slashing Risk</td>
                                <td className="py-2 px-3 text-gray-600">5% of stake slashed if vote is incorrect</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-3 text-gray-700">Participation</td>
                                <td className="py-2 px-3 text-gray-600">More stake = can vote on more queries simultaneously</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Architecture Overview */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Architecture Overview</h2>
                <div className="bg-slate-900 rounded-lg p-6 text-sm font-mono text-gray-300">
                    <pre>{`┌─────────────────────────────────────────────────────────────┐
│                    Alethea Network                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    Cross-Chain Msg   ┌─────────────────┐  │
│  │   Voter     │ ──────────────────▶  │ Oracle Registry │  │
│  │   Chain     │  CommitVote/Reveal   │    (Main)       │  │
│  │  (User's)   │ ◀──────────────────  │                 │  │
│  └─────────────┘    Stake Unlocked    └─────────────────┘  │
│        │                                      │             │
│        │ WASM Client                          │ Resolution  │
│        ▼                                      ▼             │
│  ┌─────────────┐                      ┌─────────────────┐  │
│  │   Browser   │                      │  Market/DApp    │  │
│  │  Dashboard  │                      │   (Callback)    │  │
│  └─────────────┘                      └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘`}</pre>
                </div>
            </div>

            {/* Production Status Summary */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-green-900 mb-4">🚀 Production Status Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <h3 className="font-semibold text-green-800">✅ Fully Functional Features</h3>
                        <ul className="text-sm text-green-700 space-y-1">
                            <li>• Linera Standard Fungible Token</li>
                            <li>• Token Faucet (1,000 ALTH/request)</li>
                            <li>• Cross-chain token transfers (WASM)</li>
                            <li>• Automatic processInbox</li>
                            <li>• Commit-reveal voting system</li>
                            <li>• Reputation-based rewards</li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <h3 className="font-semibold text-green-800">🎯 Token Details</h3>
                        <ul className="text-sm text-green-700 space-y-1">
                            <li>• <strong>Symbol:</strong> ALTH</li>
                            <li>• <strong>Supply:</strong> 1,000,000 tokens</li>
                            <li>• <strong>Standard:</strong> Linera Fungible</li>
                            <li>• <strong>Account Format:</strong> 0x + public key</li>
                            <li>• <strong>Balance Storage:</strong> Per-chain</li>
                            <li>• <strong>Transfer:</strong> Cross-chain messaging</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-4 p-3 bg-white/50 rounded-lg">
                    <p className="text-sm text-green-800">
                        <strong>Important:</strong> After cross-chain transfers, call <code className="bg-green-100 px-1 rounded">processInbox(chainId)</code> on the recipient chain to receive tokens.
                    </p>
                </div>
            </div>
        </div>
    );
}


function QualityAssuranceSection() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Quality Assurance</h1>
                <p className="text-lg text-gray-600">
                    How Alethea Network ensures accurate and reliable oracle responses through
                    multiple layers of security and economic incentives.
                </p>
            </div>

            {/* Why Quality Matters */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-blue-900 mb-3">Why Quality Matters</h2>
                <p className="text-blue-800 mb-4">
                    Oracle data directly affects financial outcomes. A single incorrect oracle response can lead to:
                </p>
                <ul className="space-y-2 text-blue-800">
                    <li className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-blue-600" />
                        Incorrect settlement of derivatives and prediction markets
                    </li>
                    <li className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-blue-600" />
                        Wrongful insurance claim denials or payouts
                    </li>
                    <li className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-blue-600" />
                        Loss of user funds and trust in the protocol
                    </li>
                </ul>
            </div>

            {/* Core Mechanisms */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Core Quality Mechanisms</h2>

                <div className="space-y-6">
                    {/* 1. Commit-Reveal */}
                    <div className="border-l-4 border-blue-500 pl-4">
                        <h3 className="font-semibold text-gray-900 mb-2">1. Commit-Reveal Voting</h3>
                        <p className="text-gray-600 mb-3">
                            Prevents vote copying and front-running by hiding votes until reveal phase.
                        </p>
                        <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono text-gray-300 mb-3">
                            <pre>{`// Commit Phase
commitment = keccak256(outcome + salt)
// Vote is hidden - no one can see what you voted

// Reveal Phase  
reveal(outcome, salt)
// Contract verifies: keccak256(outcome + salt) == commitment`}</pre>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-green-50 p-3 rounded-lg">
                                <span className="font-medium text-green-700">✓ Prevents</span>
                                <ul className="text-green-600 mt-1">
                                    <li>• Vote copying</li>
                                    <li>• Front-running</li>
                                    <li>• Bandwagon effect</li>
                                </ul>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <span className="font-medium text-blue-700">✓ Ensures</span>
                                <ul className="text-blue-600 mt-1">
                                    <li>• Independent voting</li>
                                    <li>• Fair participation</li>
                                    <li>• Honest opinions</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* 2. Economic Security */}
                    <div className="border-l-4 border-red-500 pl-4">
                        <h3 className="font-semibold text-gray-900 mb-2">2. Economic Security (Stake Slashing)</h3>
                        <p className="text-gray-600 mb-3">
                            Voters have "skin in the game" - incorrect votes result in financial loss.
                        </p>
                        <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono text-gray-300 mb-3">
                            <pre>{`// When voting
stake_locked = available_stake / 10  // 10% locked as collateral

// If vote is INCORRECT (differs from consensus)
slashed_amount = stake * 0.05  // 5% of total stake slashed
stake = stake - slashed_amount
reward_pool += slashed_amount  // Goes to correct voters

// If vote is CORRECT
stake_unlocked = stake_locked  // Collateral returned
rewards += proportional_share  // Earn from reward pool`}</pre>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Stake Amount</th>
                                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Locked per Vote</th>
                                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Slashing Risk</th>
                                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Max Concurrent Votes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-2 px-3">100 ALTH</td>
                                        <td className="py-2 px-3">10 ALTH</td>
                                        <td className="py-2 px-3 text-red-600">5 ALTH</td>
                                        <td className="py-2 px-3">10 votes</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-2 px-3">1,000 ALTH</td>
                                        <td className="py-2 px-3">100 ALTH</td>
                                        <td className="py-2 px-3 text-red-600">50 ALTH</td>
                                        <td className="py-2 px-3">10 votes</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3">10,000 ALTH</td>
                                        <td className="py-2 px-3">1,000 ALTH</td>
                                        <td className="py-2 px-3 text-red-600">500 ALTH</td>
                                        <td className="py-2 px-3">10 votes</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 3. Reputation System */}
                    <div className="border-l-4 border-purple-500 pl-4">
                        <h3 className="font-semibold text-gray-900 mb-2">3. Reputation System</h3>
                        <p className="text-gray-600 mb-3">
                            Track record matters - consistent accuracy builds voting power over time.
                        </p>
                        <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono text-gray-300 mb-3">
                            <pre>{`// Reputation calculation
reputation = (correct_votes / total_votes) * 100

// Weight multiplier based on reputation
weight_multiplier = 0.5 + (reputation / 100) * 1.5
// Range: 0.5x (0 rep) to 2.0x (100 rep)

// Voting power
voting_power = stake * weight_multiplier`}</pre>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Tier</th>
                                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Reputation</th>
                                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Multiplier</th>
                                        <th className="text-left py-2 px-3 font-semibold text-gray-900">Example (1000 stake)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-2 px-3"><span className="px-2 py-1 bg-gray-100 rounded text-gray-700">Novice</span></td>
                                        <td className="py-2 px-3">0 - 40</td>
                                        <td className="py-2 px-3">0.5x - 1.1x</td>
                                        <td className="py-2 px-3">500 - 1,100 power</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-2 px-3"><span className="px-2 py-1 bg-blue-100 rounded text-blue-700">Intermediate</span></td>
                                        <td className="py-2 px-3">41 - 70</td>
                                        <td className="py-2 px-3">1.1x - 1.55x</td>
                                        <td className="py-2 px-3">1,100 - 1,550 power</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-2 px-3"><span className="px-2 py-1 bg-green-100 rounded text-green-700">Expert</span></td>
                                        <td className="py-2 px-3">71 - 90</td>
                                        <td className="py-2 px-3">1.55x - 1.85x</td>
                                        <td className="py-2 px-3">1,550 - 1,850 power</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3"><span className="px-2 py-1 bg-purple-100 rounded text-purple-700">Master</span></td>
                                        <td className="py-2 px-3">91 - 100</td>
                                        <td className="py-2 px-3">1.85x - 2.0x</td>
                                        <td className="py-2 px-3">1,850 - 2,000 power</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 4. Consensus Strategies */}
                    <div className="border-l-4 border-green-500 pl-4">
                        <h3 className="font-semibold text-gray-900 mb-2">4. Flexible Consensus Strategies</h3>
                        <p className="text-gray-600 mb-3">
                            Different query types can use appropriate consensus mechanisms.
                        </p>
                        <div className="grid gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-gray-900">Majority</span>
                                    <span className="text-xs px-2 py-1 bg-gray-200 rounded">Default</span>
                                </div>
                                <p className="text-sm text-gray-600">Simple &gt;50% wins. Best for straightforward yes/no questions.</p>
                                <code className="text-xs bg-gray-200 px-2 py-1 rounded mt-2 inline-block">winner = outcome with votes &gt; 50%</code>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-gray-900">Supermajority</span>
                                    <span className="text-xs px-2 py-1 bg-yellow-200 rounded">High Stakes</span>
                                </div>
                                <p className="text-sm text-gray-600">Requires &gt;66.67% for consensus. More resistant to manipulation.</p>
                                <code className="text-xs bg-gray-200 px-2 py-1 rounded mt-2 inline-block">winner = outcome with votes &gt; 66.67%</code>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-gray-900">WeightedByStake</span>
                                    <span className="text-xs px-2 py-1 bg-blue-200 rounded">Recommended</span>
                                </div>
                                <p className="text-sm text-gray-600">Votes weighted by stake × reputation. Rewards proportional to stake.</p>
                                <code className="text-xs bg-gray-200 px-2 py-1 rounded mt-2 inline-block">weight = stake × reputation_multiplier</code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Query Best Practices */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Query Best Practices</h2>
                <p className="text-gray-600 mb-4">
                    Well-formed queries lead to more accurate results. Follow these guidelines:
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="font-semibold text-green-800 mb-3">✓ Good Queries</h3>
                        <ul className="space-y-2 text-sm text-green-700">
                            <li>• <strong>Verifiable facts</strong>: "Did BTC close above $100k on Jan 5?"</li>
                            <li>• <strong>Specific timeframe</strong>: Include exact date/time</li>
                            <li>• <strong>Clear outcomes</strong>: Yes/No or specific options</li>
                            <li>• <strong>Objective criteria</strong>: Can be verified by anyone</li>
                            <li>• <strong>Past events</strong>: Events that have already occurred</li>
                        </ul>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h3 className="font-semibold text-red-800 mb-3">✗ Bad Queries</h3>
                        <ul className="space-y-2 text-sm text-red-700">
                            <li>• <strong>Predictions</strong>: "Will BTC reach $150k by 2027?"</li>
                            <li>• <strong>Subjective</strong>: "Is Ethereum better than Solana?"</li>
                            <li>• <strong>Ambiguous</strong>: "Did the market crash?"</li>
                            <li>• <strong>No timeframe</strong>: "Did it rain in Tokyo?"</li>
                            <li>• <strong>Unverifiable</strong>: "What did CEO think about X?"</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Attack Resistance */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Attack Resistance</h2>

                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Sybil Attack</h3>
                            <p className="text-sm text-gray-600 mb-2">Creating many fake voters to manipulate results.</p>
                            <p className="text-sm text-green-600">✓ Mitigated by: Stake requirement - each voter needs real tokens</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Bribery Attack</h3>
                            <p className="text-sm text-gray-600 mb-2">Paying voters to vote a certain way.</p>
                            <p className="text-sm text-green-600">✓ Mitigated by: Commit-reveal (can't prove vote before reveal) + slashing (bribe must exceed potential loss)</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Collusion Attack</h3>
                            <p className="text-sm text-gray-600 mb-2">Group of voters coordinating to manipulate results.</p>
                            <p className="text-sm text-green-600">✓ Mitigated by: Weighted voting (need majority of stake) + reputation (long-term cost)</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Front-Running</h3>
                            <p className="text-sm text-gray-600 mb-2">Seeing others' votes and copying them.</p>
                            <p className="text-sm text-green-600">✓ Mitigated by: Commit-reveal voting - votes hidden until reveal phase</p>
                        </div>
                    </div>
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
                        duration="~50% of duration"
                        color="blue"
                        description="Voters submit hashed votes. 10% of available stake is locked as collateral."
                        actions={["Submit commitment hash", "Hash = keccak256(outcome + salt)", "Stake locked (10%)", "commitCount increases"]}
                    />
                    <PhaseCard
                        phase="Reveal"
                        duration="~50% of duration"
                        color="yellow"
                        description="Voters reveal their actual votes with the salt used in commit phase."
                        actions={["Reveal outcome + salt", "Contract verifies hash", "voteCount increases", "Vote is recorded"]}
                    />
                    <PhaseCard
                        phase="Resolution"
                        duration="Instant"
                        color="green"
                        description="Consensus calculated, rewards distributed, stake unlocked."
                        actions={["Calculate consensus", "Distribute rewards", "Unlock stake", "Send callbacks"]}
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
                <p className="text-gray-600 mb-4">
                    Reputation is calculated based on voting accuracy. Weight multiplier = 0.5 + (reputation/100) × 1.5
                </p>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Tier</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Reputation</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Weight</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Benefits</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="py-3 px-4"><span className="px-2 py-1 bg-gray-100 rounded text-gray-700">Novice</span></td>
                                <td className="py-3 px-4">0 - 40</td>
                                <td className="py-3 px-4">0.5x - 1.1x</td>
                                <td className="py-3 px-4 text-gray-600">Basic voting rights</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-3 px-4"><span className="px-2 py-1 bg-blue-100 rounded text-blue-700">Intermediate</span></td>
                                <td className="py-3 px-4">41 - 70</td>
                                <td className="py-3 px-4">1.1x - 1.55x</td>
                                <td className="py-3 px-4 text-gray-600">Increased voting weight</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-3 px-4"><span className="px-2 py-1 bg-green-100 rounded text-green-700">Expert</span></td>
                                <td className="py-3 px-4">71 - 90</td>
                                <td className="py-3 px-4">1.55x - 1.85x</td>
                                <td className="py-3 px-4 text-gray-600">Higher reward share</td>
                            </tr>
                            <tr>
                                <td className="py-3 px-4"><span className="px-2 py-1 bg-purple-100 rounded text-purple-700">Master</span></td>
                                <td className="py-3 px-4">91 - 100</td>
                                <td className="py-3 px-4">1.85x - 2.0x</td>
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
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-green-900 mb-3">Prerequisites (Production Ready)</h2>
                <ul className="space-y-2 text-green-800">
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Linera SDK 0.15.6 with Rust 1.86.0
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Registry App ID: d12cd2baf58400307a4c77b93fba378d5cce7bdc176e94241b22800b8eba55a2
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Chain ID: 268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        ALTH Token (Linera Standard): aae7e265025aab0a51a82fae252970d0ad58a487662570970a628d2788c94a57
                    </li>
                </ul>
            </div>

            {/* Step 1: Add Dependency */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Add Dependency</h2>
                <p className="text-gray-600 mb-4">Add the oracle-registry-v2 crate to your Cargo.toml:</p>
                <CodeBlock code={`[dependencies]
oracle-registry-v2 = { path = "../oracle-registry-v2" }
linera-sdk = { version = "0.15.6", default-features = false }`} />
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">GraphQL Endpoints (Production)</h2>
                <CodeBlock code={`# Registry endpoint (Production)
POST http://localhost:8080/chains/268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f/applications/d12cd2baf58400307a4c77b93fba378d5cce7bdc176e94241b22800b8eba55a2

# ALTH Token endpoint (Linera Standard Fungible Token)
# Note: Query on USER's chain for balance, not token chain
POST http://localhost:8080/chains/{USER_CHAIN_ID}/applications/aae7e265025aab0a51a82fae252970d0ad58a487662570970a628d2788c94a57

# Process Inbox (root endpoint - required after cross-chain transfers)
POST http://localhost:8080
{ "query": "mutation { processInbox(chainId: \\"{USER_CHAIN_ID}\\") }" }

Content-Type: application/json
{ "query": "{ ... }" }

# Token Query Format (owner must be lowercase with 0x prefix):
{ "query": "{ accounts { entry(key: \\"0x...\\" ) { value } } }" }

# Token Transfer Format:
{ "query": "mutation { transfer(owner: \\"0x...\\", amount: \\"100.\\", targetAccount: { chainId: \\"..\\", owner: \\"0x...\\" }) }" }`} />
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
                        description="List registered voters with stake info"
                        query={`query {
  voters {
    address
    stake
    lockedStake
    availableStake
    reputation
    reputationTier
    totalVotes
    isActive
  }
}`}
                    />

                    <ApiEndpoint
                        name="queries"
                        description="List oracle queries with voting status"
                        query={`query {
  queries {
    id
    description
    outcomes
    status
    phase
    commitCount
    voteCount
    deadline
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
    availableStake
    reputation
    reputationTier
    totalVotes
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
                        name="createQuery"
                        description="Create new oracle query (admin)"
                        query={`mutation {
  createQuery(
    description: "Did BTC close above $100,000 on January 5, 2026?",
    outcomes: ["Yes", "No"],
    strategy: "Majority",
    minVotes: 1,
    rewardAmount: "100",
    durationSecs: 3600
  )
}`}
                    />

                    <ApiEndpoint
                        name="sendCommitVoteMessage"
                        description="Submit vote commitment (via WASM)"
                        query={`mutation {
  sendCommitVoteMessage(
    targetChain: "268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f",
    queryId: 1,
    commitHash: "abc123..."
  )
}`}
                    />

                    <ApiEndpoint
                        name="sendRevealVoteMessage"
                        description="Reveal committed vote (via WASM)"
                        query={`mutation {
  sendRevealVoteMessage(
    targetChain: "268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f",
    queryId: 1,
    value: "Yes",
    salt: "random_salt",
    confidence: 80
  )
}`}
                    />

                    <ApiEndpoint
                        name="sendRegisterVoterMessage"
                        description="Register as voter (via WASM)"
                        query={`mutation {
  sendRegisterVoterMessage(
    targetChain: "268431a074359c264d23d7a84a875a0ace3a0b9a3b764d2e0f26c59c84abc85f",
    stake: "100",
    name: "MyVoter"
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
