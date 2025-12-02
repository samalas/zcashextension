import testClient from "../utils/testClient";

// Helper function to add delay between tests to avoid rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Account Balance Endpoints - z_getbalanceforaccount", () => {
  // Add delay between each test to avoid rate limiting
  beforeEach(async () => {
    await delay(1000); // 1 second delay between tests
  });

  describe("POST /api/zcash/wallet/getbalanceforaccount", () => {
    it("should return balance for an account with default minconf (1)", async () => {
      // First create a new account
      const newAccountResponse = await testClient.getNewAccount();

      console.log(
        "New account created for balance test:",
        JSON.stringify(newAccountResponse.data, null, 2)
      );

      expect(newAccountResponse.status).toBe(200);
      expect(newAccountResponse.data.success).toBe(true);

      const accountNumber = newAccountResponse.data.data.account;

      // Add delay to avoid rate limiting
      await delay(1000);

      // Get balance for the account (default minconf = 1)
      const balanceResponse = await testClient.getBalanceForAccount(accountNumber);

      console.log(
        "Balance response (default minconf):",
        JSON.stringify(balanceResponse.data, null, 2)
      );

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.data.success).toBe(true);
      expect(balanceResponse.data.data.pools).toBeDefined();
      expect(typeof balanceResponse.data.data.pools).toBe("object");
      expect(balanceResponse.data.data.minimum_confirmations).toBeDefined();
      expect(balanceResponse.data.data.minimum_confirmations).toBe(1); // default minconf
    });

    it("should return balance for account with custom minconf (5 confirmations)", async () => {
      // First create a new account
      const newAccountResponse = await testClient.getNewAccount();

      expect(newAccountResponse.status).toBe(200);
      expect(newAccountResponse.data.success).toBe(true);

      const accountNumber = newAccountResponse.data.data.account;

      // Add delay to avoid rate limiting
      await delay(1000);

      // Get balance with custom minconf = 5
      const balanceResponse = await testClient.getBalanceForAccount(accountNumber, 5);

      console.log(
        "Balance response with minconf=5:",
        JSON.stringify(balanceResponse.data, null, 2)
      );

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.data.success).toBe(true);
      expect(balanceResponse.data.data.pools).toBeDefined();
      expect(balanceResponse.data.data.minimum_confirmations).toBe(5);
    });

    it("should return balance for account with asOfHeight parameter", async () => {
      // First create a new account
      const newAccountResponse = await testClient.getNewAccount();

      expect(newAccountResponse.status).toBe(200);
      expect(newAccountResponse.data.success).toBe(true);

      const accountNumber = newAccountResponse.data.data.account;

      // Add delay to avoid rate limiting
      await delay(1000);

      // Get balance with asOfHeight parameter (using a reasonable block height)
      // Using a historical block height like 1000
      const balanceResponse = await testClient.getBalanceForAccount(accountNumber, 1, 1000);

      console.log(
        "Balance response with asOfHeight=1000:",
        JSON.stringify(balanceResponse.data, null, 2)
      );

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.data.success).toBe(true);
      expect(balanceResponse.data.data.pools).toBeDefined();
      expect(balanceResponse.data.data.minimum_confirmations).toBeDefined();
    });

    it("should return error when account parameter is missing", async () => {
      // Make a request without account parameter
      const response = await testClient.getBalanceForAccount(null as any);

      console.log(
        "Error response for missing account:",
        JSON.stringify(response.data, null, 2)
      );

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe("Account number is required");
    });

    it("should validate pool structure for each value pool type", async () => {
      // First create a new account
      const newAccountResponse = await testClient.getNewAccount();

      expect(newAccountResponse.status).toBe(200);
      expect(newAccountResponse.data.success).toBe(true);

      const accountNumber = newAccountResponse.data.data.account;

      // Add delay to avoid rate limiting
      await delay(1000);

      // Get balance for the account
      const balanceResponse = await testClient.getBalanceForAccount(accountNumber);

      console.log(
        "Balance pools structure:",
        JSON.stringify(balanceResponse.data.data.pools, null, 2)
      );

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.data.success).toBe(true);

      const pools = balanceResponse.data.data.pools;

      // Check that pools is an object
      expect(typeof pools).toBe("object");

      // If transparent pool exists, validate its structure
      if (pools.transparent) {
        expect(pools.transparent.valueZat).toBeDefined();
        expect(typeof pools.transparent.valueZat).toBe("number");
        console.log("Transparent pool balance:", pools.transparent.valueZat, "zatoshis");
      }

      // If sapling pool exists, validate its structure
      if (pools.sapling) {
        expect(pools.sapling.valueZat).toBeDefined();
        expect(typeof pools.sapling.valueZat).toBe("number");
        console.log("Sapling pool balance:", pools.sapling.valueZat, "zatoshis");
      }

      // If orchard pool exists, validate its structure
      if (pools.orchard) {
        expect(pools.orchard.valueZat).toBeDefined();
        expect(typeof pools.orchard.valueZat).toBe("number");
        console.log("Orchard pool balance:", pools.orchard.valueZat, "zatoshis");
      }

      // Note: Pools for which the balance is zero are not shown
      console.log("Note: Pools with zero balance are not displayed in the response");
    });

    it("should handle account with no balance (empty pools)", async () => {
      // First create a new account (should have no balance)
      const newAccountResponse = await testClient.getNewAccount();

      expect(newAccountResponse.status).toBe(200);
      expect(newAccountResponse.data.success).toBe(true);

      const accountNumber = newAccountResponse.data.data.account;

      // Add delay to avoid rate limiting
      await delay(1000);

      // Get balance for the new account
      const balanceResponse = await testClient.getBalanceForAccount(accountNumber);

      console.log(
        "Balance for new account (should be empty):",
        JSON.stringify(balanceResponse.data, null, 2)
      );

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.data.success).toBe(true);
      expect(balanceResponse.data.data.pools).toBeDefined();
      expect(balanceResponse.data.data.minimum_confirmations).toBe(1);

      // New account should have empty pools or all pools with zero balance
      // Note: According to RPC docs, pools with zero balance are not shown
      const pools = balanceResponse.data.data.pools;
      console.log("Empty account pools:", pools);
    });

    it("should respect minconf parameter when provided", async () => {
      // Create an account
      const newAccountResponse = await testClient.getNewAccount();
      expect(newAccountResponse.status).toBe(200);
      const accountNumber = newAccountResponse.data.data.account;

      await delay(1000);

      // Test with different minconf values
      const minconfValues = [1, 3, 6, 10];

      for (const minconf of minconfValues) {
        const balanceResponse = await testClient.getBalanceForAccount(accountNumber, minconf);

        console.log(
          `Balance with minconf=${minconf}:`,
          JSON.stringify(balanceResponse.data, null, 2)
        );

        expect(balanceResponse.status).toBe(200);
        expect(balanceResponse.data.success).toBe(true);
        expect(balanceResponse.data.data.minimum_confirmations).toBe(minconf);

        // Add delay between iterations
        if (minconf !== minconfValues[minconfValues.length - 1]) {
          await delay(1000);
        }
      }
    });

    it("should validate result amounts are in zatoshis", async () => {
      // Create an account
      const newAccountResponse = await testClient.getNewAccount();
      expect(newAccountResponse.status).toBe(200);
      const accountNumber = newAccountResponse.data.data.account;

      await delay(1000);

      const balanceResponse = await testClient.getBalanceForAccount(accountNumber);

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.data.success).toBe(true);

      const pools = balanceResponse.data.data.pools;

      // All pool values should be integers (zatoshis are the smallest unit)
      if (pools.transparent) {
        expect(Number.isInteger(pools.transparent.valueZat)).toBe(true);
      }
      if (pools.sapling) {
        expect(Number.isInteger(pools.sapling.valueZat)).toBe(true);
      }
      if (pools.orchard) {
        expect(Number.isInteger(pools.orchard.valueZat)).toBe(true);
      }

      console.log(
        "Verified: All balance amounts are in zatoshis (integer values)"
      );
    });
  });
});
