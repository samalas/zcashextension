import testClient from "../utils/testClient";

// Helper function to add delay between tests to avoid rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Wallet Endpoints", () => {
  // Add delay between each test to avoid rate limiting
  beforeEach(async () => {
    await delay(1000); // 1 second delay between tests
  });
  // describe('GET /api/zcash/wallet/info', () => {
  //   it('should return wallet information', async () => {
  //     const response = await testClient.getWalletInfo();

  //     expect(response.status).toBe(200);
  //     expect(response.data.success).toBe(true);
  //     expect(response.data.data).toBeDefined();
  //     expect(response.data.data.walletversion).toBeDefined();
  //     expect(response.data.data.balance).toBeDefined();
  //     expect(typeof response.data.data.balance).toBe('number');
  //   });
  // });

  // describe('GET /api/zcash/wallet/balance', () => {
  //   it('should return wallet balance with default confirmations', async () => {
  //     const response = await testClient.getBalance();

  //     expect(response.status).toBe(200);
  //     expect(response.data.success).toBe(true);
  //     expect(response.data.data.balance).toBeDefined();
  //     expect(typeof response.data.data.balance).toBe('number');
  //     expect(response.data.data.minConfirmations).toBe(1);
  //   });

  //   it('should return balance with custom min confirmations', async () => {
  //     const response = await testClient.getBalance(6);

  //     expect(response.status).toBe(200);
  //     expect(response.data.success).toBe(true);
  //     expect(response.data.data.balance).toBeDefined();
  //     expect(response.data.data.minConfirmations).toBe(6);
  //   });

  //   it('should return balance with 0 confirmations (including unconfirmed)', async () => {
  //     const response = await testClient.getBalance(0);

  //     expect(response.status).toBe(200);
  //     expect(response.data.success).toBe(true);
  //     expect(response.data.data.balance).toBeDefined();
  //     expect(response.data.data.minConfirmations).toBe(0);
  //   });
  // });

  describe("POST /api/zcash/wallet/newaccount", () => {
    it("should generate a new account", async () => {
      const response = await testClient.getNewAccount();

      console.log(
        "New account response:",
        JSON.stringify(response.data, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.address).toBeDefined();
      expect(typeof response.data.data.address).toBe("string");
      expect(response.data.data.address.length).toBeGreaterThan(0);
      expect(response.data.data.account).toBeDefined();
      expect(typeof response.data.data.account).toBe("number");
    });

    it("should get address for newly created account", async () => {
      // First create a new account
      const newAccountResponse = await testClient.getNewAccount();

      console.log(
        "New account created:",
        JSON.stringify(newAccountResponse.data, null, 2)
      );

      expect(newAccountResponse.status).toBe(200);
      expect(newAccountResponse.data.success).toBe(true);

      const accountNumber = newAccountResponse.data.data.account;
      const originalAddress = newAccountResponse.data.data.address;

      // Add delay to avoid rate limiting
      await delay(1000);

      // Now get another address for the same account
      const addressResponse =
        await testClient.getAddressForAccount(accountNumber);

      console.log(
        "Address for account response:",
        JSON.stringify(addressResponse.data, null, 2)
      );

      expect(addressResponse.status).toBe(200);
      expect(addressResponse.data.success).toBe(true);
      expect(addressResponse.data.data.account).toBe(accountNumber);
      expect(addressResponse.data.data.address).toBeDefined();
      expect(typeof addressResponse.data.data.address).toBe("string");
      expect(addressResponse.data.data.address.length).toBeGreaterThan(0);
      expect(addressResponse.data.data.receiverTypes).toBeDefined();
      expect(Array.isArray(addressResponse.data.data.receiverTypes)).toBe(true);

      console.log("Account number:", accountNumber);
      console.log("Original address:", originalAddress);
      console.log(
        "New address for same account:",
        addressResponse.data.data.address
      );
      console.log("Receiver types:", addressResponse.data.data.receiverTypes);
    });
  });

  describe("POST /api/zcash/wallet/getbalanceforaccount", () => {
    it("should return balance for an account with default parameters", async () => {
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

      // Get balance for the account
      const balanceResponse = await testClient.getBalanceForAccount(accountNumber);

      console.log(
        "Balance response:",
        JSON.stringify(balanceResponse.data, null, 2)
      );

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.data.success).toBe(true);
      expect(balanceResponse.data.data.pools).toBeDefined();
      expect(typeof balanceResponse.data.data.pools).toBe("object");
      expect(balanceResponse.data.data.minimum_confirmations).toBeDefined();
      expect(balanceResponse.data.data.minimum_confirmations).toBe(1); // default minconf
    });

    it("should return balance for account with custom minconf", async () => {
      // First create a new account
      const newAccountResponse = await testClient.getNewAccount();

      expect(newAccountResponse.status).toBe(200);
      expect(newAccountResponse.data.success).toBe(true);

      const accountNumber = newAccountResponse.data.data.account;

      // Add delay to avoid rate limiting
      await delay(1000);

      // Get balance with custom minconf
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

    it("should validate pool structure when balance exists", async () => {
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

      // If any pool exists, validate its structure
      if (pools.transparent) {
        expect(pools.transparent.valueZat).toBeDefined();
        expect(typeof pools.transparent.valueZat).toBe("number");
      }

      if (pools.sapling) {
        expect(pools.sapling.valueZat).toBeDefined();
        expect(typeof pools.sapling.valueZat).toBe("number");
      }

      if (pools.orchard) {
        expect(pools.orchard.valueZat).toBeDefined();
        expect(typeof pools.orchard.valueZat).toBe("number");
      }
    });

    // it("should generate a new address with account name", async () => {
    //   const response = await testClient.getNewAccount();

    //   expect(response.status).toBe(200);
    //   expect(response.data.success).toBe(true);
    //   expect(response.data.data.address).toBeDefined();
    // });

    // it("should generate unique addresses on multiple calls", async () => {
    //   const response1 = await testClient.getNewAccount();

    //   // Add delay before second request to avoid rate limiting
    //   await delay(1000);

    //   const response2 = await testClient.getNewAccount();

    //   expect(response1.status).toBe(200);
    //   expect(response2.status).toBe(200);
    //   expect(response1.data.data.address).not.toBe(response2.data.data.address);
    // });
  });

  // describe("GET /api/zcash/wallet/dumpprivkey/:address", () => {
  //   it("should dump private key and import it back", async () => {
  //     // First create a new account to get an address
  //     const newAccountResponse = await testClient.getNewAccount();

  //     console.log("New account for dumpprivkey test:", JSON.stringify(newAccountResponse.data, null, 2));

  //     expect(newAccountResponse.status).toBe(200);
  //     expect(newAccountResponse.data.success).toBe(true);

  //     const testAddress = newAccountResponse.data.data.address;

  //     // Add delay to avoid rate limiting
  //     await delay(1000);

  //     // Try to dump the private key for the address
  //     const dumpResponse = await testClient.dumpPrivateKey(testAddress);

  //     console.log("Dump private key response:", JSON.stringify(dumpResponse.data, null, 2));

  //     if (dumpResponse.status === 200 && dumpResponse.data.success) {
  //       expect(dumpResponse.data.data.privateKey).toBeDefined();
  //       expect(typeof dumpResponse.data.data.privateKey).toBe("string");
  //       expect(dumpResponse.data.data.address).toBe(testAddress);
  //       console.log("Private key for address", testAddress, ":", dumpResponse.data.data.privateKey);

  //       // Add delay before importing
  //       await delay(1000);

  //       // Now test importing the private key back
  //       const importResponse = await testClient.importPrivateKey(dumpResponse.data.data.privateKey);

  //       console.log("Import private key response:", JSON.stringify(importResponse.data, null, 2));

  //       expect(importResponse.status).toBe(200);
  //       expect(importResponse.data.success).toBe(true);
  //       console.log("Successfully imported private key back into wallet");
  //     } else {
  //       // Unified addresses may not work with dumpprivkey (only transparent addresses do)
  //       console.log("Note: dumpprivkey only works with transparent addresses (t-addresses).");
  //       console.log("The unified address may contain transparent, sapling, and orchard receivers.");
  //       console.log("You may need to extract the transparent component or use a different method.");
  //       console.log("Error:", dumpResponse.data);
  //     }
  //   });
  // });

  // describe('GET /api/zcash/wallet/unspent', () => {
  //   it('should list unspent transactions with default parameters', async () => {
  //     const response = await testClient.listUnspent();

  //     expect(response.status).toBe(200);
  //     expect(response.data.success).toBe(true);
  //     expect(Array.isArray(response.data.data)).toBe(true);
  //   });

  //   it('should list unspent with custom min confirmations', async () => {
  //     const response = await testClient.listUnspent(6);

  //     expect(response.status).toBe(200);
  //     expect(response.data.success).toBe(true);
  //     expect(Array.isArray(response.data.data)).toBe(true);
  //   });

  //   it('should list unspent with min and max confirmations', async () => {
  //     const response = await testClient.listUnspent(1, 100);

  //     expect(response.status).toBe(200);
  //     expect(response.data.success).toBe(true);
  //     expect(Array.isArray(response.data.data)).toBe(true);
  //   });

  //   it('should validate unspent transaction structure if any exist', async () => {
  //     const response = await testClient.listUnspent();

  //     expect(response.status).toBe(200);
  //     expect(Array.isArray(response.data.data)).toBe(true);

  //     if (response.data.data.length > 0) {
  //       const utxo = response.data.data[0];
  //       expect(utxo.txid).toBeDefined();
  //       expect(utxo.vout).toBeDefined();
  //       expect(utxo.address).toBeDefined();
  //       expect(utxo.amount).toBeDefined();
  //       expect(typeof utxo.amount).toBe('number');
  //       expect(utxo.confirmations).toBeDefined();
  //     }
  //   });
  // });

  // describe('GET /api/zcash/address/validate/:address', () => {
  //   let validAddress: string;

  //   beforeAll(async () => {
  //     // Generate a valid address for testing
  //     const response = await testClient.getNewAccount();
  //     validAddress = response.data.data.address;
  //   });

  //   it('should validate a valid address', async () => {
  //     const response = await testClient.validateAddress(validAddress);

  //     expect(response.status).toBe(200);
  //     expect(response.data.success).toBe(true);
  //     expect(response.data.data).toBeDefined();
  //     expect(response.data.data.isvalid).toBe(true);
  //     expect(response.data.data.address).toBe(validAddress);
  //   });

  //   it('should invalidate an invalid address', async () => {
  //     const invalidAddress = 'invalid-zcash-address-12345';
  //     const response = await testClient.validateAddress(invalidAddress);

  //     expect(response.status).toBe(200);
  //     expect(response.data.success).toBe(true);
  //     expect(response.data.data.isvalid).toBe(false);
  //   });

  //   it('should handle empty address', async () => {
  //     const response = await testClient.validateAddress('');

  //     expect(response.status).toBe(200);
  //     expect(response.data.data.isvalid).toBe(false);
  //   });
  // });

  describe("GET /api/zcash/wallet/listaccounts", () => {
    it("should list all accounts created with z_getnewaccount", async () => {
      const response = await testClient.listAccounts();

      console.log(
        "List accounts response:",
        JSON.stringify(response.data, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it("should validate account structure if accounts exist", async () => {
      const response = await testClient.listAccounts();

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);

      if (response.data.data.length > 0) {
        const account = response.data.data[0];
        expect(account.account).toBeDefined();
        expect(typeof account.account).toBe("number");
        expect(account.addresses).toBeDefined();
        expect(Array.isArray(account.addresses)).toBe(true);

        if (account.addresses.length > 0) {
          const address = account.addresses[0];
          expect(address.diversifier).toBeDefined();
          expect(address.ua).toBeDefined();
          expect(typeof address.ua).toBe("string");
        }

        console.log("Sample account:", JSON.stringify(account, null, 2));
      }
    });

    it("should include newly created account in list", async () => {
      // First create a new account
      const newAccountResponse = await testClient.getNewAccount();

      expect(newAccountResponse.status).toBe(200);
      expect(newAccountResponse.data.success).toBe(true);

      const accountNumber = newAccountResponse.data.data.account;

      // Add delay to avoid rate limiting
      await delay(1000);

      // Now list all accounts
      const listResponse = await testClient.listAccounts();

      console.log(
        "List accounts after creating new account:",
        JSON.stringify(listResponse.data, null, 2)
      );

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(Array.isArray(listResponse.data.data)).toBe(true);

      // Check if the newly created account is in the list
      const accountExists = listResponse.data.data.some(
        (acc: any) => acc.account === accountNumber
      );
      expect(accountExists).toBe(true);
    });
  });

  describe("GET /api/zcash/wallet/listaddresses", () => {
    it("should list all addresses managed by the wallet", async () => {
      const response = await testClient.listAddresses();

      console.log(
        "List addresses response:",
        JSON.stringify(response.data, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it("should validate address source structure if addresses exist", async () => {
      const response = await testClient.listAddresses();

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);

      if (response.data.data.length > 0) {
        const source = response.data.data[0];
        expect(source.source).toBeDefined();
        expect(typeof source.source).toBe("string");

        console.log("Sample address source:", JSON.stringify(source, null, 2));

        // Check for at least one type of addresses
        const hasAddressType =
          source.transparent !== undefined ||
          source.sprout !== undefined ||
          source.sapling !== undefined ||
          source.unified !== undefined;

        expect(hasAddressType).toBe(true);
      }
    });

    it("should validate transparent address structure if exists", async () => {
      const response = await testClient.listAddresses();

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const sourcesWithTransparent = response.data.data.filter(
        (source: any) => source.transparent
      );

      if (sourcesWithTransparent.length > 0) {
        const transparent = sourcesWithTransparent[0].transparent;
        expect(transparent.addresses).toBeDefined();
        expect(Array.isArray(transparent.addresses)).toBe(true);

        if (transparent.changeAddresses) {
          expect(Array.isArray(transparent.changeAddresses)).toBe(true);
        }

        console.log(
          "Transparent addresses:",
          JSON.stringify(transparent, null, 2)
        );
      }
    });

    it("should validate unified address structure if exists", async () => {
      const response = await testClient.listAddresses();

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const sourcesWithUnified = response.data.data.filter(
        (source: any) => source.unified
      );

      if (sourcesWithUnified.length > 0) {
        const unified = sourcesWithUnified[0].unified;
        expect(Array.isArray(unified)).toBe(true);

        if (unified.length > 0) {
          const unifiedEntry = unified[0];
          expect(unifiedEntry.account).toBeDefined();
          expect(typeof unifiedEntry.account).toBe("number");
          expect(unifiedEntry.addresses).toBeDefined();
          expect(Array.isArray(unifiedEntry.addresses)).toBe(true);

          if (unifiedEntry.addresses.length > 0) {
            const address = unifiedEntry.addresses[0];
            expect(address.diversifier_index).toBeDefined();
            expect(address.receiver_types).toBeDefined();
            expect(Array.isArray(address.receiver_types)).toBe(true);
            expect(address.address).toBeDefined();
            expect(typeof address.address).toBe("string");
          }

          console.log(
            "Unified addresses:",
            JSON.stringify(unifiedEntry, null, 2)
          );
        }
      }
    });
  });
});
