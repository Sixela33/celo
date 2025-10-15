import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { ethers } from "ethers";
import CrowdFundFactory from "@/abis/CrowdFundFactory.json";
import { z } from "zod";


const payloadSchema = z.object({
  task_id: z.string().min(1, "task_id is required"),
  user_id: z.coerce.number().refine((v) => Number.isFinite(v), "user_id is required"),
  crowdfunding_data: z.object({}).passthrough(),
  task_specifics: z.object({}).passthrough(),
  total_cost: z.coerce.number().refine((v) => Number.isFinite(v), "total_cost is required"),
  photos: z.array(z.string()),
  location_gps: z.object({}).passthrough(),
  created_at: z.string().min(1, "created_at is required"),
  target_amount: z.coerce.number().refine((v) => Number.isFinite(v), "target_amount is required"),
  receiver_address: z.string().refine((v) => {
    try { return ethers.isAddress(v); } catch { return false; }
  }, "receiver_address must be a valid address"),
});

type Payload = z.infer<typeof payloadSchema> & { deploy_tx_hash?: string | null };

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json" } },
        { status: 415 },
      );
    }
    const body = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
        code: i.code,
      }));
      return NextResponse.json(
        { error: { code: "INVALID_PAYLOAD", message: "Invalid payload", issues } },
        { status: 400 },
      );
    }
    const data: Payload = parsed.data;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("crowdfunding_submissions").upsert(
      [data],
      { onConflict: "task_id" },
    );
    if (error) {
      return NextResponse.json(
        { error: { code: "DB_UPSERT_FAILED", message: "Database error", details: error.message } },
        { status: 500 },
      );
    }


    // Deploying Contract
    const privateKey = process.env.PRIVATE_KEY;
    const factoryAddress = process.env.FACTORY_ADDRESS;
    const RPC_URL = process.env.RPC_URL;
    if (!privateKey || !factoryAddress || !RPC_URL) {
      const missing = [
        ["PRIVATE_KEY", privateKey],
        ["FACTORY_ADDRESS", factoryAddress],
        ["RPC_URL", RPC_URL],
      ].filter(([, v]) => !v).map(([k]) => k);
      return NextResponse.json(
        { error: { code: "ENV_MISSING", message: "Missing required environment variables", details: missing } },
        { status: 500 },
      );
    }
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const factory = new ethers.Contract(factoryAddress, CrowdFundFactory.abi, wallet);
    let tx;
    try {
      tx = await factory.createCrowdfund(
        data.receiver_address,
        ethers.parseUnits(String(data.target_amount), 18),
      );
    } catch (err) {
      return NextResponse.json(
        { error: { code: "DEPLOYMENT_SUBMIT_FAILED", message: "Failed to submit deployment transaction", details: (err as Error).message } },
        { status: 500 },
      );
    }
    let receipt;
    try {
      receipt = await tx.wait();
    } catch (err) {
      return NextResponse.json(
        { error: { code: "DEPLOYMENT_WAIT_FAILED", message: "Failed while waiting for transaction receipt", details: (err as Error).message } },
        { status: 500 },
      );
    }

    // Parse the CrowdfundCreated event to get the deployed crowdfund address
    const iface = new ethers.Interface(CrowdFundFactory.abi);
    let contractAddress: string | null = null;
    for (const log of receipt?.logs || []) {
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (parsed?.name === "CrowdfundCreated") {
          contractAddress = parsed.args[0] as string;
          break;
        }
      } catch {}
    }

    // Fallback: if event parsing failed, attempt to read the last created from factory.getCrowdfunds()
    if (!contractAddress && typeof factory.getCrowdfunds === "function") {
      try {
        const all: string[] = await factory.getCrowdfunds();
        contractAddress = all[all.length - 1] || null;
      } catch {}
    }

    // Store tx hash and contract address
    await supabase
      .from("crowdfunding_submissions")
      .update({ deploy_tx_hash: tx.hash, contract_address: contractAddress })
      .eq("task_id", data.task_id);

    return NextResponse.json({ ok: true, txHash: tx.hash, contractAddress }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unexpected error", details: (e as Error).message } },
      { status: 500 },
    );
  }
}


