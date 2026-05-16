/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    USE_BOB_IDE: process.env.USE_BOB_IDE,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    TOKEN_BUDGET: process.env.TOKEN_BUDGET,
    DEMO_MODE: process.env.DEMO_MODE,
    GIT_AUTO_COMMIT: process.env.GIT_AUTO_COMMIT,
  },
};

module.exports = nextConfig;

// Made with Bob
