// Voter Registration Types

/**
 * Decision strategy for automated voting
 */
export type DecisionStrategy = 'Manual' | 'AutoYes' | 'AutoNo' | 'Random';

/**
 * Data collected from the voter registration form
 */
export interface VoterRegistrationData {
    voterName?: string;
    initialStake: string;
    decisionStrategy: DecisionStrategy;
}

/**
 * Steps in the registration flow
 */
export type RegistrationStep =
    | 'idle'
    | 'form'
    | 'deploying'
    | 'registering'
    | 'success'
    | 'error';

/**
 * State for the registration flow
 */
export interface RegistrationState {
    step: RegistrationStep;
    data?: VoterRegistrationData;
    voterId?: string;
    error?: RegistrationError;
    progress: number; // 0-100
}

/**
 * Actions for the registration state machine
 */
export type RegistrationAction =
    | { type: 'START_REGISTRATION'; data: VoterRegistrationData }
    | { type: 'DEPLOYMENT_STARTED' }
    | { type: 'DEPLOYMENT_SUCCESS'; voterId: string }
    | { type: 'DEPLOYMENT_FAILED'; error: RegistrationError }
    | { type: 'REGISTRATION_STARTED' }
    | { type: 'REGISTRATION_SUCCESS' }
    | { type: 'REGISTRATION_FAILED'; error: RegistrationError }
    | { type: 'RESET' };

/**
 * Error types that can occur during registration
 */
export enum VoterRegistrationErrorType {
    INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
    DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',
    REGISTRATION_FAILED = 'REGISTRATION_FAILED',
    NETWORK_ERROR = 'NETWORK_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    TIMEOUT = 'TIMEOUT',
    UNKNOWN = 'UNKNOWN'
}

/**
 * Error object for registration failures
 */
export interface RegistrationError {
    type: VoterRegistrationErrorType;
    message: string;
    details?: any;
    retryable: boolean;
}

/**
 * Error messages for each error type
 */
export const REGISTRATION_ERROR_MESSAGES: Record<VoterRegistrationErrorType, string> = {
    [VoterRegistrationErrorType.INSUFFICIENT_FUNDS]:
        'Insufficient balance. You need at least {amount} tokens.',
    [VoterRegistrationErrorType.DEPLOYMENT_FAILED]:
        'Failed to deploy voter instance. Please try again.',
    [VoterRegistrationErrorType.REGISTRATION_FAILED]:
        'Failed to register with Oracle Registry. Please try again.',
    [VoterRegistrationErrorType.NETWORK_ERROR]:
        'Network connection error. Please check your connection.',
    [VoterRegistrationErrorType.VALIDATION_ERROR]:
        'Please check your input and try again.',
    [VoterRegistrationErrorType.TIMEOUT]:
        'Operation timed out. Please check status and try again.',
    [VoterRegistrationErrorType.UNKNOWN]:
        'An unexpected error occurred. Please try again.'
};

/**
 * Request payload for voter deployment
 */
export interface VoterDeploymentRequest {
    registryId: string;
    initialStake: string;
    decisionStrategy: DecisionStrategy;
}

/**
 * Response from voter deployment
 */
export interface VoterDeploymentResponse {
    success: boolean;
    voterId?: string;
    transactionHash?: string;
    error?: string;
}

/**
 * Request payload for voter registration to registry
 */
export interface VoterRegistrationRequest {
    voterId: string;
    stake: string;
}

/**
 * Voter information returned from registry
 */
export interface VoterInfo {
    id: string;
    address: string;
    stake: string;
    totalVotes: number;
    reputation: number;
    decisionStrategy: string;
    isActive: boolean;
}

/**
 * Response from voter registration to registry
 */
export interface VoterRegistrationResponse {
    success: boolean;
    voter?: VoterInfo;
    error?: string;
}
