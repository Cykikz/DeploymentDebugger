// Test Groq API directly
require('dotenv').config({ path: '.env.local' });

async function testGroq() {
  console.log('Testing Groq API...');
  console.log('GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
  console.log('API Key (first 10 chars):', process.env.GROQ_API_KEY?.substring(0, 10));

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: 'Say "Hello from Groq!" and nothing else.',
        }],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Success!');
    console.log('Response:', data.choices[0]?.message?.content);
    console.log('Tokens used:', data.usage?.total_tokens);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGroq();

// Made with Bob
