"use client";

import { Layout } from "@/components/layout/Layout";
import { RichTextRenderer } from "@/components/blog/RichTextRenderer";
import { getConfigString, useSiteConfig } from "@/lib/site-content";

export default function RefundPage() {
  const { data: siteConfig } = useSiteConfig();
  const companyEmail = getConfigString(siteConfig, "company_email");
  const refundContent = getConfigString(siteConfig, "refund_policy_content");

  return (
    <Layout>
      <section className="min-h-[calc(100vh-72px)] bg-[#080010] px-[20px] pb-[120px] pt-[140px]">
        <div className="mx-auto max-w-[720px] rounded-[24px] border border-[#1E0A35] bg-[#130224] p-[24px] shadow-[0_0_40px_rgba(139,92,246,0.05)] md:p-[40px]">
          <h1 className="font-display text-[36px] font-bold tracking-[-0.02em] text-[#FAF7FF] md:text-[44px]">
            Refund Policy
          </h1>

          <div className="mt-[24px]">
            {refundContent ? (
              <RichTextRenderer content={refundContent} />
            ) : (
              <p className="font-sans text-[16px] leading-[1.8] text-[#B8B0D1]">
                {companyEmail
                  ? `This policy is being prepared. For questions, contact us at ${companyEmail}.`
                  : "This policy is being prepared."}
              </p>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
