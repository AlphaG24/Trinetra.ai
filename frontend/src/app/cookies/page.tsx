import { Layout } from "@/components/layout/Layout";

export const metadata = {
  title: "Cookie Policy | Vaakriti AI",
  description: "Read the Cookie Policy for Vaakriti AI to understand the strictly necessary session cookies and privacy-first analytics tools we use.",
};

export default function CookiePolicyPage() {
  return (
    <Layout>
      <div className="flex flex-col bg-[#FAFAFA] min-h-screen pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-5xl lg:max-w-6xl mx-auto w-full relative z-10 flex flex-col items-center">

          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#0F172A] tracking-tight mb-3 text-center">
            Cookie Policy
          </h1>
          <p className="font-sans font-normal text-xs sm:text-sm text-[#64748B] mb-10 text-center font-mono">
            Vaakriti AI (vaakriti.com) • Effective Date: 15-07-2026 • Last Updated: 14-07-2026
          </p>

          <div className="w-full bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-12 shadow-xs">
            <div className="prose prose-slate max-w-none text-[#334155] font-sans font-normal text-sm sm:text-[15px] leading-relaxed space-y-6">

              <div className="border-l-4 border-[#2563EB] pl-4 py-3 bg-blue-50/60 rounded-r-xl">
                <p className="font-medium text-[#0F172A] text-sm leading-relaxed">
                  <strong>One login cookie. Privacy-respecting analytics. Zero ad trackers. Full transparency.</strong> We believe you have a right to know exactly what is placed on your device, how long it lasts, and why it is there.
                </p>
              </div>

              <hr className="border-[#E2E8F0] my-6" />

              <h2 className="text-[#0F172A] font-bold text-lg sm:text-xl tracking-tight mt-8 mb-3">
                What Are Cookies?
              </h2>
              <p>
                Cookies are small text files that your browser saves on your device when you visit a website. They help the website remember basic things — like whether you are logged in — so you do not have to re-enter your credentials on every page.
              </p>
              <p>
                Cookies do not identify you by name on their own. They simply store a small token that our servers use to recognize your active session.
              </p>

              <h2 className="text-[#0F172A] font-bold text-lg sm:text-xl tracking-tight mt-8 mb-3">
                What Cookies We Use
              </h2>
              <p>
                We use exactly one type of cookie: an <strong>authentication session cookie</strong>. That is the only cookie we place on your device.
              </p>

              <h2 className="text-[#0F172A] font-bold text-lg sm:text-xl tracking-tight mt-8 mb-3">
                What We Do NOT Use
              </h2>
              <p>We are dedicated to user privacy, which means:</p>
              <ul className="list-none space-y-3 pl-1">
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

              <h2 className="text-[#0F172A] font-bold text-lg sm:text-xl tracking-tight mt-8 mb-3">
                The One Cookie We Set
              </h2>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#E2E8F0] text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                      <th className="p-3 text-left border-r border-[#E2E8F0] text-[#0F172A] font-semibold">Cookie</th>
                      <th className="p-3 text-left border-r border-[#E2E8F0] text-[#0F172A] font-semibold">What It Does</th>
                      <th className="p-3 text-left text-[#0F172A] font-semibold">How Long It Lasts</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border-r border-[#E2E8F0] font-medium text-[#0F172A]">Auth Session Token</td>
                      <td className="p-3 border-r border-[#E2E8F0] text-[#334155]">Keeps you securely logged in while you use the platform.</td>
                      <td className="p-3 text-amber-600 font-medium">Deleted when you close your browser</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>This cookie is set with three security protections built in:</p>
              <ul className="list-disc list-inside pl-4 space-y-2">
                <li><strong>HttpOnly:</strong> Browser scripts cannot read it, which blocks a common type of attack called cross-site scripting (XSS).</li>
                <li><strong>Secure:</strong> It only travels over encrypted HTTPS connections, never plain HTTP.</li>
                <li><strong>SameSite=Strict:</strong> It is only sent for requests coming directly from our own platform, which blocks cross-site request forgery (CSRF) attacks.</li>
              </ul>

              <h2 className="text-[#0F172A] font-bold text-lg sm:text-xl tracking-tight mt-8 mb-3">
                Privacy-Respecting Analytics (No Cookies)
              </h2>
              <p>
                We use the following tools to understand how our platform is being used and to improve it. None of these tools place cookies on your device or track you across other websites:
              </p>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#E2E8F0] text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                      <th className="p-3 text-left border-r border-[#E2E8F0] text-[#0F172A] font-semibold">Tool</th>
                      <th className="p-3 text-left border-r border-[#E2E8F0] text-[#0F172A] font-semibold">What It Measures</th>
                      <th className="p-3 text-left border-r border-[#E2E8F0] text-[#0F172A] font-semibold">Cookies?</th>
                      <th className="p-3 text-left text-[#0F172A] font-semibold">Privacy Approach</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#E2E8F0]">
                      <td className="p-3 border-r border-[#E2E8F0] font-medium text-[#0F172A]">Google Search Console</td>
                      <td className="p-3 border-r border-[#E2E8F0] text-[#334155]">How our website appears in Google search results, which search queries bring visitors, and click-through rates.</td>
                      <td className="p-3 border-r border-[#E2E8F0] text-rose-600 font-semibold">❌ None</td>
                      <td className="p-3 text-[#334155]">Reads Google&apos;s search index data — no cookies placed on your device.</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-[#E2E8F0] font-medium text-[#0F172A]">Vercel Analytics (if enabled)</td>
                      <td className="p-3 border-r border-[#E2E8F0] text-[#334155]">Page views, top pages, referrers (where visitors came from), and basic geographic information at the country level.</td>
                      <td className="p-3 border-r border-[#E2E8F0] text-rose-600 font-semibold">❌ None</td>
                      <td className="p-3 text-[#334155]">Privacy-first by design — no cookies, no personal identifiers, no cross-site tracking. Data is aggregated and anonymized.</td>
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

              <h2 className="text-[#0F172A] font-bold text-lg sm:text-xl tracking-tight mt-8 mb-3">
                Future Analytics Tools
              </h2>
              <p>If we add any analytics tool in the future that uses cookies or collects more detailed information, we will:</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Update this Cookie Policy with at least <strong>30 days&apos; notice</strong> before the tool is activated.</li>
                <li>Notify registered users by email.</li>
                <li>Obtain your <strong>explicit consent</strong> before placing any non-essential cookies on your device.</li>
                <li>Clearly explain what data the new tool collects and why we need it.</li>
              </ul>

              <h2 className="text-[#0F172A] font-bold text-lg sm:text-xl tracking-tight mt-8 mb-3">
                How Long Does Our Session Cookie Last?
              </h2>
              <p>
                Our session cookie is deleted automatically when you close your browser. It does not persist on your device. The next time you open the platform, you will simply log in again and a fresh session cookie is created.
              </p>

              <h2 className="text-[#0F172A] font-bold text-lg sm:text-xl tracking-tight mt-8 mb-3">
                What If You Disable Cookies?
              </h2>
              <p>
                You can block or delete cookies at any time through your browser settings — usually found under Settings → Privacy and Security → Cookies.
              </p>
              <p className="border-l-4 border-amber-500 pl-4 py-3 bg-amber-50/60 rounded-r-xl text-amber-950">
                <strong>PLEASE NOTE:</strong> Because our only cookie is the one that keeps you logged in, disabling cookies will prevent you from signing in or using any part of the Vaakriti AI platform. This is not a marketing cookie you can opt out of — it is the core mechanism that makes secure login work. Without it, the platform cannot function for you.
              </p>

              <h2 className="text-[#0F172A] font-bold text-lg sm:text-xl tracking-tight mt-8 mb-3">
                Our Position Under the DPDP Act, 2023
              </h2>
              <p>
                India&apos;s Digital Personal Data Protection Act, 2023 does not require consent for cookies that are strictly necessary to provide a service you have actively requested — such as an authentication cookie that keeps you logged in. Our session cookie falls squarely within this category.
              </p>
              <p>
                We are disclosing this policy not because the law requires a consent banner for essential cookies, but because we believe you have a right to know exactly what is on your device and why, and what tools we use to understand our platform&apos;s performance.
              </p>

              <h2 className="text-[#0F172A] font-bold text-lg sm:text-xl tracking-tight mt-8 mb-3">
                Updates to This Policy
              </h2>
              <p>
                If we ever change our cookie practices, we will update this page, revise the &ldquo;Last Updated&rdquo; date, and notify registered users by email at least 30 days in advance. Any addition of non-essential cookies will require your explicit consent at that time.
              </p>

              <h2 className="text-[#0F172A] font-bold text-lg sm:text-xl tracking-tight mt-8 mb-3">
                Questions?
              </h2>
              <p>
                Email our team at <a href="mailto:support@vaakriti.com" className="text-[#2563EB] hover:underline font-semibold">support@vaakriti.com</a>.
              </p>

              <hr className="border-[#E2E8F0] my-6" />

              <p className="text-xs sm:text-[13px] text-[#64748B] italic text-center font-mono">
                Vaakriti AI — a proprietary concern of the founders, pending formal registration under the Limited Liability Partnership Act, 2008. Currently operating remotely. Registered address will be updated upon incorporation.
              </p>

            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
