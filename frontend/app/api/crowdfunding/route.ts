import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { ethers } from "ethers";
import CrowdFundFactory from "@/abis/CrowdFundFactory.json";


type Payload = {
  task_id: string;
  user_id: number;
  crowdfunding_data: unknown;
  task_specifics: unknown;
  total_cost: number;
  photos: string[];
  location_gps: unknown;
  created_at: string;
  target_amount: number;
  receiver_address: string;
  deploy_tx_hash?: string | null;
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;
const isNumber = (v: unknown): v is number =>
  typeof v === "number" && !Number.isNaN(v);
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((i) => typeof i === "string");

function validatePayload(input: unknown):
  | { ok: true; data: Payload }
  | { ok: false; errors: string[] } {
  if (!isObject(input)) {
    return { ok: false, errors: ["Body must be a JSON object"] };
  }
  const errors: string[] = [];
  const {
    task_id,
    user_id,
    crowdfunding_data,
    task_specifics,
    total_cost,
    photos,
    location_gps,
    created_at,
    target_amount,
    receiver_address
  } = input as Record<string, unknown>;

  if (!isNonEmptyString(task_id)) errors.push("task_id is required");
  if (!isNumber(user_id)) errors.push("user_id is required");
  if (!isObject(crowdfunding_data)) errors.push("crowdfunding_data must be an object");
  if (!isObject(task_specifics)) errors.push("task_specifics must be an object");
  if (!isNumber(total_cost)) errors.push("total_cost is required");
  if (!isStringArray(photos)) errors.push("photos must be an array of strings");
  if (!isObject(location_gps)) errors.push("location_gps must be an object");
  if (!isNonEmptyString(created_at)) errors.push("created_at is required");
  if (!isNumber(target_amount)) errors.push("target_amount is required");
  if (!isNonEmptyString(receiver_address)) errors.push("receiver_address is required");

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      task_id,
      user_id,
      crowdfunding_data,
      task_specifics,
      total_cost,
      photos,
      location_gps,
      created_at,
      target_amount,
      receiver_address,
    } as Payload,
  };
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415 },
      );
    }
    const body = await request.json().catch(() => null);
    const result = validatePayload(body);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Invalid payload", details: result.errors },
        { status: 400 },
      );
    }
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("crowdfunding_submissions").upsert(
      [result.data],
      { onConflict: "task_id" },
    );
    if (error) {
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 },
      );
    }


    // Deploying Contract
    const privateKey = process.env.PRIVATE_KEY;
    const factoryAddress = process.env.FACTORY_ADDRESS;
    const RPC_URL = process.env.RPC_URL;
    if (!privateKey || !factoryAddress || !RPC_URL) {
      return NextResponse.json(
        { error: "Private key not found" },
        { status: 500 },
      );
    }
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const factory = new ethers.Contract(factoryAddress, CrowdFundFactory.abi, wallet);
    const tx = await factory.createCrowdfund(
      result.data.receiver_address,
      ethers.parseUnits(String(result.data.target_amount), 18),
    );
    const receipt = await tx.wait();

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
      .eq("task_id", result.data.task_id);

    return NextResponse.json({ ok: true, txHash: tx.hash, contractAddress }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: "Unexpected error", details: (e as Error).message },
      { status: 500 },
    );
  }
}


