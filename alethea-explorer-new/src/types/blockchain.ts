// Alethea Network Types

// Linera Block Types
export interface BlockHeader {
  height: number;
  timestamp: number;
  chainId: string;
  epoch: string;
  stateHash?: string;
  previousBlockHash?: string;
  authenticatedSigner?: string;
}

export interface OutgoingMessage {
  destination: string;
  kind: string;
  grant: string;
  message: any;
}

export interface BlockEvent {
  index: number;
  value: any;
  streamId: {
    applicationId: string;
    streamName: number[] | string;
  };
}

export interface BlockBody {
  messages: OutgoingMessage[][];
  events: BlockEvent[][];
  oracleResponses: any[][];
  operationResults: any[][];
}

export interface BlockInfo {
  hash: string;
  status: string;
  block: {
    header: BlockHeader;
    body?: BlockBody;
  };
}

// Alethea Registry Types
export interface Query {
  id: number;
  description: string;
  title?: string;
  category?: string;
  outcomes: string[];
  status: 'Active' | 'Commit' | 'Reveal' | 'Resolved';
  phase?: string;
  strategy: string;
  minVotes: number;
  rewardAmount: string;
  deadline?: string;
  commitEnd?: string;
  revealEnd?: string;
  voteCount: number;
  commitCount?: number;
  result?: string;
  resolvedAt?: string;
  creator?: string;
  createdAt?: string;
  timeRemaining?: string;
  votes?: Vote[];
}

export interface Vote {
  voter: string;
  outcome: number;
  stake: string;
  timestamp: string;
}

export interface Voter {
  address: string;
  name?: string;
  stake: string;
  lockedStake?: string;
  availableStake?: string;
  pendingRewards: string;
  reputation?: string;
  reputationTier?: string;
  totalVotes: number;
  correctVotes: number;
  accuracyPercentage?: number;
  isActive?: boolean;
  registeredAt?: string;
}

// Alethea Token Types
export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  rewardPool?: string;
}

export interface TokenHolder {
  owner: string;
  balance: string;
}

// Statistics
export interface Statistics {
  totalVoters: number;
  activeVoters: number;
  totalStake: string;
  totalQueriesCreated: number;
  totalQueriesResolved: number;
  activeQueriesCount: number;
  totalVotesSubmitted: number;
  totalRewardsDistributed: string;
  rewardPoolBalance: string;
  averageReputation: number;
  protocolStatus: string;
}

// Health Status
export interface HealthStatus {
  status: string;
  timestamp: string;
  network: string;
  chainId: string;
  connected: boolean;
  error?: string;
}
