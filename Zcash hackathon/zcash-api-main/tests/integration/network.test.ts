import testClient from "../utils/testClient";

// Helper function to add delay between tests to avoid rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Network and Mining Endpoints", () => {
  // Add delay between each test to avoid rate limiting
  beforeEach(async () => {
    await delay(1000); // 1 second delay between tests
  });

  describe("GET /api/zcash/network/info", () => {
    it("should return network information", async () => {
      const response = await testClient.getNetworkInfo();

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.version).toBeDefined();
      expect(response.data.data.subversion).toBeDefined();
      expect(response.data.data.protocolversion).toBeDefined();
    });

    it("should include connection information", async () => {
      const response = await testClient.getNetworkInfo();

      expect(response.status).toBe(200);
      expect(response.data.data.connections).toBeDefined();
      expect(typeof response.data.data.connections).toBe("number");
      expect(response.data.data.connections).toBeGreaterThanOrEqual(0);
    });

    it("should include network details", async () => {
      const response = await testClient.getNetworkInfo();

      expect(response.status).toBe(200);
      expect(response.data.data.networks).toBeDefined();
      expect(Array.isArray(response.data.data.networks)).toBe(true);
    });
  });

  describe("GET /api/zcash/network/connections", () => {
    it("should return connection count", async () => {
      const response = await testClient.getConnectionCount();

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.connections).toBeDefined();
      expect(typeof response.data.data.connections).toBe("number");
      expect(response.data.data.connections).toBeGreaterThanOrEqual(0);
    });

    it("should return consistent connection count", async () => {
      const response1 = await testClient.getConnectionCount();

      // Add delay before second request to avoid rate limiting
      await delay(1000);

      const response2 = await testClient.getConnectionCount();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Connection count should be similar (within reasonable range)
      const diff = Math.abs(
        response1.data.data.connections - response2.data.data.connections
      );
      expect(diff).toBeLessThanOrEqual(5); // Allow for some variance
    });
  });

  describe("GET /api/zcash/mining/info", () => {
    it("should return mining information", async () => {
      const response = await testClient.getMiningInfo();

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
    });

    it("should include blockchain mining details", async () => {
      const response = await testClient.getMiningInfo();

      expect(response.status).toBe(200);
      expect(response.data.data.blocks).toBeDefined();
      expect(typeof response.data.data.blocks).toBe("number");
      expect(response.data.data.difficulty).toBeDefined();
      expect(typeof response.data.data.difficulty).toBe("number");
    });

    it("should include network solution rate if available", async () => {
      const response = await testClient.getMiningInfo();

      expect(response.status).toBe(200);
      // Network solution rate might be present
      if (response.data.data.networksolps !== undefined) {
        expect(typeof response.data.data.networksolps).toBe("number");
      }
    });

    it("should include chain info", async () => {
      const response = await testClient.getMiningInfo();

      expect(response.status).toBe(200);
      expect(response.data.data.chain).toBeDefined();
      expect(typeof response.data.data.chain).toBe("string");
    });
  });

  describe("GET /health", () => {
    it("should return health check status", async () => {
      const response = await testClient.healthCheck();

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain("running");
      expect(response.data.timestamp).toBeDefined();
    });

    it("should not require API key for health check", async () => {
      const response = await testClient.makeRequestWithoutKey("/health");

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it("should return valid timestamp", async () => {
      const response = await testClient.healthCheck();

      expect(response.status).toBe(200);
      const timestamp = new Date(response.data.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);

      // Timestamp should be recent (within last minute)
      const now = new Date();
      const diff = now.getTime() - timestamp.getTime();
      expect(diff).toBeLessThan(60000); // Less than 1 minute
    });
  });

  describe("Authentication", () => {
    it("should reject requests without API key", async () => {
      const endpoints = [
        "/api/zcash/blockchain/info",
        "/api/zcash/wallet/info",
        "/api/zcash/network/info",
      ];

      for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        const response = await testClient.makeRequestWithoutKey(endpoint);
        expect(response.status).toBe(401);
        expect(response.data.success).toBe(false);
        expect(response.data.error).toContain("Unauthorized");

        // Add delay between requests in the loop to avoid rate limiting
        if (i < endpoints.length - 1) {
          await delay(1000);
        }
      }
    });

    it("should reject requests with invalid API key", async () => {
      const endpoints = [
        "/api/zcash/blockchain/info",
        "/api/zcash/wallet/info",
        "/api/zcash/network/info",
      ];

      for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        const response = await testClient.makeRequestWithInvalidKey(endpoint);
        expect(response.status).toBe(401);
        expect(response.data.success).toBe(false);
        expect(response.data.error).toContain("Unauthorized");

        // Add delay between requests in the loop to avoid rate limiting
        if (i < endpoints.length - 1) {
          await delay(1000);
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for non-existent routes", async () => {
      const response =
        await testClient.makeRequestWithoutKey("/api/nonexistent");

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain("not found");
    });
  });
});
