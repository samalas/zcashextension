export interface ZCashRPCRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params: any[];
}

export interface ZCashRPCResponse<T = any> {
  result: T;
  error: {
    code: number;
    message: string;
  } | null;
  id: string | number;
}

export interface BlockchainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  difficulty: number;
  verificationprogress: number;
  chainwork: string;
}

export interface WalletInfo {
  walletversion: number;
  balance: number;
  unconfirmed_balance: number;
  immature_balance: number;
  txcount: number;
  keypoololdest: number;
  keypoolsize: number;
}

export interface TransactionInfo {
  txid: string;
  amount: number;
  confirmations: number;
  blockhash?: string;
  blockindex?: number;
  blocktime?: number;
  time: number;
  timereceived: number;
}

export interface PoolBalance {
  valueZat: number;
}

export interface AccountBalancePools {
  transparent?: PoolBalance;
  sapling?: PoolBalance;
  orchard?: PoolBalance;
}

export interface AccountBalanceResponse {
  pools: AccountBalancePools;
  minimum_confirmations: number;
}

export interface ZSendManyRecipient {
  address: string;
  amount: number;
  memo?: string;
}

export type PrivacyPolicy =
  | "FullPrivacy"
  | "LegacyCompat"
  | "AllowRevealedAmounts"
  | "AllowRevealedRecipients"
  | "AllowRevealedSenders"
  | "AllowFullyTransparent"
  | "AllowLinkingAccountAddresses"
  | "NoPrivacy";

export interface ZOperationStatus {
  id: string;
  status: "queued" | "executing" | "success" | "failed" | "cancelled";
  creation_time: number;
  result?: {
    txid: string;
  };
  error?: {
    code: number;
    message: string;
  };
  method: string;
  params: any;
}
