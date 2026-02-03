import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Book, ChevronRight, Code, Zap, Shield, ArrowRight, CheckCircle, Clock, Users, MessageSquare, Menu, X } from 'lucide-react';

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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Default to 'overview' if no section specified
    const activeSection = (section as DocSection) || 'overview';

    // Validate section and redirect if invalid
    useEffect(() => {
        const validSections = sections.map(s => s.id);
        if (section && !validSections.includes(section)) {
            navigate('/docs/overview', { replace: true });
        }
    }, [section, navigate]);

    // Close mobile menu when section changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [activeSection]);

    return (
        <div className="min-h-screen">
            {/* Mobile Header */}
            <div className="lg:hidden mb-4">
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200"
                >
                    <div className="flex items-center gap-2">
                        <Book className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900">
                            {sections.find(s => s.id === activeSection)?.label || 'Documentation'}
                        </span>
                    </div>
                    {mobileMenuOpen ? (
                        <X className="w-5 h-5 text-gray-600" />
                    ) : (
                        <Menu className="w-5 h-5 text-gray-600" />
                    )}
                </button>
                
                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="mt-2 bg-white rounded-xl border border-gray-200 p-2 shadow-lg">
                        <nav className="space-y-1">
                            {sections.map((sec) => {
                                const Icon = sec.icon;
                                return (
                                    <Link
                                        key={sec.id}
                                        to={`/docs/${sec.id}`}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${activeSection === sec.id
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
                )}
            </div>

            <div className="flex gap-6 lg:gap-8">
                {/* Desktop Sidebar */}
                <div className="hidden lg:block w-64 flex-shrink-0">
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
        <div className="space-y-6 sm:space-y-8">
            <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Alethea Network Documentation</h1>
                <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-3 sm:mb-4">
                    Alethea Network is a <strong>production-ready decentralized oracle protocol</strong> built on Linera's microchain architecture.
                </p>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-green-800 font-medium">
                        🎉 <strong>FULLY FUNCTIONAL:</strong> All systems operational with real ALTH token integration.
                    </p>
                </div>
            </div>

            {/* Current Deployment */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6">
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-green-900 mb-2 sm:mb-3">🚀 v3.4.0 Conway Testnet</h2>
                <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm font-mono">
                    <div className="flex flex-col">
                        <span className="text-green-600">Network:</span>
                        <span className="text-green-800">Conway Testnet</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-green-600">Chain ID:</span>
                        <span className="text-green-800 break-all text-[10px] sm:text-xs">9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-green-600">Registry App ID:</span>
                        <span className="text-green-800 break-all text-[10px] sm:text-xs">f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-green-600">ALTH Token:</span>
                        <span className="text-green-800 break-all text-[10px] sm:text-xs">dac6b92743e8f02acd8367b75aef1dba6e91618c1c4fb863b73b87ec55a33ddd</span>
                    </div>
                </div>
                <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-green-100 rounded-lg">
                    <p className="text-xs sm:text-sm text-green-800 font-medium">✅ v3.4.0 Features:</p>
                    <ul className="text-[10px] sm:text-xs text-green-700 mt-1 space-y-0.5 sm:space-y-1">
                        <li>• Decreasing Inflation & Service Fee</li>
                        <li>• Linera Standard Token (1M ALTH)</li>
                        <li>• Faucet: 1,000 ALTH/request</li>
                        <li>• Cross-chain WASM transfers</li>
                    </ul>
                </div>
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FeatureCard
                    icon={<Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />}
                    title="Linera Standard Token"
                    description="Official Linera fungible token standard with owner-based accounts."
                />
                <FeatureCard
                    icon={<Zap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />}
                    title="Cross-Chain Transfers"
                    description="WASM-signed transfers with automatic processInbox."
                />
                <FeatureCard
                    icon={<Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />}
                    title="Token Faucet"
                    description="Request 1,000 ALTH tokens with 24h cooldown."
                />
                <FeatureCard
                    icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />}
                    title="Production Ready"
                    description="All systems operational with secure messaging."
                />
            </div>

            {/* Stake Locking Mechanism */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Stake Locking</h2>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                    10% of available stake is locked as collateral when voting.
                </p>
                <div className="bg-slate-900 rounded-lg p-3 sm:p-4 text-[10px] sm:text-xs md:text-sm font-mono text-gray-300 mb-3 sm:mb-4 overflow-x-auto">
                    <pre>{`stake_to_lock = available_stake / 10`}</pre>
                </div>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full text-xs sm:text-sm min-w-[300px]">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-900">Aspect</th>
                                <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-gray-900">Impact</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-gray-700">Power</td>
                                <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-gray-600">stake × rep = influence</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-gray-700">Rewards</td>
                                <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-gray-600">Proportional to stake</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-gray-700">Slashing</td>
                                <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-gray-600">5% if incorrect</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Architecture Overview */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Architecture</h2>
                <div className="bg-slate-900 rounded-lg p-3 sm:p-4 md:p-6 text-[8px] sm:text-xs md:text-sm font-mono text-gray-300 overflow-x-auto">
                    <pre className="whitespace-pre">{`┌───────────────────────────────┐
│      Alethea Network          │
├───────────────────────────────┤
│ Voter Chain ←→ Oracle Registry│
│      ↓              ↓         │
│  Dashboard      Market/DApp   │
└───────────────────────────────┘`}</pre>
                </div>
            </div>

            {/* Production Status Summary */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4 sm:p-6">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-green-900 mb-3 sm:mb-4">🚀 Production Status</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2 sm:space-y-3">
                        <h3 className="text-sm sm:text-base font-semibold text-green-800">✅ Features</h3>
                        <ul className="text-[10px] sm:text-xs md:text-sm text-green-700 space-y-0.5 sm:space-y-1">
                            <li>• Linera Standard Token</li>
                            <li>• Token Faucet</li>
                            <li>• Cross-chain transfers</li>
                            <li>• Commit-reveal voting</li>
                        </ul>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                        <h3 className="text-sm sm:text-base font-semibold text-green-800">🎯 Token</h3>
                        <ul className="text-[10px] sm:text-xs md:text-sm text-green-700 space-y-0.5 sm:space-y-1">
                            <li>• <strong>Symbol:</strong> ALTH</li>
                            <li>• <strong>Supply:</strong> 1,000,000</li>
                            <li>• <strong>Standard:</strong> Linera</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}


function QualityAssuranceSection() {
    return (
        <div className="space-y-6 sm:space-y-8">
            <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Quality Assurance</h1>
                <p className="text-sm sm:text-base md:text-lg text-gray-600">
                    How Alethea Network ensures accurate oracle responses through security and economic incentives.
                </p>
            </div>

            {/* Why Quality Matters */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6">
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-blue-900 mb-2 sm:mb-3">Why Quality Matters</h2>
                <p className="text-xs sm:text-sm text-blue-800 mb-3 sm:mb-4">
                    Oracle data directly affects financial outcomes. Incorrect responses can lead to:
                </p>
                <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-blue-800">
                    <li className="flex items-center gap-2">
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                        <span>Incorrect market settlements</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                        <span>Wrongful insurance payouts</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                        <span>Loss of user funds and trust</span>
                    </li>
                </ul>
            </div>

            {/* Core Mechanisms */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Core Quality Mechanisms</h2>

                <div className="space-y-4 sm:space-y-6">
                    {/* 1. Commit-Reveal */}
                    <div className="border-l-2 sm:border-l-4 border-blue-500 pl-3 sm:pl-4">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2">1. Commit-Reveal Voting</h3>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                            Prevents vote copying by hiding votes until reveal.
                        </p>
                        <div className="bg-slate-900 rounded-lg p-2.5 sm:p-4 text-[10px] sm:text-xs md:text-sm font-mono text-gray-300 mb-2 sm:mb-3 overflow-x-auto">
                            <pre>{`// Commit: commitment = hash(outcome + salt)
// Reveal: verify hash matches`}</pre>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 text-[10px] sm:text-xs md:text-sm">
                            <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
                                <span className="font-medium text-green-700">✓ Prevents</span>
                                <ul className="text-green-600 mt-1 space-y-0.5">
                                    <li>• Vote copying</li>
                                    <li>• Front-running</li>
                                </ul>
                            </div>
                            <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
                                <span className="font-medium text-blue-700">✓ Ensures</span>
                                <ul className="text-blue-600 mt-1 space-y-0.5">
                                    <li>• Fair voting</li>
                                    <li>• Honesty</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* 2. Economic Security */}
                    <div className="border-l-2 sm:border-l-4 border-red-500 pl-3 sm:pl-4">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2">2. Economic Security</h3>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                            Incorrect votes result in stake slashing.
                        </p>
                        <div className="bg-slate-900 rounded-lg p-2.5 sm:p-4 text-[10px] sm:text-xs md:text-sm font-mono text-gray-300 mb-2 sm:mb-3 overflow-x-auto">
                            <pre>{`locked = stake / 10  // 10% collateral
slash = stake * 0.05 // 5% if wrong`}</pre>
                        </div>
                        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                            <table className="w-full text-[10px] sm:text-xs md:text-sm min-w-[250px]">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-1.5 sm:py-2 px-2 font-semibold text-gray-900">Stake</th>
                                        <th className="text-left py-1.5 sm:py-2 px-2 font-semibold text-gray-900">Lock</th>
                                        <th className="text-left py-1.5 sm:py-2 px-2 font-semibold text-gray-900 text-red-600">Slash</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-1.5 sm:py-2 px-2">100</td>
                                        <td className="py-1.5 sm:py-2 px-2">10</td>
                                        <td className="py-1.5 sm:py-2 px-2 text-red-600">5</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-1.5 sm:py-2 px-2">1K</td>
                                        <td className="py-1.5 sm:py-2 px-2">100</td>
                                        <td className="py-1.5 sm:py-2 px-2 text-red-600">50</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 sm:py-2 px-2">10K</td>
                                        <td className="py-1.5 sm:py-2 px-2">1K</td>
                                        <td className="py-1.5 sm:py-2 px-2 text-red-600">500</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 3. Reputation System */}
                    <div className="border-l-2 sm:border-l-4 border-purple-500 pl-3 sm:pl-4">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2">3. Reputation System</h3>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                            Accuracy builds voting power over time.
                        </p>
                        <div className="bg-slate-900 rounded-lg p-2.5 sm:p-4 text-[10px] sm:text-xs md:text-sm font-mono text-gray-300 mb-2 sm:mb-3 overflow-x-auto">
                            <pre>{`multiplier = 0.5 + (rep/100) * 1.5
power = stake × multiplier`}</pre>
                        </div>
                        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                            <table className="w-full text-[10px] sm:text-xs md:text-sm min-w-[200px]">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-1.5 sm:py-2 px-2 font-semibold text-gray-900">Tier</th>
                                        <th className="text-left py-1.5 sm:py-2 px-2 font-semibold text-gray-900">Rep</th>
                                        <th className="text-left py-1.5 sm:py-2 px-2 font-semibold text-gray-900">Multi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-1.5 sm:py-2 px-2"><span className="px-1.5 py-0.5 text-[9px] sm:text-xs bg-gray-100 rounded">Novice</span></td>
                                        <td className="py-1.5 sm:py-2 px-2">0-40</td>
                                        <td className="py-1.5 sm:py-2 px-2">0.5-1.1x</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-1.5 sm:py-2 px-2"><span className="px-1.5 py-0.5 text-[9px] sm:text-xs bg-blue-100 rounded text-blue-700">Inter</span></td>
                                        <td className="py-1.5 sm:py-2 px-2">41-70</td>
                                        <td className="py-1.5 sm:py-2 px-2">1.1-1.55x</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-1.5 sm:py-2 px-2"><span className="px-1.5 py-0.5 text-[9px] sm:text-xs bg-green-100 rounded text-green-700">Expert</span></td>
                                        <td className="py-1.5 sm:py-2 px-2">71-90</td>
                                        <td className="py-1.5 sm:py-2 px-2">1.55-1.85x</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 sm:py-2 px-2"><span className="px-1.5 py-0.5 text-[9px] sm:text-xs bg-purple-100 rounded text-purple-700">Master</span></td>
                                        <td className="py-1.5 sm:py-2 px-2">91-100</td>
                                        <td className="py-1.5 sm:py-2 px-2">1.85-2x</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 4. Consensus Strategies */}
                    <div className="border-l-2 sm:border-l-4 border-green-500 pl-3 sm:pl-4">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2">4. Consensus Strategies</h3>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                            Different mechanisms for different needs.
                        </p>
                        <div className="space-y-2 sm:space-y-3">
                            <div className="bg-gray-50 p-2.5 sm:p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs sm:text-sm font-semibold text-gray-900">Majority</span>
                                    <span className="text-[9px] sm:text-xs px-1.5 py-0.5 bg-gray-200 rounded">Default</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-600">&gt;50% wins</p>
                            </div>
                            <div className="bg-gray-50 p-2.5 sm:p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs sm:text-sm font-semibold text-gray-900">Supermajority</span>
                                    <span className="text-[9px] sm:text-xs px-1.5 py-0.5 bg-yellow-200 rounded">High Stakes</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-600">&gt;66.67% required</p>
                            </div>
                            <div className="bg-gray-50 p-2.5 sm:p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs sm:text-sm font-semibold text-gray-900">Weighted</span>
                                    <span className="text-[9px] sm:text-xs px-1.5 py-0.5 bg-blue-200 rounded">Recommended</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-600">stake × reputation weight</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Query Best Practices */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Query Best Practices</h2>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                    Well-formed queries lead to accurate results.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-green-800 mb-2 sm:mb-3">✓ Good Queries</h3>
                        <ul className="space-y-1 sm:space-y-2 text-[10px] sm:text-xs md:text-sm text-green-700">
                            <li>• Verifiable facts</li>
                            <li>• Specific timeframe</li>
                            <li>• Clear outcomes</li>
                            <li>• Past events</li>
                        </ul>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-red-800 mb-2 sm:mb-3">✗ Bad Queries</h3>
                        <ul className="space-y-1 sm:space-y-2 text-[10px] sm:text-xs md:text-sm text-red-700">
                            <li>• Predictions</li>
                            <li>• Subjective</li>
                            <li>• Ambiguous</li>
                            <li>• Unverifiable</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Attack Resistance */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Attack Resistance</h2>

                <div className="space-y-2 sm:space-y-4">
                    <div className="flex items-start gap-2 sm:gap-4 p-2.5 sm:p-4 bg-gray-50 rounded-lg">
                        <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Sybil Attack</h3>
                            <p className="text-[10px] sm:text-xs text-green-600">✓ Stake requirement prevents fake voters</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-4 p-2.5 sm:p-4 bg-gray-50 rounded-lg">
                        <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Bribery</h3>
                            <p className="text-[10px] sm:text-xs text-green-600">✓ Commit-reveal + slashing risk</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-4 p-2.5 sm:p-4 bg-gray-50 rounded-lg">
                        <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Collusion</h3>
                            <p className="text-[10px] sm:text-xs text-green-600">✓ Need majority stake + reputation cost</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-4 p-2.5 sm:p-4 bg-gray-50 rounded-lg">
                        <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Front-Running</h3>
                            <p className="text-[10px] sm:text-xs text-green-600">✓ Votes hidden until reveal phase</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


function MarketFlowSection() {
    return (
        <div className="space-y-6 sm:space-y-8">
            <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Market → Oracle Flow</h1>
                <p className="text-sm sm:text-base md:text-lg text-gray-600">
                    How prediction markets integrate with Alethea Oracle for decentralized resolution.
                </p>
            </div>

            {/* Flow Diagram - Simplified for mobile */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Flow Diagram</h2>
                
                {/* Mobile-friendly visual flow */}
                <div className="space-y-3 sm:hidden">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="text-xs font-bold text-blue-800 mb-1">1. Create Market</div>
                        <p className="text-[10px] text-blue-700">User creates prediction market</p>
                    </div>
                    <div className="flex justify-center"><span className="text-gray-400">↓</span></div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="text-xs font-bold text-amber-800 mb-1">2. Request Resolution</div>
                        <p className="text-[10px] text-amber-700">Market → Oracle Registry</p>
                    </div>
                    <div className="flex justify-center"><span className="text-gray-400">↓</span></div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="text-xs font-bold text-purple-800 mb-1">3. Oracle Voting</div>
                        <p className="text-[10px] text-purple-700">Commit → Reveal → Resolution</p>
                    </div>
                    <div className="flex justify-center"><span className="text-gray-400">↓</span></div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="text-xs font-bold text-green-800 mb-1">4. Callback</div>
                        <p className="text-[10px] text-green-700">Oracle → Market (result)</p>
                    </div>
                    <div className="flex justify-center"><span className="text-gray-400">↓</span></div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <div className="text-xs font-bold text-emerald-800 mb-1">5. Payout</div>
                        <p className="text-[10px] text-emerald-700">Winners claim rewards</p>
                    </div>
                </div>

                {/* Desktop ASCII diagram */}
                <div className="hidden sm:block bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-3 sm:p-4 md:p-6 text-[9px] sm:text-xs md:text-sm font-mono text-gray-300 overflow-x-auto">
                    <pre className="whitespace-pre">{`MARKET → ORACLE FLOW
════════════════════

1. CREATE MARKET
   User → Market Contract
   Status: OPEN

2. REQUEST RESOLUTION  
   Market → Oracle Registry
   Status: VOTING

3. ORACLE VOTING
   ┌─────────────┐
   │   COMMIT    │ → hash(vote)
   └─────────────┘
         ↓
   ┌─────────────┐
   │   REVEAL    │ → verify
   └─────────────┘
         ↓
   ┌─────────────┐
   │  RESOLVED   │ → consensus
   └─────────────┘

4. CALLBACK
   Oracle → Market (result)
   Status: RESOLVED

5. PAYOUT
   Winners claim rewards`}</pre>
                </div>
            </div>

            {/* Step by Step */}
            <div className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">Step-by-Step</h2>

                <StepCard
                    step={1}
                    title="Market Creation"
                    description="Create a prediction market with question and end time."
                    code={`CreateMarket { question, end_time }`}
                />

                <StepCard
                    step={2}
                    title="Request Resolution"
                    description="Market calls Oracle Registry for resolution."
                    code={`CreateQueryWithCallback {
  outcomes: ["Yes", "No"],
  callback_chain, callback_data
}`}
                />

                <StepCard
                    step={3}
                    title="Oracle Voting"
                    description="Voters commit hash, then reveal vote."
                    code={`CommitVote { commitment: hash }
RevealVote { outcome, salt }`}
                />

                <StepCard
                    step={4}
                    title="Callback"
                    description="Oracle sends result to market."
                    code={`QueryResolutionCallback {
  resolved_outcome: "Yes"
}`}
                />

                <StepCard
                    step={5}
                    title="Payout"
                    description="Winners claim proportional rewards."
                    code={`ClaimPayout { market_id }
payout = stake * total / winning`}
                />
            </div>
        </div>
    );
}

function OracleFlowSection() {
    return (
        <div className="space-y-6 sm:space-y-8">
            <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Oracle Resolution</h1>
                <p className="text-sm sm:text-base md:text-lg text-gray-600">
                    How queries are resolved through decentralized voting.
                </p>
            </div>

            {/* Voting Phases */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Commit-Reveal Voting</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Consensus Strategies</h2>

                <div className="space-y-3 sm:space-y-4">
                    <StrategyCard
                        name="Majority"
                        description="Simple majority wins (>50%)."
                        formula="winner = outcome > 50%"
                    />
                    <StrategyCard
                        name="Supermajority"
                        description="Requires 2/3 majority (>66.67%)."
                        formula="winner = outcome > 66.67%"
                    />
                    <StrategyCard
                        name="Weighted"
                        description="Weighted by stake and reputation."
                        formula="weight = stake × rep_multiplier"
                    />
                </div>
            </div>

            {/* Reputation System */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Reputation System</h2>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                    Weight multiplier = 0.5 + (reputation/100) × 1.5
                </p>

                <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full text-xs sm:text-sm min-w-[300px]">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-900">Tier</th>
                                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-900">Rep</th>
                                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-900">Weight</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 sm:py-3 px-2 sm:px-4"><span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-gray-100 rounded text-gray-700">Novice</span></td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4">0-40</td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4">0.5-1.1x</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 sm:py-3 px-2 sm:px-4"><span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-blue-100 rounded text-blue-700">Inter</span></td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4">41-70</td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4">1.1-1.55x</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 sm:py-3 px-2 sm:px-4"><span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-green-100 rounded text-green-700">Expert</span></td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4">71-90</td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4">1.55-1.85x</td>
                            </tr>
                            <tr>
                                <td className="py-2 sm:py-3 px-2 sm:px-4"><span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-purple-100 rounded text-purple-700">Master</span></td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4">91-100</td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4">1.85-2.0x</td>
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
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
            <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">Integration Guide</h1>
                <p className="text-xs sm:text-sm md:text-base text-gray-600">
                    Integrate with Alethea Oracle Network.
                </p>
            </div>

            {/* Prerequisites */}
            <div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6">
                <h2 className="text-xs sm:text-sm md:text-base font-semibold text-green-900 mb-2 sm:mb-3">Prerequisites</h2>
                <ul className="space-y-1 sm:space-y-2 text-[10px] sm:text-xs md:text-sm text-green-800">
                    <li className="flex items-start gap-1.5 sm:gap-2">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Linera SDK 0.15.6 + Rust 1.86</span>
                    </li>
                    <li className="flex items-start gap-1.5 sm:gap-2">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="break-all">Registry: f51da82d...</span>
                    </li>
                    <li className="flex items-start gap-1.5 sm:gap-2">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="break-all">Chain: 9d0d233f...</span>
                    </li>
                </ul>
            </div>

            {/* Step 1: Add Dependency */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 md:p-6">
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Step 1: Add Dependency</h2>
                <p className="text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3">Add oracle-registry-v2 crate:</p>
                <CodeBlock code={`[dependencies]
oracle-registry-v2 = { path = ".." }
linera-sdk = "0.15.6"`} />
            </div>

            {/* Step 2: Store Registry Info */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 md:p-6">
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Step 2: Store Registry</h2>
                <p className="text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3">Save Registry ID during init:</p>
                <CodeBlock code={`pub struct MyAppState {
  registry_app_id: Option<AppId>,
}

// instantiate()
state.registry_app_id = Some(args.id);`} />
            </div>

            {/* Step 3: Create Query */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 md:p-6">
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Step 3: Create Query</h2>
                <p className="text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3">Call Registry to create query:</p>
                <CodeBlock code={`let op = CreateQueryWithCallback {
  description: question,
  outcomes: vec!["Yes", "No"],
  strategy: Majority,
  callback_chain: self.chain_id(),
  callback_app: self.app_id(),
  callback_data: id.to_bytes(),
};
runtime.call_application(registry, &op);`} />
            </div>

            {/* Step 4: Handle Callback */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 md:p-6">
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Step 4: Handle Callback</h2>
                <p className="text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3">Implement callback handler:</p>
                <CodeBlock code={`enum Message {
  QueryResolutionCallback {
    query_id: u64,
    resolved_outcome: String,
    callback_data: Vec<u8>,
  },
}

// execute_message()
match message {
  Callback { outcome, data } => {
    let id = u64::from_bytes(data);
    handle_result(id, outcome);
  }
}`} />
            </div>

            {/* Important Notes */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6">
                <h2 className="text-xs sm:text-sm md:text-base font-semibold text-amber-900 mb-2 sm:mb-3">Notes</h2>
                <ul className="space-y-1 sm:space-y-2 text-[10px] sm:text-xs md:text-sm text-amber-800">
                    <li className="flex items-start gap-1.5 sm:gap-2">
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                        <span>Auto callback on resolution</span>
                    </li>
                    <li className="flex items-start gap-1.5 sm:gap-2">
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                        <span>Linera guarantees delivery</span>
                    </li>
                    <li className="flex items-start gap-1.5 sm:gap-2">
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                        <span>Use callback_data for ref ID</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}

function ApiSection() {
    return (
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
            <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">API Reference</h1>
                <p className="text-xs sm:text-sm md:text-base text-gray-600">
                    GraphQL API for Alethea Oracle.
                </p>
            </div>

            {/* Endpoint */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 md:p-6">
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">Endpoints</h2>
                <CodeBlock code={`# Registry
POST /chains/{CHAIN}/apps/{REGISTRY}

# Token (query on USER chain)
POST /chains/{USER_CHAIN}/apps/{TOKEN}

# Process Inbox
mutation { processInbox(chainId) }

# Token Query
{ accounts { entry(key: "0x..") } }

# Token Transfer  
mutation { transfer(owner, amount,
  targetAccount: { chainId, owner })
}`} />
            </div>

            {/* Queries */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 md:p-6">
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">Queries</h2>

                <div className="space-y-3 sm:space-y-4 md:space-y-6">
                    <ApiEndpoint
                        name="statistics"
                        description="Network stats"
                        query={`{ statistics {
  totalVoters, activeVoters,
  totalStake, totalQueries
}}`}
                    />

                    <ApiEndpoint
                        name="voters"
                        description="List voters"
                        query={`{ voters {
  address, stake, reputation,
  totalVotes, isActive
}}`}
                    />

                    <ApiEndpoint
                        name="queries"
                        description="List queries"
                        query={`{ queries {
  id, description, outcomes,
  status, phase, voteCount
}}`}
                    />

                    <ApiEndpoint
                        name="voterProfile"
                        description="Voter profile"
                        query={`{ voterProfile(address: "0x..") {
  address, stake
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
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 md:p-6">
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">Mutations</h2>

                <div className="space-y-3 sm:space-y-4 md:space-y-6">
                    <ApiEndpoint
                        name="createQuery"
                        description="Create query"
                        query={`mutation { createQuery(
  description: "...",
  outcomes: ["Yes", "No"],
  strategy: "Majority"
)}`}
                    />

                    <ApiEndpoint
                        name="commitVote"
                        description="Submit commit"
                        query={`mutation { sendCommitVoteMessage(
  targetChain: "...",
  queryId: 1, commitHash: "..."
)}`}
                    />

                    <ApiEndpoint
                        name="revealVote"
                        description="Reveal vote"
                        query={`mutation { sendRevealVoteMessage(
  queryId: 1, value: "Yes",
  salt: "...", confidence: 80
)}`}
                    />

                    <ApiEndpoint
                        name="registerVoter"
                        description="Register voter"
                        query={`mutation { sendRegisterVoterMessage(
  stake: "100", name: "MyVoter"
)}`}
                    />
                </div>
            </div>
        </div>
    );
}

// Helper Components
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                {icon}
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2">{title}</h3>
            <p className="text-xs sm:text-sm text-gray-600">{description}</p>
        </div>
    );
}

function StepCard({ step, title, description, code }: { step: number; title: string; description: string; code: string }) {
    return (
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 md:p-6">
            <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] sm:text-xs md:text-sm font-bold flex-shrink-0">
                    {step}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm md:text-base font-semibold text-gray-900 mb-0.5 sm:mb-1">{title}</h3>
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-2 sm:mb-3">{description}</p>
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
        <div className={`rounded-xl border p-3 sm:p-5 ${colors[color]}`}>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h3 className="text-xs sm:text-sm font-semibold">{phase}</h3>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white/50 rounded">{duration}</span>
            </div>
            <p className="text-[10px] sm:text-sm mb-2 sm:mb-3 opacity-80">{description}</p>
            <ul className="space-y-0.5 sm:space-y-1">
                {actions.slice(0, 3).map((action, i) => (
                    <li key={i} className="text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2">
                        <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                        <span className="truncate">{action}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function StrategyCard({ name, description, formula }: { name: string; description: string; formula: string }) {
    return (
        <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 flex-shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">{name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">{description}</p>
                <code className="text-[10px] sm:text-xs bg-gray-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded break-all">{formula}</code>
            </div>
        </div>
    );
}

function CodeBlock({ code }: { code: string }) {
    return (
        <div className="bg-slate-900 rounded-md sm:rounded-lg p-2 sm:p-3 md:p-4 overflow-x-auto -mx-1 sm:mx-0">
            <pre className="text-[9px] sm:text-[10px] md:text-xs text-gray-300 font-mono whitespace-pre leading-relaxed">{code}</pre>
        </div>
    );
}

function ApiEndpoint({ name, description, query }: { name: string; description: string; query: string }) {
    return (
        <div className="border-b border-gray-100 pb-3 sm:pb-4 md:pb-6 last:border-0 last:pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 mb-1.5 sm:mb-2">
                <code className="text-[10px] sm:text-xs md:text-sm font-semibold text-blue-600">{name}</code>
                <span className="text-[10px] sm:text-xs text-gray-500">{description}</span>
            </div>
            <CodeBlock code={query} />
        </div>
    );
}
