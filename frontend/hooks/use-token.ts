"use client";

import { useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { type Address } from "viem";
import { tokenAbi } from "@coppice/abi";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

const tokenAddress = CONTRACT_ADDRESSES.token;

export function useTokenRead() {
  const totalSupply = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "totalSupply",
    query: { refetchInterval: 10_000 },
  });

  const paused = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "paused",
    query: { refetchInterval: 10_000 },
  });

  return { totalSupply, paused };
}

export function useTokenBalance(address: Address | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10_000,
    },
  });
}

export function useIsAgent(address: Address | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "isAgent",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useIsFrozen(address: Address | undefined) {
  return useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "isFrozen",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useTokenWrite() {
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  const waitForTx = async (hash: `0x${string}`) => {
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash });
    }
  };

  const mint = async (to: Address, amount: bigint) => {
    const hash = await writeContractAsync({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "mint",
      args: [to, amount],
    });
    await waitForTx(hash);
    return hash;
  };

  const pause = async () => {
    const hash = await writeContractAsync({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "pause",
    });
    await waitForTx(hash);
    return hash;
  };

  const unpause = async () => {
    const hash = await writeContractAsync({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "unpause",
    });
    await waitForTx(hash);
    return hash;
  };

  const setAddressFrozen = async (addr: Address, freeze: boolean) => {
    const hash = await writeContractAsync({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "setAddressFrozen",
      args: [addr, freeze],
    });
    await waitForTx(hash);
    return hash;
  };

  const transfer = async (to: Address, amount: bigint) => {
    const hash = await writeContractAsync({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "transfer",
      args: [to, amount],
    });
    await waitForTx(hash);
    return hash;
  };

  return { mint, pause, unpause, setAddressFrozen, transfer, loading: isPending };
}
