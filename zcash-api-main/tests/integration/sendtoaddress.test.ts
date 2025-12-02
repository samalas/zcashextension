import testClient from "../utils/testClient";

// Helper function to add delay between tests to avoid rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to wait for operation to complete
async function waitForOperation(operationId: string, maxAttempts = 30): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await delay(2000); // Wait 2 seconds between checks

    const statusResponse = await testClient.zGetOperationStatus([operationId]);

    if (!statusResponse.data.success) {
      throw new Error("Failed to check operation status");
    }

    const operations = statusResponse.data.data;
    if (operations.length === 0) {
      throw new Error("Operation not found");
    }

    const operation = operations[0];

    if (operation.status === "success") {
      return operation;
    } else if (operation.status === "failed") {
      throw new Error(`Operation failed: ${operation.error?.message || "Unknown error"}`);
    }

    // Status is queued or executing, continue waiting
  }

  throw new Error("Operation timed out");
}

// Helper to get balance for an address (supports both transparent and shielded)
async function getBalanceForAddress(address: string): Promise<number> {
  await delay(1000);

  // For transparent addresses, use listunspent
  if (address.startsWith("t")) {
    const unspentResponse = await testClient.listUnspent(1);
    if (!unspentResponse.data.success) {
      return 0;
    }

    const utxos = unspentResponse.data.data.filter((utxo: any) => utxo.address === address);
    return utxos.reduce((sum: number, utxo: any) => sum + utxo.amount, 0);
  }

  // For shielded addresses, try to find the account
  await delay(1000);
  const accountsResponse = await testClient.listAccounts();
  if (!accountsResponse.data.success) {
    return 0;
  }

  // For each account, get addresses and check if it matches
  for (const account of accountsResponse.data.data) {
    await delay(1000);
    const addressResponse = await testClient.getAddressForAccount(account.account);

    if (addressResponse.data.success && addressResponse.data.data.address === address) {
      await delay(1000);
      const balanceResponse = await testClient.getBalanceForAccount(account.account);

      if (balanceResponse.data.success) {
        const pools = balanceResponse.data.data.pools;
        let total = 0;
        if (pools.transparent) total += pools.transparent.valueZat / 100000000;
        if (pools.sapling) total += pools.sapling.valueZat / 100000000;
        if (pools.orchard) total += pools.orchard.valueZat / 100000000;
        return total;
      }
    }
  }

  return 0;
}

describe("z_sendmany Transaction Tests", () => {
  // Add delay between each test to avoid rate limiting
  beforeEach(async () => {
    await delay(1000);
  });

  describe("POST /api/zcash/transaction/z_sendmany", () => {
    it("should reject request without required fields", async () => {
      const response = await testClient.zSendMany("", []);

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain("required");
    });

    it("should reject request with invalid recipients", async () => {
      const response = await testClient.zSendMany("ANY_TADDR", [
        { address: "", amount: 0.001 },
      ]);

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    // Test 1: Transparent to Transparent transaction
    it("should successfully send from transparent to transparent address", async () => {
      console.log("\n=== TEST: Transparent -> Transparent ===");

      // Get all addresses
      await delay(1000);
      const addressesResponse = await testClient.listAddresses();

      if (!addressesResponse.data.success || !addressesResponse.data.data) {
        console.log("Skipping test - could not get addresses");
        return;
      }

      // Find transparent addresses with balance
      const transparentAddresses = addressesResponse.data.data.filter(
        (addr: any) => addr.address && addr.address.startsWith("t")
      );

      if (transparentAddresses.length < 1) {
        console.log("Skipping test - no transparent addresses available");
        return;
      }

      // Get unspent outputs to find sender with balance
      await delay(1000);
      const unspentResponse = await testClient.listUnspent(1);

      if (!unspentResponse.data.success || !unspentResponse.data.data || unspentResponse.data.data.length === 0) {
        console.log("Skipping test - no unspent outputs available");
        return;
      }

      // Calculate balances
      const balanceMap = new Map<string, number>();
      unspentResponse.data.data.forEach((utxo: any) => {
        if (utxo.address && utxo.address.startsWith("t")) {
          const current = balanceMap.get(utxo.address) || 0;
          balanceMap.set(utxo.address, current + utxo.amount);
        }
      });

      if (balanceMap.size === 0) {
        console.log("Skipping test - no transparent addresses with balance");
        return;
      }

      // Find sender with highest balance
      let senderAddress = "";
      let maxBalance = 0;
      balanceMap.forEach((balance, address) => {
        if (balance > maxBalance) {
          maxBalance = balance;
          senderAddress = address;
        }
      });

      if (maxBalance < 0.001) {
        console.log("Skipping test - insufficient balance");
        return;
      }

      // Get or create receiver address
      let receiverAddress = "";
      const otherAddresses = Array.from(balanceMap.keys()).filter(
        (addr) => addr !== senderAddress
      );

      if (otherAddresses.length > 0) {
        receiverAddress = otherAddresses[0];
      } else {
        // Use ANY_TADDR to let the node select addresses
        console.log("Using ANY_TADDR as sender");
        senderAddress = "ANY_TADDR";
        receiverAddress = transparentAddresses[0].address;
      }

      console.log(`Sender: ${senderAddress} (balance: ${maxBalance})`);
      console.log(`Receiver: ${receiverAddress}`);

      const sendAmount = 0.0001;

      // Get initial balances
      const initialSenderBalance = senderAddress === "ANY_TADDR" ? maxBalance : await getBalanceForAddress(senderAddress);
      const initialReceiverBalance = await getBalanceForAddress(receiverAddress);

      console.log(`Initial sender balance: ${initialSenderBalance}`);
      console.log(`Initial receiver balance: ${initialReceiverBalance}`);

      // Send transaction
      await delay(1000);
      const response = await testClient.zSendMany(
        senderAddress,
        [{ address: receiverAddress, amount: sendAmount }],
        1,
        undefined,
        "AllowFullyTransparent"
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.operationId).toBeDefined();

      console.log(`Operation ID: ${response.data.data.operationId}`);

      // Wait for operation to complete
      const operation = await waitForOperation(response.data.data.operationId);
      console.log(`Transaction successful: ${operation.result.txid}`);
    });

    // Test 2: Transparent to Shielded transaction
    it("should successfully send from transparent to shielded address", async () => {
      console.log("\n=== TEST: Transparent -> Shielded ===");

      // Get unspent outputs for transparent sender
      await delay(1000);
      const unspentResponse = await testClient.listUnspent(1);

      if (!unspentResponse.data.success || !unspentResponse.data.data || unspentResponse.data.data.length === 0) {
        console.log("Skipping test - no unspent outputs available");
        return;
      }

      // Find transparent address with balance
      const balanceMap = new Map<string, number>();
      unspentResponse.data.data.forEach((utxo: any) => {
        if (utxo.address && utxo.address.startsWith("t")) {
          const current = balanceMap.get(utxo.address) || 0;
          balanceMap.set(utxo.address, current + utxo.amount);
        }
      });

      if (balanceMap.size === 0) {
        console.log("Skipping test - no transparent addresses with balance");
        return;
      }

      let senderAddress = "";
      let maxBalance = 0;
      balanceMap.forEach((balance, address) => {
        if (balance > maxBalance) {
          maxBalance = balance;
          senderAddress = address;
        }
      });

      if (maxBalance < 0.001) {
        console.log("Skipping test - insufficient balance");
        return;
      }

      // Create new shielded account for receiver
      await delay(1000);
      const newAccountResponse = await testClient.getNewAccount();

      if (!newAccountResponse.data.success) {
        console.log("Skipping test - could not create new account");
        return;
      }

      const receiverAddress = newAccountResponse.data.data.address;

      console.log(`Sender (transparent): ${senderAddress} (balance: ${maxBalance})`);
      console.log(`Receiver (shielded): ${receiverAddress}`);

      const sendAmount = 0.0001;

      // Get initial balances
      const initialSenderBalance = await getBalanceForAddress(senderAddress);
      const initialReceiverBalance = await getBalanceForAddress(receiverAddress);

      console.log(`Initial sender balance: ${initialSenderBalance}`);
      console.log(`Initial receiver balance: ${initialReceiverBalance}`);

      // Send transaction
      await delay(1000);
      const response = await testClient.zSendMany(
        senderAddress,
        [{ address: receiverAddress, amount: sendAmount }],
        1,
        undefined,
        "AllowRevealedSenders"
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.operationId).toBeDefined();

      console.log(`Operation ID: ${response.data.data.operationId}`);

      // Wait for operation to complete
      const operation = await waitForOperation(response.data.data.operationId);
      console.log(`Transaction successful: ${operation.result.txid}`);
    });

    // Test 3: Shielded to Shielded transaction
    it("should successfully send from shielded to shielded address", async () => {
      console.log("\n=== TEST: Shielded -> Shielded ===");

      // Get all accounts
      await delay(1000);
      const accountsResponse = await testClient.listAccounts();

      if (!accountsResponse.data.success || !accountsResponse.data.data || accountsResponse.data.data.length === 0) {
        console.log("Skipping test - no accounts available");
        return;
      }

      // Find account with shielded balance
      let senderAccount = null;
      let senderAddress = "";
      let maxBalance = 0;

      for (const account of accountsResponse.data.data) {
        await delay(1000);
        const balanceResponse = await testClient.getBalanceForAccount(account.account);

        if (balanceResponse.data.success) {
          const pools = balanceResponse.data.data.pools;
          let totalBalance = 0;

          // Check for sapling or orchard balance (shielded pools)
          if (pools.sapling) totalBalance += pools.sapling.valueZat / 100000000;
          if (pools.orchard) totalBalance += pools.orchard.valueZat / 100000000;

          if (totalBalance > maxBalance) {
            maxBalance = totalBalance;
            senderAccount = account.account;

            // Get address for this account
            await delay(1000);
            const addressResponse = await testClient.getAddressForAccount(account.account);
            if (addressResponse.data.success) {
              senderAddress = addressResponse.data.data.address;
            }
          }
        }
      }

      if (!senderAccount || maxBalance < 0.001) {
        console.log("Skipping test - no shielded addresses with sufficient balance");
        return;
      }

      // Create new shielded account for receiver
      await delay(1000);
      const newAccountResponse = await testClient.getNewAccount();

      if (!newAccountResponse.data.success) {
        console.log("Skipping test - could not create new account");
        return;
      }

      const receiverAddress = newAccountResponse.data.data.address;

      console.log(`Sender (shielded): ${senderAddress} (balance: ${maxBalance})`);
      console.log(`Receiver (shielded): ${receiverAddress}`);

      const sendAmount = 0.0001;

      // Get initial balances
      const initialSenderBalance = await getBalanceForAddress(senderAddress);
      const initialReceiverBalance = await getBalanceForAddress(receiverAddress);

      console.log(`Initial sender balance: ${initialSenderBalance}`);
      console.log(`Initial receiver balance: ${initialReceiverBalance}`);

      // Send transaction with FullPrivacy policy (shielded to shielded)
      await delay(1000);
      const response = await testClient.zSendMany(
        senderAddress,
        [{ address: receiverAddress, amount: sendAmount }],
        1,
        undefined,
        "FullPrivacy"
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.operationId).toBeDefined();

      console.log(`Operation ID: ${response.data.data.operationId}`);

      // Wait for operation to complete
      const operation = await waitForOperation(response.data.data.operationId);
      console.log(`Transaction successful: ${operation.result.txid}`);
    });

    // Test 4: Multiple recipients
    it("should successfully send to multiple recipients", async () => {
      console.log("\n=== TEST: Multiple Recipients ===");

      // Get sender address with balance
      await delay(1000);
      const unspentResponse = await testClient.listUnspent(1);

      if (!unspentResponse.data.success || !unspentResponse.data.data || unspentResponse.data.data.length === 0) {
        console.log("Skipping test - no unspent outputs available");
        return;
      }

      const balanceMap = new Map<string, number>();
      unspentResponse.data.data.forEach((utxo: any) => {
        if (utxo.address && utxo.address.startsWith("t")) {
          const current = balanceMap.get(utxo.address) || 0;
          balanceMap.set(utxo.address, current + utxo.amount);
        }
      });

      if (balanceMap.size === 0) {
        console.log("Skipping test - no transparent addresses with balance");
        return;
      }

      let senderAddress = "";
      let maxBalance = 0;
      balanceMap.forEach((balance, address) => {
        if (balance > maxBalance) {
          maxBalance = balance;
          senderAddress = address;
        }
      });

      if (maxBalance < 0.001) {
        console.log("Skipping test - insufficient balance");
        return;
      }

      // Create two recipient addresses
      await delay(1000);
      const recipient1Response = await testClient.getNewAccount();
      await delay(1000);
      const recipient2Response = await testClient.getNewAccount();

      if (!recipient1Response.data.success || !recipient2Response.data.success) {
        console.log("Skipping test - could not create recipient accounts");
        return;
      }

      const recipient1 = recipient1Response.data.data.address;
      const recipient2 = recipient2Response.data.data.address;

      console.log(`Sender: ${senderAddress} (balance: ${maxBalance})`);
      console.log(`Recipient 1: ${recipient1}`);
      console.log(`Recipient 2: ${recipient2}`);

      const sendAmount = 0.00005;

      // Send to multiple recipients
      await delay(1000);
      const response = await testClient.zSendMany(
        senderAddress,
        [
          { address: recipient1, amount: sendAmount },
          { address: recipient2, amount: sendAmount },
        ],
        1,
        undefined,
        "AllowRevealedSenders"
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.operationId).toBeDefined();

      console.log(`Operation ID: ${response.data.data.operationId}`);

      // Wait for operation to complete
      const operation = await waitForOperation(response.data.data.operationId);
      console.log(`Transaction successful: ${operation.result.txid}`);
    });

    // Test operation status checking
    it("should check operation status", async () => {
      console.log("\n=== TEST: Operation Status ===");

      // Get all operation statuses
      await delay(1000);
      const response = await testClient.zGetOperationStatus();

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);

      console.log(`Found ${response.data.data.length} operations`);

      if (response.data.data.length > 0) {
        console.log("Sample operation:", JSON.stringify(response.data.data[0], null, 2));
      }
    });
  });
});
