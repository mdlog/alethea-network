# Advanced Use Cases Implementation Guide

Panduan implementasi lengkap untuk berbagai use case Alethea Network dengan contoh kode siap pakai.

---

## 🏥 1. Healthcare: Clinical Trial Verification

### Use Case
Verifikasi hasil clinical trial secara terdesentralisasi dengan privacy-preserving.

### Implementation

```rust
// Contract: healthcare-oracle/src/contract.rs
pub struct ClinicalTrialQuery {
    trial_id: String,
    question: String,
    endpoints: Vec<String>,
    validators: Vec<Owner>, // Licensed medical professionals
    privacy_level: PrivacyLevel,
}

pub enum PrivacyLevel {
    Public,           // Results only
    Aggregated,       // Statistical summary
    ZeroKnowledge,    // Proof without data
}

// Create query
pub fn create_clinical_trial_query(
    trial_id: String,
    question: String,
    validators: Vec<Owner>,
) -> Result<QueryId, Error> {
    let query = ClinicalTrialQuery {
        trial_id,
        question,
        endpoints: vec![
            "primary_endpoint".to_string(),
            "secondary_endpoint".to_string(),
        ],
        validators, // Only licensed doctors can vote
        privacy_level: PrivacyLevel::Aggregated,
    };
    
    // Store query with restricted access
    self.queries.insert(query_id, query);
    Ok(query_id)
}
```

### Frontend Integration

```typescript
// healthcare-dapp/src/lib/clinical-trials.ts
import { AletheaClient } from '@alethea/sdk';

export async function verifyClinicalTrial(
  trialId: string,
  question: string,
  validators: string[]
) {
  const client = new AletheaClient();
  
  // Create query with restricted validators
  const query = await client.oracle.createQuery({
    type: 'clinical_trial',
    trialId,
    question,
    validators, // Only licensed medical professionals
    privacyLevel: 'aggregated',
    votingPeriod: 7 * 24 * 60 * 60, // 7 days
  });
  
  return query.id;
}

// Check trial result
export async function getTrialResult(queryId: number) {
  const result = await client.oracle.getResult(queryId);
  
  return {
    outcome: result.outcome,
    confidence: result.confidence,
    voterCount: result.voterCount,
    // Patient data remains private
  };
}
```

---

## 🚚 2. Supply Chain: Product Authenticity

### Use Case
Verifikasi keaslian produk dari manufacturer hingga end customer.

### Smart Contract

```rust
// supply-chain-oracle/src/contract.rs
pub struct ProductAuthenticity {
    product_id: String,
    manufacturer: Owner,
    checkpoints: Vec<Checkpoint>,
    current_holder: Owner,
    authenticity_score: u8, // 0-100
}

pub struct Checkpoint {
    location: String,
    timestamp: Timestamp,
    validator: Owner,
    sensor_data: Option<SensorData>,
    verified: bool,
}

pub struct SensorData {
    temperature: f32,
    humidity: f32,
    gps_coordinates: (f64, f64),
    tamper_seal_intact: bool,
}

// Verify product at checkpoint
pub fn verify_checkpoint(
    product_id: String,
    location: String,
    sensor_data: SensorData,
) -> Result<bool, Error> {
    // Create oracle query
    let query_id = self.create_query(
        format!("Is product {} authentic at {}?", product_id, location),
        vec!["Yes".to_string(), "No".to_string()],
    )?;
    
    // Attach sensor data
    self.attach_sensor_data(query_id, sensor_data)?;
    
    // Notify validators (logistics experts)
    self.notify_validators(query_id)?;
    
    Ok(true)
}
```

### IoT Integration

```typescript
// iot-integration/src/supply-chain.ts
import { AletheaClient } from '@alethea/sdk';
import { IoTDevice } from './iot-device';

export class SupplyChainTracker {
  private client: AletheaClient;
  private device: IoTDevice;
  
  constructor() {
    this.client = new AletheaClient();
    this.device = new IoTDevice();
  }
  
  async trackShipment(productId: string) {
    // Read sensor data
    const sensorData = await this.device.readSensors();
    
    // Check if conditions violated
    if (this.isConditionViolated(sensorData)) {
      // Create oracle query automatically
      await this.client.oracle.createQuery({
        question: `Was product ${productId} damaged during transit?`,
        evidence: {
          temperature: sensorData.temperature,
          humidity: sensorData.humidity,
          shockDetected: sensorData.shockDetected,
          gps: sensorData.gps,
        },
        validators: ['logistics_expert_1', 'logistics_expert_2'],
        autoResolve: false, // Requires human verification
      });
    }
    
    // Log checkpoint
    await this.client.supplyChain.logCheckpoint({
      productId,
      location: sensorData.gps,
      timestamp: Date.now(),
      sensorData,
    });
  }
  
  private isConditionViolated(data: SensorData): boolean {
    return (
      data.temperature > 25 || // Max temp
      data.temperature < 2 ||  // Min temp
      data.humidity > 80 ||    // Max humidity
      data.shockDetected       // Physical damage
    );
  }
}
```

---

## 🎮 3. Gaming: Tournament Results & Anti-Cheat

### Use Case
Verifikasi hasil tournament dan deteksi cheating secara terdesentralisasi.

### Smart Contract

```rust
// gaming-oracle/src/contract.rs
pub struct TournamentResult {
    tournament_id: String,
    game: String,
    participants: Vec<Player>,
    matches: Vec<Match>,
    final_standings: Vec<Standing>,
    prize_pool: Amount,
}

pub struct Match {
    match_id: String,
    players: Vec<Owner>,
    winner: Option<Owner>,
    stats: MatchStats,
    replay_hash: Hash, // IPFS hash of replay file
    suspicious_activity: bool,
}

pub struct MatchStats {
    duration: Duration,
    kills: HashMap<Owner, u32>,
    deaths: HashMap<Owner, u32>,
    score: HashMap<Owner, u32>,
}

// Verify tournament result
pub fn verify_tournament_result(
    tournament_id: String,
    final_standings: Vec<Standing>,
) -> Result<QueryId, Error> {
    // Create query
    let query_id = self.create_query(
        format!("Verify tournament {} results", tournament_id),
        final_standings.iter()
            .map(|s| s.player.to_string())
            .collect(),
    )?;
    
    // Attach evidence
    self.attach_tournament_data(query_id, tournament_id)?;
    
    // Select validators (pro players + analysts)
    let validators = self.select_gaming_validators()?;
    self.set_validators(query_id, validators)?;
    
    Ok(query_id)
}

// Anti-cheat verification
pub fn verify_no_cheating(
    match_id: String,
    suspected_player: Owner,
) -> Result<QueryId, Error> {
    let query_id = self.create_query(
        format!("Did player {} cheat in match {}?", suspected_player, match_id),
        vec!["Yes - Cheating".to_string(), "No - Clean".to_string()],
    )?;
    
    // Attach replay file
    let replay_hash = self.get_replay_hash(match_id)?;
    self.attach_evidence(query_id, replay_hash)?;
    
    Ok(query_id)
}
```

### Game Integration

```typescript
// game-integration/src/tournament.ts
import { AletheaClient } from '@alethea/sdk';

export class TournamentManager {
  private client: AletheaClient;
  
  async finalizeTournament(tournamentId: string) {
    // Get final standings from game server
    const standings = await this.getStandings(tournamentId);
    
    // Create verification query
    const queryId = await this.client.oracle.createQuery({
      question: `Verify tournament ${tournamentId} results`,
      outcomes: standings.map(s => s.playerName),
      evidence: {
        matchReplays: await this.uploadReplays(tournamentId),
        statistics: await this.getStatistics(tournamentId),
        serverLogs: await this.getServerLogs(tournamentId),
      },
      validators: await this.getProValidators(),
      votingPeriod: 24 * 60 * 60, // 24 hours
    });
    
    // Wait for verification
    const result = await this.client.oracle.waitForResult(queryId);
    
    if (result.verified) {
      // Distribute prizes
      await this.distributePrizes(tournamentId, standings);
    }
    
    return result;
  }
  
  async reportCheating(matchId: string, playerId: string) {
    // Create anti-cheat query
    const queryId = await this.client.oracle.createQuery({
      question: `Did player ${playerId} cheat in match ${matchId}?`,
      outcomes: ['Yes - Ban Player', 'No - False Alarm'],
      evidence: {
        replay: await this.getReplayFile(matchId),
        suspiciousActions: await this.getSuspiciousActions(playerId),
        playerHistory: await this.getPlayerHistory(playerId),
      },
      validators: ['anti_cheat_expert_1', 'anti_cheat_expert_2'],
      requiredConsensus: 0.8, // 80% agreement needed
    });
    
    return queryId;
  }
}
```

---

## 🏠 4. Real Estate: Property Valuation

### Use Case
Penilaian properti secara terdesentralisasi oleh certified appraisers.

### Smart Contract

```rust
// real-estate-oracle/src/contract.rs
pub struct PropertyValuation {
    property_id: String,
    address: String,
    property_type: PropertyType,
    size_sqm: f64,
    year_built: u32,
    condition: PropertyCondition,
    comparable_sales: Vec<ComparableSale>,
    estimated_value: Option<Amount>,
}

pub enum PropertyType {
    Residential,
    Commercial,
    Industrial,
    Land,
}

pub struct ComparableSale {
    address: String,
    sale_price: Amount,
    sale_date: Timestamp,
    size_sqm: f64,
    distance_km: f64,
}

// Request property valuation
pub fn request_valuation(
    property_id: String,
    property_data: PropertyData,
) -> Result<QueryId, Error> {
    // Create valuation query
    let query_id = self.create_query(
        format!("Fair market value of property {}", property_id),
        vec![], // Open-ended value
    )?;
    
    // Attach property data
    self.attach_property_data(query_id, property_data)?;
    
    // Select certified appraisers only
    let appraisers = self.get_certified_appraisers()?;
    self.set_validators(query_id, appraisers)?;
    
    // Set valuation range
    self.set_value_range(query_id, 
        property_data.estimated_min,
        property_data.estimated_max,
    )?;
    
    Ok(query_id)
}

// Aggregate valuations
pub fn finalize_valuation(query_id: QueryId) -> Result<Amount, Error> {
    let votes = self.get_votes(query_id)?;
    
    // Calculate median value (more robust than mean)
    let values: Vec<Amount> = votes.iter()
        .map(|v| v.value)
        .collect();
    
    let median = self.calculate_median(values)?;
    
    // Calculate confidence interval
    let std_dev = self.calculate_std_dev(&values)?;
    let confidence = self.calculate_confidence(std_dev)?;
    
    Ok(median)
}
```

### Real Estate Platform Integration

```typescript
// real-estate-platform/src/valuation.ts
import { AletheaClient } from '@alethea/sdk';

export class PropertyValuationService {
  private client: AletheaClient;
  
  async requestValuation(propertyId: string) {
    // Gather property data
    const propertyData = await this.getPropertyData(propertyId);
    const comparables = await this.findComparables(propertyData);
    
    // Create valuation query
    const queryId = await this.client.oracle.createQuery({
      type: 'property_valuation',
      question: `Fair market value of ${propertyData.address}?`,
      propertyData: {
        type: propertyData.type,
        size: propertyData.size,
        yearBuilt: propertyData.yearBuilt,
        condition: propertyData.condition,
        location: propertyData.coordinates,
        comparables,
      },
      validators: await this.getCertifiedAppraisers(),
      valueRange: {
        min: propertyData.estimatedMin,
        max: propertyData.estimatedMax,
      },
      votingPeriod: 7 * 24 * 60 * 60, // 7 days
    });
    
    return queryId;
  }
  
  async getValuationResult(queryId: number) {
    const result = await this.client.oracle.getResult(queryId);
    
    // Calculate statistics
    const values = result.votes.map(v => v.value);
    const median = this.calculateMedian(values);
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStdDev(values);
    
    return {
      medianValue: median,
      meanValue: mean,
      confidenceInterval: {
        lower: median - 1.96 * stdDev,
        upper: median + 1.96 * stdDev,
      },
      appraiserCount: result.voterCount,
      consensus: result.consensus,
      individualValuations: result.votes.map(v => ({
        appraiser: v.voter,
        value: v.value,
        reasoning: v.reasoning,
      })),
    };
  }
}
```

---

## ✈️ 5. Insurance: Parametric Flight Delay

### Use Case
Automatic payout untuk flight delay berdasarkan real-time flight data.

### Smart Contract

```rust
// insurance-oracle/src/contract.rs
pub struct FlightInsurance {
    policy_id: String,
    flight_number: String,
    scheduled_departure: Timestamp,
    insured_amount: Amount,
    delay_threshold: Duration, // e.g., 2 hours
    policyholder: Owner,
    status: InsuranceStatus,
}

pub enum InsuranceStatus {
    Active,
    Claimed,
    Paid,
    Expired,
}

// Auto-trigger on flight delay
pub fn check_flight_status(
    policy_id: String,
    flight_number: String,
) -> Result<(), Error> {
    // Fetch flight data from multiple sources
    let flight_data = self.fetch_flight_data(flight_number)?;
    
    // Calculate delay
    let delay = flight_data.actual_departure - flight_data.scheduled_departure;
    
    // Check if delay exceeds threshold
    if delay > self.get_policy(policy_id)?.delay_threshold {
        // Create oracle query for verification
        let query_id = self.create_query(
            format!("Was flight {} delayed by {}?", flight_number, delay),
            vec!["Yes".to_string(), "No".to_string()],
        )?;
        
        // Attach flight data
        self.attach_flight_data(query_id, flight_data)?;
        
        // Auto-resolve if data is clear
        if flight_data.confidence > 0.95 {
            self.auto_resolve(query_id, "Yes".to_string())?;
            self.process_payout(policy_id)?;
        }
    }
    
    Ok(())
}

// Process insurance payout
pub fn process_payout(policy_id: String) -> Result<(), Error> {
    let policy = self.get_policy(policy_id)?;
    
    // Calculate payout based on delay duration
    let payout = self.calculate_payout(&policy)?;
    
    // Transfer funds to policyholder
    self.transfer(policy.policyholder, payout)?;
    
    // Update policy status
    self.update_policy_status(policy_id, InsuranceStatus::Paid)?;
    
    Ok(())
}
```

### Insurance Platform Integration

```typescript
// insurance-platform/src/flight-insurance.ts
import { AletheaClient } from '@alethea/sdk';
import { FlightDataAPI } from './flight-api';

export class FlightInsuranceService {
  private client: AletheaClient;
  private flightAPI: FlightDataAPI;
  
  async createPolicy(
    flightNumber: string,
    scheduledDeparture: Date,
    insuredAmount: number
  ) {
    // Create insurance policy
    const policy = await this.client.insurance.createPolicy({
      type: 'flight_delay',
      flightNumber,
      scheduledDeparture,
      insuredAmount,
      delayThreshold: 2 * 60 * 60, // 2 hours in seconds
      premium: this.calculatePremium(flightNumber, insuredAmount),
    });
    
    // Schedule automatic check
    await this.scheduleFlightCheck(policy.id, scheduledDeparture);
    
    return policy;
  }
  
  async checkFlightAndProcess(policyId: string) {
    const policy = await this.client.insurance.getPolicy(policyId);
    
    // Fetch real-time flight data
    const flightData = await this.flightAPI.getFlightStatus(
      policy.flightNumber
    );
    
    // Calculate delay
    const delay = flightData.actualDeparture - policy.scheduledDeparture;
    
    if (delay > policy.delayThreshold) {
      // Create verification query
      const queryId = await this.client.oracle.createQuery({
        question: `Was flight ${policy.flightNumber} delayed by ${delay / 3600} hours?`,
        outcomes: ['Yes', 'No'],
        evidence: {
          flightData,
          sources: ['FlightAware', 'FlightRadar24', 'Official Airline API'],
        },
        autoResolve: true, // Auto-resolve if data is clear
        confidenceThreshold: 0.95,
      });
      
      // Wait for resolution
      const result = await this.client.oracle.waitForResult(queryId);
      
      if (result.outcome === 'Yes') {
        // Process payout automatically
        await this.client.insurance.processPayout(policyId);
        
        // Notify policyholder
        await this.notifyPolicyholder(policy.policyholder, {
          message: 'Your flight delay claim has been approved!',
          amount: policy.insuredAmount,
          transactionHash: result.transactionHash,
        });
      }
    }
  }
  
  private calculatePremium(flightNumber: string, insuredAmount: number): number {
    // Calculate premium based on historical delay data
    const delayProbability = this.getHistoricalDelayRate(flightNumber);
    return insuredAmount * delayProbability * 1.2; // 20% margin
  }
}
```

---

## 🌾 6. Agriculture: Crop Insurance (Weather-based)

### Use Case
Parametric crop insurance berdasarkan data cuaca (rainfall, temperature).

### Implementation

```rust
// agriculture-oracle/src/contract.rs
pub struct CropInsurance {
    policy_id: String,
    farmer: Owner,
    location: GeoCoordinates,
    crop_type: CropType,
    planting_date: Timestamp,
    harvest_date: Timestamp,
    insured_amount: Amount,
    weather_conditions: WeatherConditions,
}

pub struct WeatherConditions {
    min_rainfall_mm: f32,
    max_rainfall_mm: f32,
    min_temperature_c: f32,
    max_temperature_c: f32,
}

// Monitor weather conditions
pub fn monitor_weather(policy_id: String) -> Result<(), Error> {
    let policy = self.get_policy(policy_id)?;
    
    // Fetch weather data from multiple sources
    let weather_data = self.fetch_weather_data(policy.location)?;
    
    // Check if conditions violated
    if self.is_condition_violated(&policy, &weather_data) {
        // Create oracle query
        let query_id = self.create_query(
            format!("Did adverse weather affect crop at {}?", policy.location),
            vec!["Yes - Payout".to_string(), "No - No Payout".to_string()],
        )?;
        
        // Attach weather data
        self.attach_weather_data(query_id, weather_data)?;
        
        // Auto-resolve if data is clear
        if weather_data.confidence > 0.9 {
            self.auto_resolve_and_payout(query_id, policy_id)?;
        }
    }
    
    Ok(())
}
```

---

## 📊 7. DeFi: Collateral Valuation

### Use Case
Real-time valuation of complex collateral (NFTs, LP tokens, etc.).

### Implementation

```typescript
// defi-protocol/src/collateral-oracle.ts
import { AletheaClient } from '@alethea/sdk';

export class CollateralOracle {
  private client: AletheaClient;
  
  async valueCollateral(
    collateralType: string,
    collateralId: string
  ): Promise<number> {
    // Create valuation query
    const queryId = await this.client.oracle.createQuery({
      question: `Fair market value of ${collateralType} #${collateralId}?`,
      type: 'collateral_valuation',
      evidence: {
        collateralType,
        collateralId,
        recentSales: await this.getRecentSales(collateralType),
        floorPrice: await this.getFloorPrice(collateralType),
        rarity: await this.getRarityScore(collateralId),
      },
      validators: await this.getMarketExperts(collateralType),
      votingPeriod: 1 * 60 * 60, // 1 hour (urgent)
      urgencyMultiplier: 2, // Higher rewards for faster response
    });
    
    const result = await this.client.oracle.waitForResult(queryId);
    return result.medianValue;
  }
  
  async checkLiquidation(loanId: string): Promise<boolean> {
    const loan = await this.getLoan(loanId);
    const collateralValue = await this.valueCollateral(
      loan.collateralType,
      loan.collateralId
    );
    
    const ltv = loan.debtAmount / collateralValue;
    
    if (ltv > loan.liquidationThreshold) {
      // Create liquidation query
      await this.client.oracle.createQuery({
        question: `Should loan ${loanId} be liquidated?`,
        outcomes: ['Yes - Liquidate', 'No - Safe'],
        evidence: {
          currentLTV: ltv,
          threshold: loan.liquidationThreshold,
          collateralValue,
          debtAmount: loan.debtAmount,
        },
        autoResolve: true,
      });
      
      return true;
    }
    
    return false;
  }
}
```

---

## 🎯 Best Practices

### 1. **Validator Selection**
```typescript
// Choose validators based on use case
const validators = {
  // Financial: Require stake
  financial: { requireStake: true, minStake: 1000 },
  
  // Medical: Require license
  medical: { requireLicense: true, licenseType: 'MD' },
  
  // Legal: Require certification
  legal: { requireCertification: true, certType: 'BAR' },
  
  // Technical: Require reputation
  technical: { requireReputation: true, minScore: 80 },
};
```

### 2. **Evidence Attachment**
```typescript
// Always attach comprehensive evidence
await client.oracle.createQuery({
  question: "...",
  evidence: {
    primarySource: "...",
    secondarySources: ["...", "..."],
    rawData: {...},
    ipfsHash: "...", // For large files
    timestamp: Date.now(),
  },
});
```

### 3. **Error Handling**
```typescript
try {
  const result = await client.oracle.waitForResult(queryId);
} catch (error) {
  if (error.code === 'TIMEOUT') {
    // Extend voting period
    await client.oracle.extendVotingPeriod(queryId, 24 * 60 * 60);
  } else if (error.code === 'NO_CONSENSUS') {
    // Increase validator count
    await client.oracle.addValidators(queryId, moreValidators);
  }
}
```

---

## 📚 Additional Resources

- [API Documentation](../getting-started/api-reference.md)
- [SDK Reference](../alethea-network/SDK_INTEGRATION_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Competitive Advantages](../current/ALETHEA_COMPETITIVE_ADVANTAGES.md)

---

*Last Updated: November 20, 2025*
