import axios, { AxiosInstance } from "axios";
import config from "../../src/config/config";

class TestClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = `${process.env.ZCASH_RPC_URL_DEVNET ?? `http://localhost:${config.port}`}`;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        "x-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      validateStatus: () => true, // Don't throw on any status code
    });
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  // Health check
  async healthCheck() {
    return this.client.get("/health");
  }

  // Blockchain endpoints
  async getBlockchainInfo() {
    return this.client.get("/api/zcash/blockchain/info");
  }

  async getBlockCount() {
    return this.client.get("/api/zcash/blockchain/blockcount");
  }

  async getBlockHash(height: number) {
    return this.client.get(`/api/zcash/blockchain/blockhash/${height}`);
  }

  async getBlock(blockhash: string, verbosity?: number) {
    const params = verbosity !== undefined ? { verbosity } : {};
    return this.client.get(`/api/zcash/blockchain/block/${blockhash}`, {
      params,
    });
  }

  // Wallet endpoints
  async getWalletInfo() {
    return this.client.get("/api/zcash/wallet/info");
  }

  async getBalance(minConfirmations?: number) {
    const params = minConfirmations !== undefined ? { minConfirmations } : {};
    return this.client.get("/api/zcash/wallet/balance", { params });
  }

  async getNewAccount() {
    return this.client.post("/api/zcash/wallet/newaccount", {});
  }

  async dumpPrivateKey(address: string) {
    return this.client.get(`/api/zcash/wallet/dumpprivkey/${address}`);
  }

  async getAddressForAccount(account: number, receiverTypes?: string[], diversifierIndex?: number) {
    const body: any = { account };
    if (receiverTypes !== undefined) body.receiverTypes = receiverTypes;
    if (diversifierIndex !== undefined) body.diversifierIndex = diversifierIndex;
    return this.client.post("/api/zcash/wallet/getaddressforaccount", body);
  }

  async getBalanceForAccount(account: number, minconf?: number, asOfHeight?: number) {
    const body: any = { account };
    if (minconf !== undefined) body.minconf = minconf;
    if (asOfHeight !== undefined) body.asOfHeight = asOfHeight;
    return this.client.post("/api/zcash/wallet/getbalanceforaccount", body);
  }

  async importPrivateKey(privateKey: string, label?: string, rescan?: boolean) {
    const body: any = { privateKey };
    if (label !== undefined) body.label = label;
    if (rescan !== undefined) body.rescan = rescan;
    return this.client.post("/api/zcash/wallet/importprivkey", body);
  }

  async listUnspent(minConfirmations?: number, maxConfirmations?: number) {
    const params: any = {};
    if (minConfirmations !== undefined)
      params.minConfirmations = minConfirmations;
    if (maxConfirmations !== undefined)
      params.maxConfirmations = maxConfirmations;
    return this.client.get("/api/zcash/wallet/unspent", { params });
  }

  async listAccounts() {
    return this.client.get("/api/zcash/wallet/listaccounts");
  }

  async listAddresses() {
    return this.client.get("/api/zcash/wallet/listaddresses");
  }

  // Transaction endpoints
  async getTransaction(txid: string) {
    return this.client.get(`/api/zcash/transaction/${txid}`);
  }

  async listTransactions(count?: number, skip?: number) {
    const params: any = {};
    if (count !== undefined) params.count = count;
    if (skip !== undefined) params.skip = skip;
    return this.client.get("/api/zcash/transactions", { params });
  }

  async getRawTransaction(txid: string, verbose?: boolean) {
    const params = verbose !== undefined ? { verbose } : {};
    return this.client.get(`/api/zcash/transaction/${txid}/raw`, { params });
  }

  async sendToAddress(address: string, amount: number, comment?: string) {
    return this.client.post("/api/zcash/transaction/send", {
      address,
      amount,
      comment,
    });
  }

  async zSendMany(
    fromAddress: string,
    recipients: Array<{ address: string; amount: number; memo?: string }>,
    minconf?: number,
    fee?: number,
    privacyPolicy?: string
  ) {
    return this.client.post("/api/zcash/transaction/z_sendmany", {
      fromAddress,
      recipients,
      minconf,
      fee,
      privacyPolicy,
    });
  }

  async zGetOperationStatus(operationIds?: string[]) {
    return this.client.post("/api/zcash/transaction/z_getoperationstatus", {
      operationIds,
    });
  }

  async zGetOperationResult(operationIds?: string[]) {
    return this.client.post("/api/zcash/transaction/z_getoperationresult", {
      operationIds,
    });
  }

  // Address validation
  async validateAddress(address: string) {
    return this.client.get(`/api/zcash/address/validate/${address}`);
  }

  // Network endpoints
  async getNetworkInfo() {
    return this.client.get("/api/zcash/network/info");
  }

  async getConnectionCount() {
    return this.client.get("/api/zcash/network/connections");
  }

  // Mining endpoints
  async getMiningInfo() {
    return this.client.get("/api/zcash/mining/info");
  }

  // Fee estimation
  async estimateFee(nblocks?: number) {
    const params = nblocks !== undefined ? { nblocks } : {};
    return this.client.get("/api/zcash/fee/estimate", { params });
  }

  // Test with invalid API key
  async makeRequestWithInvalidKey(endpoint: string) {
    return axios.get(`${this.baseURL}${endpoint}`, {
      headers: {
        "x-api-key": "invalid-key",
      },
      validateStatus: () => true,
    });
  }

  // Test without API key
  async makeRequestWithoutKey(endpoint: string) {
    return axios.get(`${this.baseURL}${endpoint}`, {
      validateStatus: () => true,
    });
  }
}

export default new TestClient();
