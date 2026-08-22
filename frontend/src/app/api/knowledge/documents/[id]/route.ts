import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: docId } = await params;
    const supabase = await createClient();

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Delete document matching user_id
    const { error: deleteError } = await supabase
      .from("agent_knowledge")
      .delete()
      .eq("id", docId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[Knowledge Delete] Error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 550 });
    }

    return NextResponse.json({ success: true, message: "Document deleted successfully." });
  } catch (error: any) {
    console.error("[Knowledge Delete] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
