import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { CrowdfundWidget } from "@/components/crowdfund-widget";

type CrowdfundingData = {
  general_description?: string;
  detailed_description?: string;
  geographic_location?: string;
  predominant_waste_types?: string[];
  risk_summary?: string;
};

type CrowdfundingRow = {
  task_id: string;
  user_id: number;
  crowdfunding_data: CrowdfundingData | null;
  task_specifics: Record<string, unknown> | null;
  total_cost: number;
  photos: string[] | null;
  location_gps: Record<string, unknown> | null;
  created_at: string;
  contract_address: string | null;
  target_amount: number | null;
};

export default async function Page({ params }: { params: Promise<{ task_id: string }> }) {
  const { task_id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crowdfunding_submissions")
    .select("task_id, user_id, crowdfunding_data, task_specifics, total_cost, photos, location_gps, created_at, contract_address, target_amount")
    .eq("task_id", task_id)
    .maybeSingle();

  if (error) {
    // Surface a 404 for not found, otherwise a generic notFound
    notFound();
  }
  if (!data) {
    notFound();
  }

  const row = data as CrowdfundingRow;
  const g = row.crowdfunding_data || {};
  const title = g.general_description || "Crowdfunding";
  const subtitle = g.geographic_location || g.risk_summary || "";
  const created = new Date(row.created_at);
  const hasOnChain = Boolean(row.contract_address);

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <Button asChild variant="outline">
          <Link href="/">Back</Link>
        </Button>
      </div>

      {row.photos && row.photos.length > 0 ? (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {row.photos.slice(0, 6).map((src, idx) => (
            <div key={idx} className="overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="photo" className="h-40 w-full object-cover" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Summary and costs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Total cost</span>
              <span className="font-medium">${row.total_cost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Created</span>
              <span className="font-medium">{created.toLocaleString()}</span>
            </div>
            {hasOnChain ? (
              <div className="flex items-center justify-between">
                <span>Target (on-chain)</span>
                <span className="font-medium">{row.target_amount ?? "-"}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location & Risk</CardTitle>
            <CardDescription>Where and safety level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Location</div>
              <div>{g.geographic_location || "-"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Risk</div>
              <div>{g.risk_summary || "-"}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Full description</CardDescription>
          </CardHeader>
          <CardContent>
            {g.detailed_description ? (
              <div className="whitespace-pre-wrap text-sm">{g.detailed_description}</div>
            ) : (
              <div className="text-sm text-muted-foreground">No detailed description.</div>
            )}
          </CardContent>
        </Card>

        {hasOnChain ? (
          <CrowdfundWidget contractAddress={row.contract_address as string} />
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Technical</CardTitle>
            <CardDescription>Raw payload</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md bg-muted p-4 text-xs">
{JSON.stringify(row, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}


