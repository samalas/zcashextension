import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  zcash: {
    rpcUrl: string;
    rpcUsername: string;
    rpcPassword: string;
    apiKey: string;
  };
  apiKey: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  zcash: {
    rpcUrl: process.env.ZCASH_RPC_URL || "http://localhost:18232",
    rpcUsername: process.env.ZCASH_RPC_USERNAME || "zcashrpc",
    rpcPassword: process.env.ZCASH_RPC_PASSWORD || "your_secure_password",
    apiKey: process.env.ZCASH_API_KEY || "",
  },
  apiKey: process.env.API_KEY || "",
};

export default config;
