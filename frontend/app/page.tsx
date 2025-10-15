import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type CrowdfundingData = {
  general_description?: string;
  geographic_location?: string;
  risk_summary?: string;
};

type CrowdfundingRow = {
  task_id: string;
  user_id: number;
  crowdfunding_data: CrowdfundingData | null;
  total_cost: number;
  created_at: string;
  photos: string[] | null;
};

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crowdfunding_submissions")
    .select("task_id, user_id, crowdfunding_data, total_cost, created_at, photos")
    .order("created_at", { ascending: false });

  const items = (data as CrowdfundingRow[] | null) || [];

  return (
    <main className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Crowdfunding opportunities</h1>
        <Button asChild>
          <Link href="/crowdfunding/new">New</Link>
        </Button>
      </div>

      {error ? (
        <div className="text-sm text-destructive">{error.message}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No opportunities yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((row) => {
            const g = row.crowdfunding_data || {};
            const title = g.general_description || "Untitled";
            const subtitle = g.geographic_location || g.risk_summary || "";
            const created = new Date(row.created_at);
            return (
              <Link key={row.task_id} href={`/crowdfunding/${row.task_id}`} className="block">
                <Card>
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{title}</CardTitle>
                    <CardDescription className="line-clamp-2">{subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Total cost</span>
                      <span className="font-medium">${row.total_cost.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 text-xs">{created.toLocaleString()}</div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
