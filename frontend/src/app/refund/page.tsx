"use client";

import { Layout } from "@/components/layout/Layout";
import { RichTextRenderer } from "@/components/blog/RichTextRenderer";
import { getConfigString, useSiteConfig } from "@/lib/site-content";

export default function RefundPage() {
  const { data: siteConfig } = useSiteConfig();
  const companyEmail = getConfigString(siteConfig, "company_email") || "billing@trinetraedu-ai.com";
  const refundContent = getConfigString(siteConfig, "refund_policy_content");

  return (
    <Layout>
      <div className="flex flex-col bg-[#080010] min-h-screen pt-[140px] pb-[100px] px-[20px] relative overflow-hidden">

        {/* Subtle Background Glow */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 600px 600px at center top, rgba(139,92,246,0.08) 0%, transparent 60%)'
          }}
        />

        <div className="max-w-[850px] mx-auto w-full relative z-10 flex flex-col items-center">

          <h1 className="font-display font-bold text-[36px] md:text-[44px] text-[#FAF7FF] tracking-[-0.02em] leading-tight mb-[16px] text-center">
            Refund and Cancellation Policy
          </h1>
          <p className="font-sans font-normal text-[14px] text-[#9A91B5] mb-[48px] text-center font-mono">
            TrinetraEdu-AI (trinetraedu-ai.com) • Effective Date: 15-07-2026 • Last Updated: 14-07-2026
          </p>

          <div className="w-full bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[24px] md:p-[48px] shadow-[0_0_40px_rgba(139,92,246,0.05)]">
            <div className="prose prose-invert max-w-none text-[#B8B0D1] font-sans font-normal text-[15px] leading-[1.8] space-y-6">

              {refundContent ? (
                <RichTextRenderer content={refundContent} />
              ) : (
                <>
                  <div className="border-l-2 border-[#A78BFA] pl-[16px] py-[4px] bg-[rgba(139,92,246,0.02)] rounded-r-md">
                    <p className="font-medium text-[#FAF7FF] italic text-[14px] leading-relaxed">
                      <strong>IMPORTANT NOTICE REGARDING PAYMENT GATEWAY STATUS:</strong> As of 14-07-2026, TrinetraEdu-AI does not have an active payment gateway integrated into the Platform, and no paid transactions are currently being processed. This Policy is published in advance to ensure full transparency and regulatory readiness ahead of the activation of paid services.
                    </p>
                  </div>

                  <hr className="border-[#1E0A35] my-6" />

                  <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                    1. Introduction
                  </h2>
                  <p>
                    This Refund and Cancellation Policy (&ldquo;Policy&rdquo;) governs all payments, refunds, and cancellations relating to paid services offered by TrinetraEdu-AI (a proprietary concern of the founders, pending formal registration under the Limited Liability Partnership Act, 2008) (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) through its zero-code AI platform (the &ldquo;Platform&rdquo;).
                  </p>
                  <p>
                    This Policy applies to all users (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) who purchase, subscribe to, or use any paid service offered on the Platform.
                  </p>
                  <p>
                    By making any purchase or subscribing to any paid service on the Platform, you agree to be bound by this Policy, in addition to our Terms of Service and Privacy Policy, both of which are incorporated herein by reference.
                  </p>
                  <p>
                    Until payment services are activated, no charges will be levied and no refund obligations arise. Once activated, this Policy shall become operative automatically.
                  </p>

                  <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                    2. Definitions
                  </h2>
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                      <thead>
                        <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                          <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Term</th>
                          <th className="p-3 text-left text-[#FAF7FF]">Meaning</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[#1E0A35]">
                          <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Free Tier</td>
                          <td className="p-3">Access to Platform services provided at no cost, subject to usage limitations set by the Company.</td>
                        </tr>
                        <tr className="border-b border-[#1E0A35]">
                          <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">One-Time Purchase</td>
                          <td className="p-3">A single, non-recurring payment for a specific product, service, or feature.</td>
                        </tr>
                        <tr className="border-b border-[#1E0A35]">
                          <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Monthly Subscription</td>
                          <td className="p-3">A recurring payment plan billed on a monthly cycle for continued access to paid features.</td>
                        </tr>
                        <tr className="border-b border-[#1E0A35]">
                          <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Annual Subscription</td>
                          <td className="p-3">A recurring payment plan billed on an annual cycle for continued access to paid features.</td>
                        </tr>
                        <tr className="border-b border-[#1E0A35]">
                          <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Usage-Based Billing</td>
                          <td className="p-3">Charges calculated based on actual consumption of services, API calls, credits, or platform resources.</td>
                        </tr>
                        <tr className="border-b border-[#1E0A35]">
                          <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Substantial Usage</td>
                          <td className="p-3">Consumption of 10% (ten percent) or more of the applicable usage limit associated with a purchase.</td>
                        </tr>
                        <tr className="border-b border-[#1E0A35]">
                          <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Customized Agent Setup</td>
                          <td className="p-3">Any service involving configuration, development, or personalization of AI agents or workflows specific to a User's requirements, which requires dedicated time and resource allocation from the Company.</td>
                        </tr>
                        <tr className="border-b border-[#1E0A35]">
                          <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Cooling-Off Period</td>
                          <td className="p-3">The period immediately following an Annual Subscription purchase during which a full refund may be requested without penalty.</td>
                        </tr>
                        <tr>
                          <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Business Day</td>
                          <td className="p-3">Any day that is not a Saturday, Sunday, or public holiday under applicable Indian law.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                    3. Refund Structure by Plan Type
                  </h2>

                  <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.1 Free Tier</h3>
                  <p>
                    The Free Tier involves no payment by the User. No refund is applicable under any circumstance for Free Tier usage, as no charges are levied.
                  </p>

                  <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.2 One-Time Purchases</h3>
                  <ul className="list-disc list-inside pl-[16px] space-y-2">
                    <li><strong>Refund Window:</strong> Users may request a refund within 7 (seven) calendar days from the date of purchase.</li>
                    <li><strong>Eligibility Condition:</strong> A refund under this category is granted only if the purchased service has not been substantially used — meaning less than 10% (ten percent) of the applicable usage limit has been consumed as of the date the refund request is received.</li>
                    <li><strong>Customized Agent Setups — No Refund Once Work Commences:</strong> No refund shall be granted for Customized Agent Setups once work has commenced, regardless of the percentage of usage consumed. Such services involve dedicated allocation of the Company's time, expertise, and resources. The Company will notify Users in writing before commencing work so that Users have a final opportunity to cancel.</li>
                    <li><strong>Late or Excess Usage Requests:</strong> Refund requests made after the 7-day window, or where usage exceeds the 10% threshold, will not be entertained as a matter of right. The Company may, at its sole discretion, consider such requests on a case-by-case basis under exceptional circumstances.</li>
                  </ul>

                  <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.3 Monthly Subscriptions</h3>
                  <ul className="list-disc list-inside pl-[16px] space-y-2">
                    <li><strong>Cancellation Rights:</strong> Users may cancel a Monthly Subscription at any time through their account settings or by written request to <a href={`mailto:${companyEmail}`} className="text-[#A78BFA] hover:underline">{companyEmail}</a>. Upon cancellation, access to paid features will continue until the end of the current billing period.</li>
                    <li><strong>No Mid-Cycle Refunds:</strong> No partial or pro-rata refunds will be issued for cancellations made at any point during an active billing cycle. The User retains full access for the remainder of the paid period.</li>
                    <li><strong>Exception — Extended Platform Unavailability:</strong> A refund will be considered only if the Platform's paid services were genuinely unavailable for a continuous period exceeding 48 (forty-eight) hours due to causes solely attributable to the Company (excluding third-party outages, force majeure, or client-side issues). Claims must be submitted within 7 days of the end of the downtime. Approved refunds will be calculated on a strict pro-rata basis.</li>
                  </ul>

                  <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.4 Annual Subscriptions</h3>
                  <ul className="list-disc list-inside pl-[16px] space-y-2">
                    <li><strong>Cooling-Off Period — Full Refund:</strong> Users are entitled to a 14 (fourteen) calendar day cooling-off period from the date of the original purchase. A full refund may be requested during this period without any penalty or deduction.</li>
                    <li><strong>After the Cooling-Off Period — Pro-Rata Refund:</strong> After the 14-day cooling-off period, refunds will be issued on a pro-rata basis for genuinely unused complete months only, calculated from the date the cancellation request is received and approved.</li>
                    <li><strong>Early Termination Fee:</strong> An early termination fee equivalent to 1 (one) month's equivalent subscription charge will be deducted from any pro-rata refund issued after the cooling-off period. This fee covers reasonable administrative costs and the discounted annual benefit.</li>
                    <li><strong>Example:</strong> If an annual plan is canceled in Month 4, the refund value equals the pro-rata value of the remaining 8 unused months minus 1 month's early termination fee.</li>
                  </ul>

                  <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.5 Usage-Based Billing</h3>
                  <ul className="list-disc list-inside pl-[16px] space-y-2">
                    <li><strong>No Refunds for Consumed Usage:</strong> Charges under usage-based billing are levied strictly on actual consumption. No refunds will be issued for usage already consumed.</li>
                    <li><strong>Unused Credit Rollover:</strong> Unused prepaid credits will roll over for a period of 30 (thirty) calendar days from the date of credit issuance, after which they will expire and hold no value.</li>
                    <li><strong>No Refund for Expired Credits:</strong> No refunds or extensions will be provided for credits that have expired due to the passage of the 30-day rollover period.</li>
                    <li><strong>Disputed Charges:</strong> If you believe you were billed for usage you did not generate, you must raise a formal dispute with the Company within 14 days. We will review platform logs and respond within 7 business days.</li>
                  </ul>

                  <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                    4. Non-Refundable Items
                  </h2>
                  <p>The following items are strictly non-refundable under all circumstances:</p>
                  <ul className="list-disc list-inside pl-[16px] space-y-1">
                    <li>Setup, onboarding, and customization fees.</li>
                    <li>Third-party costs incurred on the User's behalf, including but not limited to charges from Twilio, Vapi, Google Gemini, Supabase, or any other third-party provider.</li>
                    <li>Services already delivered and consumed (completed API calls, call minutes, generated outputs).</li>
                    <li>Trial or demo conversions where a User has actively upgraded to a paid plan.</li>
                    <li>Taxes and statutory levies, including Goods and Services Tax (GST) deposited with government authorities.</li>
                    <li>Payment gateway transaction fees.</li>
                  </ul>

                  <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                    5. Refund Request Process
                  </h2>
                  <p>All refund requests must be submitted through the following process:</p>
                  <ol className="list-decimal list-inside pl-[16px] space-y-3">
                    <li>
                      <strong>Step 1 — Submission:</strong> Send your refund request by email to <a href={`mailto:${companyEmail}`} className="text-[#A78BFA] hover:underline">{companyEmail}</a> with the subject line: <em>&ldquo;Refund Request — [Your Registered Account Email]&rdquo;</em>. Include your name, Transaction ID/invoice number, purchase date, plan type, and reason for the request.
                    </li>
                    <li>
                      <strong>Step 2 — Acknowledgment:</strong> The Company will acknowledge receipt of your request within 2 (two) business days.
                    </li>
                    <li>
                      <strong>Step 3 — Review and Decision:</strong> The Company will complete its review and communicate its decision (approval, partial approval, or rejection with reasons) within 5 (five) business days of acknowledgment.
                    </li>
                    <li>
                      <strong>Step 4 — Processing:</strong> Approved refunds will be processed within 14 (fourteen) business days from the date of the written approval. Refunds will be credited back to the original payment method.
                    </li>
                    <li>
                      <strong>Step 5 — Dispute:</strong> If you disagree with our decision, you may escalate the matter through the dispute resolution process set out in our Terms of Service.
                    </li>
                  </ol>

                  <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                    6. Cancellation — How It Works
                  </h2>
                  <ul className="list-disc list-inside pl-[16px] space-y-2">
                    <li><strong>For Monthly Plans:</strong> Cancel anytime through your account dashboard or by emailing <a href={`mailto:${companyEmail}`} className="text-[#A78BFA] hover:underline">{companyEmail}</a>. Your access continues until the end of the current billing period and will not renew.</li>
                    <li><strong>For Annual Plans:</strong> Cancel by emailing <a href={`mailto:${companyEmail}`} className="text-[#A78BFA] hover:underline">{companyEmail}</a>. We will confirm the cancellation and calculate any applicable pro-rata refund within 5 business days.</li>
                    <li><strong>Auto-Renewal:</strong> Paid subscriptions auto-renew at the end of each cycle. We send a renewal reminder email 7 days before annual renewals and 3 days before monthly renewals.</li>
                    <li><strong>Effect of Cancellation on Data:</strong> Upon cancellation, your data will be handled in accordance with the retention schedules in our Privacy Policy and Terms of Service.</li>
                    <li><strong>Trial Conversion Notice:</strong> If you are on a free trial that will automatically convert to a paid subscription, we will notify you at least 48 hours before the conversion occurs, allowing you to cancel before any charge is made.</li>
                  </ul>

                  <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                    7. General Conditions
                  </h2>
                  <ul className="list-disc list-inside pl-[16px] space-y-2">
                    <li><strong>Exceptional Circumstances:</strong> We reserve the right to approve refunds outside this Policy in genuine exceptional circumstances (e.g. documented medical emergencies) entirely at our sole discretion.</li>
                    <li><strong>Policy Violations:</strong> Refunds will not be processed for accounts in violation of our Terms of Service or Acceptable Use Policy, or involved in fraudulent activities.</li>
                    <li><strong>Currency and Conversion:</strong> All refunds are calculated in the currency of the original transaction. Currency conversion losses or bank charges are not our responsibility.</li>
                    <li><strong>Statutory Rights Preserved:</strong> Nothing in this Policy limits or excludes your statutory rights under applicable Indian law, including the Consumer Protection Act, 2019.</li>
                    <li><strong>Single Refund:</strong> Only one refund request may be submitted per individual transaction.</li>
                  </ul>

                  <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                    8. Regulatory Compliance
                  </h2>
                  <p>This Policy is designed to comply with, and will be updated to reflect obligations arising from:</p>
                  <ul className="list-disc list-inside pl-[16px] space-y-2">
                    <li><strong>Consumer Protection Act, 2019 (India):</strong> Protecting consumers from unfair trade practices and ensuring timely grievance redressal.</li>
                    <li><strong>Reserve Bank of India (RBI) Guidelines:</strong> Ensuring compliance with RBI guidelines on recurring payment mandates, e-mandates, failed transactions, and data localization.</li>
                    <li><strong>Goods and Services Tax (GST) Laws:</strong> All invoices and refund credit notes are issued in accordance with the CGST Act, 2017.</li>
                    <li><strong>Digital Personal Data Protection Act, 2023:</strong> Personal billing data is processed in accordance with our Privacy Policy.</li>
                  </ul>

                  <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                    9. Amendments to This Policy
                  </h2>
                  <p>
                    The Company reserves the right to modify or update this Policy at any time. Material changes will be communicated to registered Users via email at least 30 days before taking effect.
                  </p>

                  <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                    10. Contact Us
                  </h2>
                  <p>
                    For all refund requests, cancellation queries, billing disputes, and questions regarding this Policy, contact us at:
                  </p>
                  <ul className="list-none pl-0 space-y-2">
                    <li><strong>Email:</strong> <a href={`mailto:${companyEmail}`} className="text-[#A78BFA] hover:underline">{companyEmail}</a></li>
                    <li><strong>Response Time:</strong> Within 2 business days of receipt</li>
                  </ul>

                  <hr className="border-[#1E0A35] my-6" />

                  <p className="text-[13px] text-[#9A91B5] italic text-center font-mono">
                    TrinetraEdu-AI — a proprietary concern of the founders, pending formal registration under the Limited Liability Partnership Act, 2008. Currently operating remotely. Registered address will be updated upon company incorporation.
                  </p>

                  <p className="text-[11px] text-[#7A7195] italic text-center">
                    Legal Note: This Policy is a compliance draft prepared for TrinetraEdu-AI and will be reviewed by qualified legal counsel upon gateway activation.
                  </p>
                </>
              )}

            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
