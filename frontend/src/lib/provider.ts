import { ethers } from "ethers";
import { JSON_RPC_URL } from "./constants";

export const readProvider = new ethers.JsonRpcProvider(JSON_RPC_URL);
