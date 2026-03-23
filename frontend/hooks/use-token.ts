"use client";

import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { useAts } from "@/contexts/ats-context";
import { CPC_SECURITY_ID } from "@/lib/constants";
import { TOKEN_ABI, ROLES } from "@/lib/abis";
import { getReadProvider } from "@/lib/provider";

function getReadContract() {
  return new ethers.Contract(CPC_SECURITY_ID, TOKEN_ABI, getReadProvider());
}

export function useTokenRead() {
  const name = useQuery({
    queryKey: ["token", "name"],
    queryFn: async () => {
      const contract = getReadContract();
      const result: string = await contract.name();
      return result;
    },
    staleTime: Infinity,
  });

  const symbol = useQuery({
    queryKey: ["token", "symbol"],
    queryFn: async () => {
      const contract = getReadContract();
      const result: string = await contract.symbol();
      return result;
    },
    staleTime: Infinity,
  });

  const totalSupply = useQuery({
    queryKey: ["token", "totalSupply"],
    queryFn: async () => {
      const contract = getReadContract();
      const result: bigint = await contract.totalSupply();
      return result;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const paused = useQuery({
    queryKey: ["token", "paused"],
    queryFn: async () => {
      const contract = getReadContract();
      const result: boolean = await contract.isPaused();
      return result;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  return { name, symbol, totalSupply, paused };
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
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useIsAgent(address: string | undefined) {
  return useQuery({
    queryKey: ["token", "hasRole", "agent", address],
    queryFn: async () => {
      const contract = getReadContract();
      const result: boolean = await contract.hasRole(ROLES.AGENT, address);
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
      const result: boolean = await contract.hasRole(ROLES.DEFAULT_ADMIN, address);
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
