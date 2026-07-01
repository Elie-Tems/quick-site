import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    console.log(`Campaign scheduler running at: ${now}`);

    // 1. Activate campaigns that should start (have start_date <= now and not yet active)
    const { data: campaignsToActivate, error: activateQueryError } = await supabase
      .from("campaigns")
      .select("id, business_id, name, start_date, end_date")
      .eq("is_active", false)
      .not("start_date", "is", null)
      .lte("start_date", now)
      .or(`end_date.is.null,end_date.gt.${now}`);

    if (activateQueryError) {
      console.error("Error querying campaigns to activate:", activateQueryError);
      throw activateQueryError;
    }

    let activatedCount = 0;
    for (const campaign of campaignsToActivate || []) {
      // The trigger will automatically deactivate other campaigns for this business
      const { error: activateError } = await supabase
        .from("campaigns")
        .update({ is_active: true })
        .eq("id", campaign.id);

      if (activateError) {
        console.error(`Error activating campaign ${campaign.id}:`, activateError);
      } else {
        console.log(`Activated campaign: ${campaign.name} (${campaign.id})`);
        activatedCount++;
      }
    }

    // 2. Deactivate campaigns that have ended (end_date < now and still active)
    const { data: campaignsToDeactivate, error: deactivateQueryError } = await supabase
      .from("campaigns")
      .select("id, name, end_date")
      .eq("is_active", true)
      .not("end_date", "is", null)
      .lt("end_date", now);

    if (deactivateQueryError) {
      console.error("Error querying campaigns to deactivate:", deactivateQueryError);
      throw deactivateQueryError;
    }

    let deactivatedCount = 0;
    for (const campaign of campaignsToDeactivate || []) {
      const { error: deactivateError } = await supabase
        .from("campaigns")
        .update({ is_active: false })
        .eq("id", campaign.id);

      if (deactivateError) {
        console.error(`Error deactivating campaign ${campaign.id}:`, deactivateError);
      } else {
        console.log(`Deactivated campaign: ${campaign.name} (${campaign.id})`);
        deactivatedCount++;
      }
    }

    const result = {
      success: true,
      timestamp: now,
      activated: activatedCount,
      deactivated: deactivatedCount,
      message: `Scheduler completed. Activated: ${activatedCount}, Deactivated: ${deactivatedCount}`,
    };

    console.log(result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Campaign scheduler error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
