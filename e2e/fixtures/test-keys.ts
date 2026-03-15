import { config } from "dotenv";
import { resolve } from "path";

// Load from root .env (shared with frontend/middleware)
config({ path: resolve(__dirname, "../../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}. Copy .env.example to .env and fill in values.`);
  }
  return value;
}

export const DEPLOYER_KEY = requireEnv("DEPLOYER_PRIVATE_KEY");
export const ALICE_KEY = requireEnv("ALICE_PRIVATE_KEY");
export const BOB_KEY = requireEnv("BOB_PRIVATE_KEY");
export const CHARLIE_KEY = requireEnv("CHARLIE_PRIVATE_KEY");
