import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const { authenticated, user, profile, supabase, error } = await authenticateRequest();
    if (!authenticated || !user || !profile || !supabase) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const orgId = profile.organization_id || user.id;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const imageType = (formData.get("image_type") as string) || "logo";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate image mime type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload a PNG, JPEG, WEBP, or SVG image." },
        { status: 400 }
      );
    }

    // Maximum file size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image size exceeds 5MB limit." }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `tenant-branding/${orgId}/${imageType}_${Date.now()}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("public_uploads")
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: true
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("public_uploads")
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          return NextResponse.json({
            success: true,
            url: publicUrlData.publicUrl
          });
        }
      }
    } catch (storageErr) {
      console.warn("[Upload Image Storage Fallback]:", storageErr);
    }

    // Fallback: Convert to base64 DataURL so user is never blocked
    const base64 = fileBuffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      success: true,
      url: dataUrl
    });

  } catch (err: any) {
    console.error("[Upload Image Exception]:", err);
    return NextResponse.json({ error: err.message || "Failed to upload image" }, { status: 500 });
  }
}

