"use client";

import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { useAts } from "@/contexts/ats-context";
import { CPC_SECURITY_ID, JSON_RPC_URL } from "@/lib/constants";

const AGENT_ROLE = "0xc4aed0454da9bde6defa5baf93bb49d4690626fc243d138104e12d1def783ea6";
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

const TOKEN_ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function isPaused() view returns (bool)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function isFrozen(address) view returns (bool)",
  "function mint(address to, uint256 amount)",
  "function pause()",
  "function unpause()",
  "function setAddressFrozen(address addr, bool freeze)",
  "function transfer(address to, uint256 amount)",
];

function getReadProvider() {
  return new ethers.JsonRpcProvider(JSON_RPC_URL);
}

function getReadContract() {
  return new ethers.Contract(CPC_SECURITY_ID, TOKEN_ABI, getReadProvider());
}

export function useTokenRead() {
  const totalSupply = useQuery({
    queryKey: ["token", "totalSupply"],
    queryFn: async () => {
      const contract = getReadContract();
      const result: bigint = await contract.totalSupply();
      return result;
    },
    refetchInterval: 10_000,
  });

  const paused = useQuery({
    queryKey: ["token", "paused"],
    queryFn: async () => {
      const contract = getReadContract();
      const result: boolean = await contract.isPaused();
      return result;
    },
    refetchInterval: 10_000,
  });

  return { totalSupply, paused };
}

export function useTokenBalance(address: string | undefined) {
  return useQuery({
    queryKey: ["token", "balanceOf", address],
    queryFn: async () => {
      const contract = getReadContract();
      const result: bigint = await contract.balanceOf(address);
      return result;
    },
    enabled: !!address,
    refetchInterval: 10_000,
  });
}

export function useIsAgent(address: string | undefined) {
  return useQuery({
    queryKey: ["token", "hasRole", "agent", address],
    queryFn: async () => {
      const contract = getReadContract();
      const result: boolean = await contract.hasRole(AGENT_ROLE, address);
      return result;
    },
    enabled: !!address,
  });
}

export function useIsFrozen(address: string | undefined) {
  return useQuery({
    queryKey: ["token", "isFrozen", address],
    queryFn: async () => {
      const contract = getReadContract();
      const result: boolean = await contract.isFrozen(address);
      return result;
    },
    enabled: !!address,
  });
}

export function useIsAdmin(address: string | undefined) {
  return useQuery({
    queryKey: ["token", "hasRole", "admin", address],
    queryFn: async () => {
      const contract = getReadContract();
      const result: boolean = await contract.hasRole(DEFAULT_ADMIN_ROLE, address);
      return result;
    },
    enabled: !!address,
  });
}

export function useTokenWrite() {
  const { signer } = useAts();

  function getWriteContract() {
    if (!signer) throw new Error("Wallet not connected");
    return new ethers.Contract(CPC_SECURITY_ID, TOKEN_ABI, signer);
  }

  const mint = async (to: string, amount: bigint) => {
    const contract = getWriteContract();
    const tx: ethers.TransactionResponse = await contract.mint(to, amount);
    await tx.wait();
    return tx.hash;
  };

  const pause = async () => {
    const contract = getWriteContract();
    const tx: ethers.TransactionResponse = await contract.pause();
    await tx.wait();
    return tx.hash;
  };

  const unpause = async () => {
    const contract = getWriteContract();
    const tx: ethers.TransactionResponse = await contract.unpause();
    await tx.wait();
    return tx.hash;
  };

  const setAddressFrozen = async (addr: string, freeze: boolean) => {
    const contract = getWriteContract();
    const tx: ethers.TransactionResponse = await contract.setAddressFrozen(addr, freeze);
    await tx.wait();
    return tx.hash;
  };

  const transfer = async (to: string, amount: bigint) => {
    const contract = getWriteContract();
    const tx: ethers.TransactionResponse = await contract.transfer(to, amount);
    await tx.wait();
    return tx.hash;
  };

  return { mint, pause, unpause, setAddressFrozen, transfer, loading: false };
}
