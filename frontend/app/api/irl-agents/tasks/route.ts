import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const requestSchema = z.object({
  task_id: z.string().min(1, "task_id is required"),
});

type PhotoBreakdownItem = {
  subtotal: number;
  description?: string;
};

export async function POST(request: Request) {
  console.log("[API /api/irl-agents/tasks] 📥 Request received");

  try {
    const contentType = request.headers.get("content-type") || "";
    console.log("[API] Content-Type:", contentType);

    if (!contentType.includes("application/json")) {
      console.error("[API] ❌ Invalid content type");
      return NextResponse.json(
        { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json" } },
        { status: 415 },
      );
    }

    const body = await request.json().catch(() => null);
    console.log("[API] Request body:", body);

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[API] ❌ Validation failed:", parsed.error.issues);
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

    const { task_id } = parsed.data;
    console.log("[API] ✅ Validated task_id:", task_id);

    // Fetch crowdfunding data from Supabase
    console.log("[API] 🔍 Fetching crowdfunding data from Supabase...");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("crowdfunding_submissions")
      .select("*")
      .eq("task_id", task_id)
      .maybeSingle();

    if (error || !data) {
      console.error("[API] ❌ Crowdfunding not found:", error);
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Crowdfunding not found", details: error?.message } },
        { status: 404 },
      );
    }

    console.log("[API] ✅ Crowdfunding data found:", {
      task_id: data.task_id,
      total_cost: data.total_cost,
      has_crowdfunding_data: !!data.crowdfunding_data,
      has_task_specifics: !!data.task_specifics,
      has_location_gps: !!data.location_gps,
    });

    // Extract data from the crowdfunding submission
    const crowdfundingData = data.crowdfunding_data as any;
    const taskSpecifics = data.task_specifics as any;
    const locationGps = data.location_gps as any;

    const generalDescription = crowdfundingData?.general_description || "";
    const latitude = locationGps?.latitude || 0;
    const longitude = locationGps?.longitude || 0;
    const estimatedTimeHours = taskSpecifics?.estimated_time_hours || 0;
    const photoBreakdown = taskSpecifics?.photo_breakdown || [];

    console.log("[API] 📋 Extracted data:", {
      generalDescription,
      latitude,
      longitude,
      estimatedTimeHours,
      photoBreakdownLength: photoBreakdown.length,
      total_cost: data.total_cost,
    });

    // Build tasks array
    const tasks = [];

    if (Array.isArray(photoBreakdown) && photoBreakdown.length > 0) {
      console.log("[API] 📸 Creating tasks from photo_breakdown (count:", photoBreakdown.length, ")");
      // Create one task per photo_breakdown item
      for (const item of photoBreakdown) {
        const breakdownItem = item as PhotoBreakdownItem;
        tasks.push({
          querierId: 1000,
          prompt: generalDescription,
          reward: breakdownItem.subtotal || 0,
          token: "G$",
          lat: latitude,
          lng: longitude,
          timeout: estimatedTimeHours,
        });
      }
    } else {
      console.log("[API] 📦 Creating single task with total_cost:", data.total_cost);
      // Fallback: create a single task with total_cost
      tasks.push({
        querierId: 1000,
        prompt: generalDescription,
        reward: data.total_cost || 0,
        token: "G$",
        lat: latitude,
        lng: longitude,
        timeout: estimatedTimeHours,
      });
    }

    console.log("[API] ✅ Built tasks array:", tasks);

    // Send tasks to IRL Agents API
    const IRL_API_KEY = process.env.IRL_AGENTS_API_KEY;

    if (!IRL_API_KEY) {
      console.error("[API] ❌ IRL_AGENTS_API_KEY environment variable is not set");
      return NextResponse.json(
        { error: { code: "MISSING_API_KEY", message: "IRL Agents API key is not configured" } },
        { status: 500 },
      );
    }

    console.log("[API] 🚀 Sending tasks to IRL Agents API at https://api.irl-agents.xyz/api/v1/tasks");
    console.log("[API] 🔑 Using API Key:", IRL_API_KEY.substring(0, 10) + "...");
    console.log("[API] 📤 Payload:", JSON.stringify(tasks, null, 2));

    const irlAgentsResponse = await fetch("https://api.irl-agents.xyz/api/v1/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": IRL_API_KEY,
      },
      body: JSON.stringify(tasks),
    });

    console.log("[API] 📨 IRL Agents API response status:", irlAgentsResponse.status, irlAgentsResponse.statusText);

    if (!irlAgentsResponse.ok) {
      const errorText = await irlAgentsResponse.text().catch(() => "Unknown error");
      console.error("[API] ❌ IRL Agents API error:", {
        status: irlAgentsResponse.status,
        statusText: irlAgentsResponse.statusText,
        errorText,
      });
      return NextResponse.json(
        {
          error: {
            code: "IRL_AGENTS_API_ERROR",
            message: "Failed to create tasks in IRL Agents API",
            details: errorText,
            status: irlAgentsResponse.status,
          },
        },
        { status: 500 },
      );
    }

    const irlAgentsData = await irlAgentsResponse.json();
    console.log("[API] ✅ IRL Agents API response data:", irlAgentsData);

    console.log("[API] 🎉 Success! Returning response to client");
    return NextResponse.json(
      {
        ok: true,
        message: "Tasks created successfully",
        tasks: tasks,
        irlAgentsResponse: irlAgentsData,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("[API] ❌ Unexpected error:", e);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unexpected error", details: (e as Error).message } },
      { status: 500 },
    );
  }
}
