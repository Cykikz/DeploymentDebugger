// Quick test script to verify Bob API connection
// Run with: node test-bob-api.js

const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse environment variables (improved regex)
const envVars = {};
envContent.split('\n').forEach(line => {
  // Match lines like: KEY=value (allowing underscores, dots, hyphens in key)
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) {
    const key = match[1];
    const value = match[2].trim();
    if (value) { // Only set if value is not empty
      envVars[key] = value;
    }
  }
});

const BOB_API_KEY = envVars.BOB_API_KEY;
const BOB_API_ENDPOINT = envVars.BOB_API_ENDPOINT;

console.log('🔍 Testing Bob API Connection...\n');
console.log('Parsed env vars:', Object.keys(envVars));
console.log('API Key:', BOB_API_KEY ? `${BOB_API_KEY.substring(0, 20)}...` : 'NOT SET');
console.log('Endpoint:', BOB_API_ENDPOINT || 'NOT SET');
console.log('');

if (!BOB_API_KEY || !BOB_API_ENDPOINT) {
  console.error('❌ Missing BOB_API_KEY or BOB_API_ENDPOINT in .env.local');
  console.log('\n📝 Make sure .env.local contains:');
  console.log('BOB_API_KEY=your_key_here');
  console.log('BOB_API_ENDPOINT=https://api.bob.build/v1/chat');
  process.exit(1);
}

async function testBobAPI() {
  try {
    console.log('📡 Sending test request to Bob API...\n');
    
    const response = await fetch(BOB_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BOB_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: 'Analyze this error: Cannot find module "axios"',
        agent: 'sanitizer',
        context: { test: true },
        max_tokens: 500,
      }),
    });

    console.log('Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ API Error Response:');
      console.error(errorText);
      console.log('\n💡 This might mean:');
      console.log('  - The endpoint URL is incorrect');
      console.log('  - The API expects a different request format');
      console.log('  - The API key is invalid');
      console.log('\n📝 Try these alternative endpoints:');
      console.log('  - https://api.bob.build/v1/messages');
      console.log('  - https://api.bob.build/v1/completions');
      console.log('  - https://api.bob.build/chat');
      return;
    }

    const data = await response.json();
    console.log('\n✅ Success! Bob API Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n🎉 Bob API is working! You can now use real AI responses.');
    
  } catch (error) {
    console.error('\n❌ Connection Error:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('  - Check if Bob API endpoint is correct');
    console.log('  - Verify API key is valid');
    console.log('  - Check internet connection');
    console.log('  - Bob API might use a different endpoint format');
  }
}

testBobAPI();

// Made with Bob
