import axios, { AxiosInstance } from "axios";
import config from "../config/config";
import {
  ZCashRPCRequest,
  ZCashRPCResponse,
  AccountBalanceResponse,
  ZSendManyRecipient,
  PrivacyPolicy,
  ZOperationStatus
} from "../types/zcash.types";

class ZCashService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.zcash.rpcUrl,
      auth: {
        username: config.zcash.rpcUsername,
        password: config.zcash.rpcPassword,
      },
      headers: {
        "Content-Type": "text/plain",
      },
      timeout: 30000,
    });
  }

  /**
   * Make a generic RPC call to the ZCash node via JSON-RPC
   */
  async rpcCall<T = any>(method: string, params: any[] = []): Promise<T> {
    const request: ZCashRPCRequest = {
      jsonrpc: "1.0",
      id: "express-rpc",
      method,
      params,
    };

    try {
      const response = await this.client.post<ZCashRPCResponse<T>>("", request);

      if (response.data.error) {
        throw new Error(
          `RPC Error: ${response.data.error.message} (Code: ${response.data.error.code})`
        );
      }

      return response.data.result;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `ZCash RPC Error: ${error.response.data?.error?.message || error.message}`
        );
      }
      throw new Error(`Network Error: ${error.message}`);
    }
  }

  /**
   * Get blockchain information
   */
  async getBlockchainInfo() {
    return this.rpcCall("getblockchaininfo");
  }

  /**
   * Get wallet information
   */
  async getWalletInfo() {
    return this.rpcCall("getwalletinfo");
  }

  /**
   * Get balance
   */
  async getBalance(minConfirmations: number = 1) {
    return this.rpcCall("getbalance", ["*", minConfirmations]);
  }

  /**
   * Get new account
   */
  async getNewAccount() {
    return this.rpcCall<{ account: number }>("z_getnewaccount");
  }

  /**
   * Get address for account
   */
  async getAddressForAccount(account: number, diversifierIndex?: number) {
    const params = diversifierIndex !== undefined ? [account, [diversifierIndex]] : [account];
    return this.rpcCall<{ receiver_types: string[]; address: string }>("z_getaddressforaccount", params);
  }

  /**
   * Get balance for account
   */
  async getBalanceForAccount(account: number, minconf?: number, asOfHeight?: number) {
    const params: any[] = [account];
    if (minconf !== undefined) params.push(minconf);
    if (asOfHeight !== undefined) params.push(asOfHeight);
    return this.rpcCall<AccountBalanceResponse>("z_getbalanceforaccount", params);
  }

  /**
   * Dump private key for a transparent address
   */
  async dumpPrivKey(address: string) {
    return this.rpcCall<string>("dumpprivkey", [address]);
  }

  /**
   * Import private key
   */
  async importPrivKey(privateKey: string, label?: string, rescan?: boolean) {
    const params: any[] = [privateKey];
    if (label !== undefined) params.push(label);
    if (rescan !== undefined) params.push(rescan);
    return this.rpcCall("importprivkey", params);
  }

  /**
   * Get transaction by txid
   */
  async getTransaction(txid: string) {
    return this.rpcCall("gettransaction", [txid]);
  }

  /**
   * List transactions
   */
  async listTransactions(count: number = 10, skip: number = 0) {
    return this.rpcCall("listtransactions", ["*", count, skip]);
  }

  /**
   * Send to address
   */
  async sendToAddress(address: string, amount: number, comment: string = "") {
    return this.rpcCall<string>("sendtoaddress", [address, amount, comment]);
  }

  /**
   * Validate address
   */
  async validateAddress(address: string) {
    return this.rpcCall("validateaddress", [address]);
  }

  /**
   * Get block by hash
   */
  async getBlock(blockhash: string, verbosity: number = 1) {
    return this.rpcCall("getblock", [blockhash, verbosity]);
  }

  /**
   * Get block count
   */
  async getBlockCount() {
    return this.rpcCall<number>("getblockcount");
  }

  /**
   * Get block hash by height
   */
  async getBlockHash(height: number) {
    return this.rpcCall<string>("getblockhash", [height]);
  }

  /**
   * Get network info
   */
  async getNetworkInfo() {
    return this.rpcCall("getnetworkinfo");
  }

  /**
   * Get mining info
   */
  async getMiningInfo() {
    return this.rpcCall("getmininginfo");
  }

  /**
   * List unspent transactions
   */
  async listUnspent(
    minConfirmations: number = 1,
    maxConfirmations: number = 9999999
  ) {
    return this.rpcCall("listunspent", [minConfirmations, maxConfirmations]);
  }

  /**
   * Get raw transaction
   */
  async getRawTransaction(txid: string, verbose: boolean = false) {
    return this.rpcCall("getrawtransaction", [txid, verbose ? 1 : 0]);
  }

  /**
   * Estimate fee
   */
  async estimateFee(nblocks: number = 6) {
    return this.rpcCall("estimatefee", [nblocks]);
  }

  /**
   * Get connection count
   */
  async getConnectionCount() {
    return this.rpcCall<number>("getconnectioncount");
  }

  /**
   * List accounts created with z_getnewaccount
   */
  async listAccounts() {
    return this.rpcCall("z_listaccounts");
  }

  /**
   * List addresses managed by the wallet
   */
  async listAddresses() {
    return this.rpcCall("listaddresses");
  }

  /**
   * Send a transaction with multiple recipients using z_sendmany
   * Returns an operation ID that can be used to check the status
   */
  async zSendMany(
    fromAddress: string,
    recipients: ZSendManyRecipient[],
    minconf?: number,
    fee?: number,
    privacyPolicy?: PrivacyPolicy
  ) {
    const params: any[] = [fromAddress, recipients];

    if (minconf !== undefined) params.push(minconf);
    if (fee !== undefined) {
      if (minconf === undefined) params.push(10); // default minconf
      params.push(fee);
    }
    if (privacyPolicy !== undefined) {
      if (minconf === undefined) params.push(10); // default minconf
      if (fee === undefined) params.push(null); // null for default fee
      params.push(privacyPolicy);
    }

    return this.rpcCall<string>("z_sendmany", params);
  }

  /**
   * Get the status of async operations
   */
  async zGetOperationStatus(operationIds?: string[]) {
    const params = operationIds ? [operationIds] : [];
    return this.rpcCall<ZOperationStatus[]>("z_getoperationstatus", params);
  }

  /**
   * Get the result of completed operations and remove them from memory
   */
  async zGetOperationResult(operationIds?: string[]) {
    const params = operationIds ? [operationIds] : [];
    return this.rpcCall<ZOperationStatus[]>("z_getoperationresult", params);
  }
}

export default new ZCashService();
