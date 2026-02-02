# 🎮 Alethea Dashboard - Complete User Guide

**Your Complete Guide to Using the Alethea Oracle Network**

## 🚀 **Getting Started**

### 1. **Access the Dashboard**
- Open your browser and go to `http://localhost:5173`
- The dashboard will automatically connect to the Linera blockchain
- You'll see the main dashboard with network statistics

### 2. **Connect Your Wallet**
- Click "Connect Wallet" in the top right
- Your Linera wallet will be automatically created
- Save your mnemonic phrase securely (12 words)
- Your wallet address will be displayed

### 3. **Get Test Tokens**
- Navigate to the "Token" page
- Click "Mint ALTH Tokens" from the token minter
- You'll receive test ALTH tokens for staking and voting
- Your balance will be displayed in the header

## 🗳️ **Becoming a Voter**

### **Register as Voter**
1. Go to the "Voters" page
2. Click "Register as Voter"
3. **Minimum Stake**: 100 ALTH tokens required
4. Enter your display name (optional)
5. Click "Register & Stake"
6. Wait for cross-chain message processing (3-4 seconds)
7. ✅ You're now a registered voter!

### **Your Voter Profile**
- **Stake**: Your total staked ALTH tokens
- **Available Stake**: Tokens available for voting
- **Locked Stake**: Tokens locked in active votes
- **Reputation**: Your accuracy score (0-100)
- **Reputation Tier**: Novice → Intermediate → Expert → Master

## 💰 **Managing Your Stake**

### **Add More Stake**
1. Go to your "Profile" page
2. Click "Stake Tokens"
3. Enter amount to stake (minimum 10 ALTH)
4. Click "Stake Tokens"
5. Your voting power increases with more stake

### **Withdraw Stake**
1. Go to your "Profile" page
2. Click "Withdraw Stake"
3. Enter amount to withdraw (up to available stake)
4. Click "Withdraw"
5. Tokens are transferred back to your wallet via secure cross-chain messaging
6. ✅ No more HTTP 500 errors - fully functional!

### **Understanding Stake States**
- **Total Stake**: All your staked tokens
- **Available Stake**: Can be used for voting or withdrawn
- **Locked Stake**: Temporarily locked during active votes (10% per vote)
- **Withdrawable Balance**: Tokens ready to be claimed (after withdraw)

## 🔮 **Participating in Oracle Queries**

### **Finding Queries**
1. Go to the "Queries" page
2. Browse active queries needing votes
3. Check query details:
   - **Description**: What data is being requested
   - **Outcomes**: Possible answers (e.g., "Yes", "No")
   - **Reward**: ALTH tokens for correct votes
   - **Deadline**: When voting ends
   - **Phase**: Commit or Reveal phase

### **Voting Process (Commit-Reveal)**

#### **Phase 1: Commit Vote**
1. Click "Vote" on an active query
2. Select your answer from available outcomes
3. Set your confidence level (1-100%)
4. Click "Commit Vote"
5. Your vote is encrypted and submitted
6. 10% of your available stake gets locked

#### **Phase 2: Reveal Vote**
1. Wait for the reveal phase to begin
2. Click "Reveal Vote" on the same query
3. Your encrypted vote is revealed and verified
4. Wait for query resolution

#### **Phase 3: Resolution & Rewards**
1. Query automatically resolves after reveal phase
2. Correct voters receive ALTH token rewards
3. Incorrect voters may lose 5% of their stake (slashing)
4. Your locked stake is released
5. Reputation is updated based on accuracy

### **Voting Strategy Tips**
- **Higher Stake = Higher Rewards**: Rewards are proportional to your stake
- **Accuracy Matters**: Build reputation for better voting weight
- **Confidence Levels**: Higher confidence can increase rewards
- **Stake Management**: Don't lock all your stake in one vote

## 🏆 **Earning Rewards**

### **How Rewards Work**
- **Proportional Distribution**: Rewards based on your stake size
- **Accuracy Bonus**: Higher reputation = better voting weight
- **Token Rewards**: Earn real ALTH tokens for correct votes

### **Example Reward Calculation**
Query with 100 ALTH reward pool:
- **Your Stake**: 200 ALTH
- **Total Correct Voters Stake**: 500 ALTH
- **Your Reward**: (200/500) × 100 = 40 ALTH tokens

### **Claiming Rewards**
1. Go to your "Profile" page
2. Check "Pending Rewards" section
3. Click "Claim Tokens" if you have rewards
4. Tokens are added to your wallet balance

## 📊 **Understanding the Interface**

### **Dashboard Pages**
- **Home**: Network statistics, active queries, and overview
- **Voters**: Leaderboard and voter registration
- **Queries**: Active queries and voting interface
- **Token**: ALTH token management, faucet, and transfers
- **Profile**: Your voter profile, stake management, and rewards
- **Docs**: Comprehensive documentation (6 sections)

### **Key Metrics**
- **Total Voters**: Number of registered voters
- **Active Voters**: Voters with recent activity
- **Total Stake**: All staked ALTH tokens in the network
- **Queries Created/Resolved**: Oracle activity statistics

### **Status Indicators**
- 🟢 **Active**: Query accepting votes
- 🟡 **Reveal Phase**: Time to reveal committed votes
- 🔴 **Resolved**: Query completed with results
- 🔒 **Locked**: Your stake is locked in this query

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

#### **"Insufficient Balance" Error**
- **Cause**: Not enough ALTH tokens for staking
- **Solution**: Get more tokens from faucet or reduce stake amount

#### **"Insufficient Available Stake" Error**
- **Cause**: Your stake is locked in active votes
- **Solution**: Wait for votes to resolve or add more stake

#### **Vote Not Recorded**
- **Cause**: Cross-chain message still processing
- **Solution**: Wait 3-4 seconds and refresh the page

#### **Withdraw Failed (Old Issue - Now Fixed!)**
- **Old Problem**: HTTP 500 errors during withdraw
- **✅ Fixed**: Now uses secure cross-chain messaging
- **Solution**: Withdraw should work perfectly now

#### **Balance Not Updating**
- **Cause**: Cross-chain message processing delay
- **Solution**: Wait a few seconds and click refresh button

### **Getting Help**
- Check browser console for error messages
- Ensure Linera service is running on `localhost:8080`
- Verify your wallet connection
- Try refreshing the page

## 🎯 **Best Practices**

### **Staking Strategy**
- Start with minimum stake (100 ALTH) to learn
- Gradually increase stake as you gain experience
- Keep some stake available for multiple votes
- Don't stake more than you can afford to lose

### **Voting Strategy**
- Research queries carefully before voting
- Use appropriate confidence levels
- Build reputation with accurate votes
- Participate regularly to maintain active status

### **Security Tips**
- Keep your mnemonic phrase secure and private
- Never share your wallet credentials
- Verify query details before voting
- Monitor your stake and rewards regularly

## 🚀 **Advanced Features**

### **Cross-chain Operations**
- All token transfers use secure Linera cross-chain messaging
- Staking and unstaking are authenticated by the blockchain
- No HTTP authentication issues or security vulnerabilities

### **Real Token Integration**
- All stakes are backed by real ALTH tokens
- Registry balance always matches total stakes
- Token transfers are permanent and secure

### **Reputation System**
- Reputation affects your voting weight
- Higher reputation = better rewards
- Reputation tiers unlock additional benefits

---

## 🎉 **You're Ready to Go!**

The Alethea Oracle Network is now fully functional with:
- ✅ Real token staking and rewards
- ✅ Secure cross-chain messaging
- ✅ Functional withdraw system
- ✅ Production-ready oracle operations

**Start earning ALTH tokens by providing accurate data to the decentralized oracle network!** 🔮💰

---

*Need more help? Check the [Technical Documentation](./TECHNICAL_DOCS.md) or [API Reference](./API_REFERENCE.md)*