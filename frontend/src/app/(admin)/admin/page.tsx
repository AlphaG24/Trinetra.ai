import { createClient } from "@/utils/supabase/server";
import AdminOverviewClient from "@/components/admin/AdminOverviewClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  // Decision A1: developer_tester accounts are strictly excluded from business metrics
  const { data: devProfiles } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .in("role", ["developer_tester", "dev_test", "tester"]);

  const devOrgIds = (devProfiles?.map((p) => p.organization_id).filter(Boolean) || []) as string[];

  // Construct queries with developer_tester exclusion filters
  let orgsQuery = supabase.from("organizations").select("*", { count: "exact", head: true });
  let agentsQuery = supabase.from("agents").select("*", { count: "exact", head: true });
  let callsQuery = supabase.from("voice_calls").select("duration_seconds");
  let leadsQuery = supabase.from("leads").select("*", { count: "exact", head: true });
  let recentTenantsQuery = supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (devOrgIds.length > 0) {
    const orgFilter = `(${devOrgIds.join(",")})`;
    orgsQuery = orgsQuery.not("id", "in", orgFilter);
    agentsQuery = agentsQuery.not("organization_id", "in", orgFilter);
    callsQuery = callsQuery.not("organization_id", "in", orgFilter);
    leadsQuery = leadsQuery.not("organization_id", "in", orgFilter);
    recentTenantsQuery = recentTenantsQuery.not("id", "in", orgFilter);
  }

  // Fetch counts and metrics in parallel
  const [
    { count: tenantsCount },
    { count: agentsCount },
    { data: callsData },
    { count: leadsCount },
    { data: recentTenants },
    { data: openTickets },
  ] = await Promise.all([
    orgsQuery,
    agentsQuery,
    callsQuery,
    leadsQuery,
    recentTenantsQuery,
    supabase
      .from("support_tickets")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Calculate call minutes
  const totalCalls = callsData?.length || 0;
  const totalSeconds =
    callsData?.reduce((acc, call) => acc + (call.duration_seconds || 0), 0) ||
    0;
  const totalMinutes = Math.round(totalSeconds / 60);

  return (
    <AdminOverviewClient
      tenantsCount={tenantsCount || 0}
      agentsCount={agentsCount || 0}
      totalCalls={totalCalls}
      totalMinutes={totalMinutes}
      recentTenants={recentTenants || []}
      openTickets={openTickets || []}
    />
  );
}
