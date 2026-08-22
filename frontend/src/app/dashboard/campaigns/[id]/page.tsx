import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CampaignDetailClient } from "@/src/components/campaigns/CampaignDetailClient";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login?error=session_expired');
  }

  // Profile check
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, plan_tier')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login?error=profile_missing');
  }

  // Check if free user is attempting to access campaign detail
  const userPlanTier = profile.plan_tier?.toLowerCase() || 'free';
  if (userPlanTier === 'free' || userPlanTier === 'free_demo') {
    redirect('/dashboard/campaigns');
  }

  return <CampaignDetailClient campaignId={id} />;
}
