require('dotenv').config({ path: '.env.local' });
console.log('CHAIN_ID:', process.env.NEXT_PUBLIC_CHAIN_ID);
console.log('REGISTRY_ID:', process.env.NEXT_PUBLIC_REGISTRY_ID);
console.log('MARKET_CHAIN_ID:', process.env.NEXT_PUBLIC_MARKET_CHAIN_ID);
console.log('VOTER_1_ID:', process.env.NEXT_PUBLIC_VOTER_1_ID);
