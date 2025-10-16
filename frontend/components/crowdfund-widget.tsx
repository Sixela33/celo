"use client";
import { useMemo, useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { parseUnits, formatUnits, zeroAddress } from "viem";
import CrowdfundAbi from "@/abis/Crowdfund.json";
import GoodDollarAbi from "@/abis/GoodDollar.json";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { waitForTransactionReceipt } from "viem/actions";

type Props = {
  contractAddress: string;
  taskId?: string;
};

export function CrowdfundWidget({ contractAddress, taskId }: Props) {
  const { address } = useAccount();
  const [amountInput, setAmountInput] = useState<string>("");
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  const [tasksCreated, setTasksCreated] = useState(false);

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

  const createIRLTasks = async () => {
    console.log("[IRL Tasks] createIRLTasks called", {
      taskId,
      isCreatingTasks,
      tasksCreated,
    });

    if (!taskId) {
      console.warn("[IRL Tasks] No taskId provided, skipping task creation");
      return;
    }

    if (isCreatingTasks) {
      console.warn("[IRL Tasks] Already creating tasks, skipping");
      return;
    }

    if (tasksCreated) {
      console.warn("[IRL Tasks] Tasks already created, skipping");
      return;
    }

    console.log("[IRL Tasks] Starting task creation for taskId:", taskId);
    setIsCreatingTasks(true);

    try {
      const payload = { task_id: taskId };
      console.log("[IRL Tasks] Sending request to /api/irl-agents/tasks with payload:", payload);

      const response = await fetch("/api/irl-agents/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("[IRL Tasks] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("[IRL Tasks] Failed to create IRL tasks:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        return;
      }

      const data = await response.json();
      console.log("[IRL Tasks] ✅ IRL tasks created successfully:", data);
      setTasksCreated(true);
    } catch (error) {
      console.error("[IRL Tasks] ❌ Error creating IRL tasks:", error);
    } finally {
      setIsCreatingTasks(false);
      console.log("[IRL Tasks] Finished task creation process");
    }
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

  // Trigger IRL tasks creation when crowdfunding is completed
  useEffect(() => {
    console.log("[IRL Tasks] useEffect triggered", {
      isCompleted,
      tasksCreated,
      taskId,
    });

    // Simply check if crowdfunding is completed (Status: Completed)
    if (isCompleted && !tasksCreated && taskId) {
      console.log("[IRL Tasks] ✅ Crowdfunding completed! Calling createIRLTasks");
      createIRLTasks();
    } else {
      console.log("[IRL Tasks] ⏸️ Conditions not met:", {
        needsCompleted: !isCompleted,
        alreadyCreated: tasksCreated,
        missingTaskId: !taskId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted, tasksCreated, taskId]);

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
          <div className="pt-2 space-y-2">
            <Button variant="secondary" onClick={withdraw} disabled={isPending || isTxLoading}>
              {isPending || isTxLoading ? "Withdrawing..." : "Withdraw"}
            </Button>
            {isCreatingTasks && (
              <p className="text-xs text-muted-foreground">Creating IRL agent tasks...</p>
            )}
            {tasksCreated && (
              <p className="text-xs text-green-600">IRL agent tasks created successfully!</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}


