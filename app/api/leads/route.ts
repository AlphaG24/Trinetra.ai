import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | {
        email?: unknown;
        source?: unknown;
        interestedProduct?: unknown;
        fullName?: unknown;
        phone?: unknown;
        companyName?: unknown;
        message?: unknown;
        status?: unknown;
      }
    | null;

  const email =
    typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
  const source = typeof payload?.source === "string" ? payload.source.trim() : "";
  const interestedProduct =
    typeof payload?.interestedProduct === "string" ? payload.interestedProduct.trim() : "";
  const fullName =
    typeof payload?.fullName === "string" ? payload.fullName.trim() : "";
  const phone = typeof payload?.phone === "string" ? payload.phone.trim() : "";
  const companyName =
    typeof payload?.companyName === "string" ? payload.companyName.trim() : "";
  const leadMessage =
    typeof payload?.message === "string" ? payload.message.trim() : "";
  const leadStatus =
    typeof payload?.status === "string" ? payload.status.trim() : "";

  const row =
    source === "chat_widget"
      ? fullName && phone
        ? {
            full_name: fullName,
            email: "",
            phone,
            company_name: companyName || "",
            source: "chat_widget",
            interested_product: interestedProduct || "general",
            message: leadMessage || "Lead captured via Netra chat assistant",
            status: leadStatus || "new",
          }
        : null
      : source === "blog"
        ? emailPattern.test(email)
          ? {
              full_name: "",
              email,
              source: "blog",
              message: "Blog notification signup",
              status: "new",
            }
          : null
        : interestedProduct && emailPattern.test(email)
          ? {
              email,
              source: "waitlist",
              interested_product: interestedProduct,
            }
          : null;

  if (!row) {
    return NextResponse.json(
      {
        error:
          source === "chat_widget"
            ? "A valid name and phone number are required."
            : source === "blog"
              ? "A valid email address is required."
              : "A valid email and product slug are required.",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("leads").insert(row);

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ success: true, duplicate: true });
      }

      console.error("Failed to insert lead", {
        email,
        source,
        interestedProduct,
        fullName,
        phone,
        error,
      });

      return NextResponse.json(
        {
          error:
            source === "chat_widget"
              ? "Unable to save your chat lead right now."
              : source === "blog"
                ? "Unable to save your blog signup right now."
                : "Unable to save your early access request right now.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error while inserting lead", {
      email,
      source,
      interestedProduct,
      fullName,
      phone,
      error,
    });

    return NextResponse.json(
      {
        error:
          source === "chat_widget"
            ? "Unable to save your chat lead right now."
            : source === "blog"
              ? "Unable to save your blog signup right now."
              : "Unable to save your early access request right now.",
      },
      { status: 500 }
    );
  }
}
