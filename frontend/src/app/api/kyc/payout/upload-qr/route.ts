import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const { authenticated, user, profile, supabase, error } = await authenticateRequest();
    if (!authenticated || !user || !profile || !supabase) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const orgId = profile.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization associated with this account." }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate image mime type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file format. Please upload a PNG, JPEG, or WEBP image." }, { status: 400 });
    }

    // Maximum file size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image size exceeds 5MB limit." }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `tenant-qrs/${orgId}/upi_qr_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("public_uploads")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error("[Upload QR Error]:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from("public_uploads")
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      qr_code_url: publicUrlData.publicUrl
    });

  } catch (err: any) {
    console.error("[Upload QR Exception]:", err);
    return NextResponse.json({ error: err.message || "Failed to upload QR code" }, { status: 500 });
  }
}

