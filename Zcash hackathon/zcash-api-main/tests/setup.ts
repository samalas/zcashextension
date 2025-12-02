import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config();

// Set test timeout to 30 seconds for blockchain operations
jest.setTimeout(30000);

// Global test setup
beforeAll(() => {
  console.log('Starting ZCash API tests...');
  console.log(`Testing against: ${process.env.ZCASH_RPC_URL}`);
});

afterAll(() => {
  console.log('All tests completed!');
});
