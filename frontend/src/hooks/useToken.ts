import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../providers/WalletProvider";
import { getTokenContract } from "../lib/contracts";
import { JSON_RPC_URL } from "../lib/constants";

export function useToken() {
  const { signer } = useWallet();
  const [loading, setLoading] = useState(false);

  const readProvider = new ethers.JsonRpcProvider(JSON_RPC_URL);
  const readContract = getTokenContract(readProvider);

  const balanceOf = useCallback(async (address: string): Promise<bigint> => {
    return readContract.balanceOf(address);
  }, []);

  const totalSupply = useCallback(async (): Promise<bigint> => {
    return readContract.totalSupply();
  }, []);

  const paused = useCallback(async (): Promise<boolean> => {
    return readContract.paused();
  }, []);

  const isFrozen = useCallback(async (address: string): Promise<boolean> => {
    return readContract.isFrozen(address);
  }, []);

  const isAgent = useCallback(async (address: string): Promise<boolean> => {
    return readContract.isAgent(address);
  }, []);

  const transfer = useCallback(async (to: string, amount: bigint) => {
    if (!signer) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      const contract = getTokenContract(signer);
      const tx = await contract.transfer(to, amount);
      await tx.wait();
    } finally {
      setLoading(false);
    }
  }, [signer]);

  const mint = useCallback(async (to: string, amount: bigint) => {
    if (!signer) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      const contract = getTokenContract(signer);
      const tx = await contract.mint(to, amount);
      await tx.wait();
    } finally {
      setLoading(false);
    }
  }, [signer]);

  const pause = useCallback(async () => {
    if (!signer) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      const contract = getTokenContract(signer);
      const tx = await contract.pause();
      await tx.wait();
    } finally {
      setLoading(false);
    }
  }, [signer]);

  const unpause = useCallback(async () => {
    if (!signer) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      const contract = getTokenContract(signer);
      const tx = await contract.unpause();
      await tx.wait();
    } finally {
      setLoading(false);
    }
  }, [signer]);

  const setAddressFrozen = useCallback(async (addr: string, freeze: boolean) => {
    if (!signer) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      const contract = getTokenContract(signer);
      const tx = await contract.setAddressFrozen(addr, freeze);
      await tx.wait();
    } finally {
      setLoading(false);
    }
  }, [signer]);

  return { balanceOf, totalSupply, paused, isFrozen, isAgent, transfer, mint, pause, unpause, setAddressFrozen, loading };
}
