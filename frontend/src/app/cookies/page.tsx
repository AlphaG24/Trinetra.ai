import { Layout } from "@/components/layout/Layout";

export const metadata = {
  title: "Cookie Policy | TrinetraEdu-AI",
  description: "Read the Cookie Policy for TrinetraEdu-AI to understand the strictly necessary session cookies and privacy-first analytics tools we use.",
};

export default function CookiePolicyPage() {
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
            Cookie Policy
          </h1>
          <p className="font-sans font-normal text-[14px] text-[#9A91B5] mb-[48px] text-center font-mono">
            TrinetraEdu-AI (trinetraedu-ai.com) • Effective Date: 15-07-2026 • Last Updated: 14-07-2026
          </p>

          <div className="w-full bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[24px] md:p-[48px] shadow-[0_0_40px_rgba(139,92,246,0.05)]">
            <div className="prose prose-invert max-w-none text-[#B8B0D1] font-sans font-normal text-[15px] leading-[1.8] space-y-6">

              <div className="border-l-2 border-[#A78BFA] pl-[16px] py-[4px] bg-[rgba(139,92,246,0.02)] rounded-r-md">
                <p className="font-medium text-[#FAF7FF] italic text-[14px] leading-relaxed">
                  <strong>One login cookie. Privacy-respecting analytics. Zero ad trackers. Full transparency.</strong> We believe you have a right to know exactly what is placed on your device, how long it lasts, and why it is there.
                </p>
              </div>

              <hr className="border-[#1E0A35] my-6" />

              <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                What Are Cookies?
              </h2>
              <p>
                Cookies are small text files that your browser saves on your device when you visit a website. They help the website remember basic things — like whether you are logged in — so you do not have to re-enter your credentials on every page.
              </p>
              <p>
                Cookies do not identify you by name on their own. They simply store a small token that our servers use to recognize your active session.
              </p>

              <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                What Cookies We Use
              </h2>
              <p>
                We use exactly one type of cookie: an <strong>authentication session cookie</strong>. That is the only cookie we place on your device.
              </p>

              <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                What We Do NOT Use
              </h2>
              <p>We are dedicated to user privacy, which means:</p>
              <ul className="list-none space-y-3 pl-[4px]">
                <li className="flex items-start gap-2">
                  <span>❌</span> <span><strong>Advertising or retargeting cookies</strong> (Meta Pixel, Google Ads, LinkedIn Insight Tag)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>❌</span> <span><strong>Behavioral tracking or session recording tools</strong> (Hotjar, Microsoft Clarity, FullStory)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>❌</span> <span><strong>Cross-site tracking cookies</strong> that follow you across other websites</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>❌</span> <span><strong>Any third-party cookies</strong> whatsoever</span>
                </li>
              </ul>
              <p>
                We do not track what you do on other websites. We do not build advertising profiles. We do not sell or share cookie data with anyone.
              </p>

              <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                The One Cookie We Set
              </h2>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Cookie</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">What It Does</th>
                      <th className="p-3 text-left text-[#FAF7FF]">How Long It Lasts</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Auth Session Token</td>
                      <td className="p-3 border-r border-[#1E0A35]">Keeps you securely logged in while you use the platform.</td>
                      <td className="p-3 text-amber-400">Deleted when you close your browser</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>This cookie is set with three security protections built in:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-2">
                <li><strong>HttpOnly:</strong> Browser scripts cannot read it, which blocks a common type of attack called cross-site scripting (XSS).</li>
                <li><strong>Secure:</strong> It only travels over encrypted HTTPS connections, never plain HTTP.</li>
                <li><strong>SameSite=Strict:</strong> It is only sent for requests coming directly from our own platform, which blocks cross-site request forgery (CSRF) attacks.</li>
              </ul>

              <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                Privacy-Respecting Analytics (No Cookies)
              </h2>
              <p>
                We use the following tools to understand how our platform is being used and to improve it. None of these tools place cookies on your device or track you across other websites:
              </p>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Tool</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">What It Measures</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Cookies?</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Privacy Approach</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Google Search Console</td>
                      <td className="p-3 border-r border-[#1E0A35]">How our website appears in Google search results, which search queries bring visitors, and click-through rates.</td>
                      <td className="p-3 border-r border-[#1E0A35] text-rose-400 font-semibold">❌ None</td>
                      <td className="p-3">Reads Google's search index data — no cookies placed on your device.</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Vercel Analytics (if enabled)</td>
                      <td className="p-3 border-r border-[#1E0A35]">Page views, top pages, referrers (where visitors came from), and basic geographic information at the country level.</td>
                      <td className="p-3 border-r border-[#1E0A35] text-rose-400 font-semibold">❌ None</td>
                      <td className="p-3">Privacy-first by design — no cookies, no personal identifiers, no cross-site tracking. Data is aggregated and anonymized.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                <strong>What these tools tell us:</strong> How many people visit, which pages are most useful, and whether our platform loads quickly.
              </p>
              <p>
                <strong>What they do not tell us:</strong> Who you are, what you do on other websites, or anything that identifies you personally.
              </p>

              <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                Future Analytics Tools
              </h2>
              <p>If we add any analytics tool in the future that uses cookies or collects more detailed information, we will:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Update this Cookie Policy with at least <strong>30 days' notice</strong> before the tool is activated.</li>
                <li>Notify registered users by email.</li>
                <li>Obtain your <strong>explicit consent</strong> before placing any non-essential cookies on your device.</li>
                <li>Clearly explain what data the new tool collects and why we need it.</li>
              </ul>

              <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                How Long Does Our Session Cookie Last?
              </h2>
              <p>
                Our session cookie is deleted automatically when you close your browser. It does not persist on your device. The next time you open the platform, you will simply log in again and a fresh session cookie is created.
              </p>

              <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                What If You Disable Cookies?
              </h2>
              <p>
                You can block or delete cookies at any time through your browser settings — usually found under Settings → Privacy and Security → Cookies.
              </p>
              <p className="border-l border-amber-500 pl-[16px] text-[#D1B89A] bg-[rgba(245,158,11,0.02)] py-[4px] rounded-r-md">
                <strong>PLEASE NOTE:</strong> Because our only cookie is the one that keeps you logged in, disabling cookies will prevent you from signing in or using any part of the TrinetraEdu-AI platform. This is not a marketing cookie you can opt out of — it is the core mechanism that makes secure login work. Without it, the platform cannot function for you.
              </p>

              <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                Our Position Under the DPDP Act, 2023
              </h2>
              <p>
                India's Digital Personal Data Protection Act, 2023 does not require consent for cookies that are strictly necessary to provide a service you have actively requested — such as an authentication cookie that keeps you logged in. Our session cookie falls squarely within this category.
              </p>
              <p>
                We are disclosing this policy not because the law requires a consent banner for essential cookies, but because we believe you have a right to know exactly what is on your device and why, and what tools we use to understand our platform's performance.
              </p>

              <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                Updates to This Policy
              </h2>
              <p>
                If we ever change our cookie practices, we will update this page, revise the "Last Updated" date, and notify registered users by email at least 30 days in advance. Any addition of non-essential cookies will require your explicit consent at that time.
              </p>

              <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                Questions?
              </h2>
              <p>
                Email our team at <a href="mailto:support@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">support@trinetraedu-ai.com</a>.
              </p>

              <hr className="border-[#1E0A35] my-6" />

              <p className="text-[13px] text-[#9A91B5] italic text-center font-mono">
                TrinetraEdu-AI — a proprietary concern of the founders, pending formal registration under the Limited Liability Partnership Act, 2008. Currently operating remotely. Registered address will be updated upon incorporation.
              </p>

            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
