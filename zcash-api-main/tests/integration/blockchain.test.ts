import testClient from "../utils/testClient";

// Helper function to add delay between tests to avoid rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Blockchain Endpoints", () => {
  // Add delay between each test to avoid rate limiting
  beforeEach(async () => {
    await delay(1000); // 1 second delay between tests
  });

  describe("GET /api/zcash/blockchain/info", () => {
    it("should return blockchain information", async () => {
      const response = await testClient.getBlockchainInfo();
      console.log("Blockchain Info:", response.data.data.chain);
      console.log("Blocks:", response.data.data.blocks);
      console.log("Best Block Hash:", response.data.data.bestblockhash);
      console.log("Difficulty:", response.data.data.difficulty);
      console.log(
        "Verification Progress:",
        response.data.data.verificationprogress
      );
      console.log("Chain Work:", response.data.data.chainwork);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.chain).toBeDefined();
      expect(response.data.data.blocks).toBeGreaterThanOrEqual(0);
      expect(response.data.data.bestblockhash).toBeDefined();
    });

    it("should fail without API key", async () => {
      const response = await testClient.makeRequestWithoutKey(
        "/api/zcash/blockchain/info"
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });

    it("should fail with invalid API key", async () => {
      const response = await testClient.makeRequestWithInvalidKey(
        "/api/zcash/blockchain/info"
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });
  });

  describe("GET /api/zcash/blockchain/blockcount", () => {
    it("should return current block count", async () => {
      const response = await testClient.getBlockCount();
      console.log("Block Count:", response.data.data.blockCount);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.blockCount).toBeDefined();
      expect(typeof response.data.data.blockCount).toBe("number");
      expect(response.data.data.blockCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("GET /api/zcash/blockchain/blockhash/:height", () => {
    it("should return block hash for genesis block (height 0)", async () => {
      const response = await testClient.getBlockHash(0);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.height).toBe(0);
      expect(response.data.data.blockhash).toBeDefined();
      expect(typeof response.data.data.blockhash).toBe("string");
      expect(response.data.data.blockhash.length).toBe(64);
    });

    it("should return block hash for a recent block", async () => {
      // First get current block count
      const countResponse = await testClient.getBlockCount();

      // Add delay before next request to avoid rate limiting
      await delay(1000);

      const currentHeight = countResponse.data.data.blockCount;

      // Get hash for block 10 blocks ago
      const testHeight = Math.max(0, currentHeight - 10);
      const response = await testClient.getBlockHash(testHeight);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.height).toBe(testHeight);
      expect(response.data.data.blockhash).toBeDefined();
    });

    it("should handle invalid block height", async () => {
      const response = await testClient.getBlockHash(99999999);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.data.success).toBe(false);
    });
  });

  describe("GET /api/zcash/blockchain/block/:blockhash", () => {
    let testBlockHash: string;

    beforeAll(async () => {
      // Get a valid block hash to test with
      const hashResponse = await testClient.getBlockHash(0);
      testBlockHash = hashResponse.data.data.blockhash;
    });

    it("should return block details with default verbosity", async () => {
      const response = await testClient.getBlock(testBlockHash);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.hash).toBe(testBlockHash);
    });

    it("should return block details with verbosity 1", async () => {
      const response = await testClient.getBlock(testBlockHash, 1);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.hash).toBe(testBlockHash);
    });

    it("should return raw block with verbosity 0", async () => {
      const response = await testClient.getBlock(testBlockHash, 0);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      // Note: The API returns an object even with verbosity 0
      // This is the actual behavior of the Tatum/ZCash API
      expect(response.data.data).toBeDefined();
      expect(response.data.data.hash).toBe(testBlockHash);
    });

    it("should handle invalid block hash", async () => {
      const invalidHash =
        "0000000000000000000000000000000000000000000000000000000000000000";
      const response = await testClient.getBlock(invalidHash);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.data.success).toBe(false);
    });
  });
});
