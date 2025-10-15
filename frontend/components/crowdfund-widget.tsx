"use client";
import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { parseUnits, formatUnits, zeroAddress } from "viem";
import CrowdfundAbi from "@/abis/Crowdfund.json";
import GoodDollarAbi from "@/abis/GoodDollar.json";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { waitForTransactionReceipt } from "viem/actions";

type Props = {
  contractAddress: string;
};

export function CrowdfundWidget({ contractAddress }: Props) {
  const { address } = useAccount();
  const [amountInput, setAmountInput] = useState<string>("");

  const { data: targetAmount } = useReadContract({
    abi: CrowdfundAbi.abi as any,
    address: contractAddress as `0x${string}`,
    functionName: "targetAmount",
  });
  const { data: totalRaised, refetch: refetchTotalRaised } = useReadContract({
    abi: CrowdfundAbi.abi as any,
    address: contractAddress as `0x${string}`,
    functionName: "totalRaised",
  });
  const { data: isCompleted, refetch: refetchIsCompleted } = useReadContract({
    abi: CrowdfundAbi.abi as any,
    address: contractAddress as `0x${string}`,
    functionName: "isCompleted",
  });
  const { data: receiverAddress } = useReadContract({
    abi: CrowdfundAbi.abi as any,
    address: contractAddress as `0x${string}`,
    functionName: "receiverAddress",
  });
  const { data: paymentToken } = useReadContract({
    abi: CrowdfundAbi.abi as any,
    address: contractAddress as `0x${string}`,
    functionName: "token",
  });

  const tokenAddress = (paymentToken as string) || zeroAddress;

  const { data: tokenDecimals } = useReadContract({
    abi: GoodDollarAbi.abi as any,
    address: tokenAddress as `0x${string}`,
    functionName: "decimals",
  });
  const decimals = Number(tokenDecimals ?? 18);

  const { data: myBalance, refetch: refetchBalance } = useReadContract({
    abi: GoodDollarAbi.abi as any,
    address: tokenAddress as `0x${string}`,
    functionName: "balanceOf",
    args: [address || zeroAddress],
  });
  const { data: myAllowance, refetch: refetchAllowance } = useReadContract({
    abi: GoodDollarAbi.abi as any,
    address: tokenAddress as `0x${string}`,
    functionName: "allowance",
    args: [address || zeroAddress, contractAddress as `0x${string}`],
  });

  const needsApprove = useMemo(() => {
    try {
      const parsed = amountInput ? parseUnits(amountInput, decimals) : BigInt(0);
      const allowance = (myAllowance as bigint) ?? BigInt(0);
      return parsed > allowance;
    } catch {
      return true;
    }
  }, [amountInput, decimals, myAllowance]);

  const publicClient = usePublicClient();
  const { writeContract, writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const donate = async () => {
    if (!address) return;
    try {
      const parsed = parseUnits(amountInput, decimals);

      // Approve if needed
      if (needsApprove) {
        if (!publicClient) return;
        const approveHash = await writeContractAsync({
          abi: GoodDollarAbi.abi as any,
          address: tokenAddress as `0x${string}`,
          functionName: "approve",
          args: [contractAddress as `0x${string}`, parsed],
        });
        await waitForTransactionReceipt(publicClient, { hash: approveHash });
        await refetchAllowance();
        // After approval mined, recompute and proceed to donate
        // No early return; fall through to send donate tx
      }

      await writeContractAsync({
        abi: CrowdfundAbi.abi as any,
        address: contractAddress as `0x${string}`,
        functionName: "donate",
        args: [parsed],
      });
    } catch {}
  };

  const withdraw = async () => {
    try {
      await writeContract({
        abi: CrowdfundAbi.abi as any,
        address: contractAddress as `0x${string}`,
        functionName: "withdraw",
        args: [],
      });
    } catch {}
  };

  // Refresh basic reads after any tx success
  if (isTxSuccess) {
    refetchTotalRaised();
    refetchIsCompleted();
    refetchAllowance();
    refetchBalance();
  }

  const fmt = (v?: bigint) => (v !== undefined ? formatUnits(v, decimals) : "-");

  const canWithdraw = Boolean(isCompleted) && address && receiverAddress && (address as string).toLowerCase() === (receiverAddress as string).toLowerCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crowdfund</CardTitle>
        <CardDescription>Participate and track on-chain progress</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span>Target</span>
          <span className="font-medium">{fmt(targetAmount as bigint)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Raised</span>
          <span className="font-medium">{fmt(totalRaised as bigint)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Status</span>
          <span className="font-medium">{isCompleted ? "Completed" : "Open"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Your balance</span>
          <span className="font-medium">{fmt(myBalance as bigint)}</span>
        </div>

        <div className="mt-2 flex gap-2">
          <input
            type="number"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="Amount"
            className="w-full rounded-md border px-3 py-2 text-sm"
            min="0"
            step="0.000001"
          />
          <Button onClick={donate} disabled={!address || !amountInput || isPending || isTxLoading}>
            {needsApprove ? (isPending || isTxLoading ? "Approving..." : "Approve") : (isPending || isTxLoading ? "Donating..." : "Donate")}
          </Button>
        </div>

        {canWithdraw ? (
          <div className="pt-2">
            <Button variant="secondary" onClick={withdraw} disabled={isPending || isTxLoading}>
              {isPending || isTxLoading ? "Withdrawing..." : "Withdraw"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}


