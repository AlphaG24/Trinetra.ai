import { Layout } from "@/components/layout/Layout";

export const metadata = {
  title: "Terms of Service | TrinetraEdu-AI",
  description: "Terms of Service for TrinetraEdu-AI. Understand your rights, obligations, and legal agreements when using our platform.",
};

export default function TermsOfServicePage() {
  return (
    <Layout>
      <div className="flex flex-col bg-[#080010] min-h-screen pt-[140px] pb-[100px] px-[20px] relative overflow-hidden">

        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 600px 600px at center top, rgba(139,92,246,0.08) 0%, transparent 60%)'
          }}
        />

        <div className="max-w-[850px] mx-auto w-full relative z-10 flex flex-col items-center">

          <h1 className="font-display font-bold text-[36px] md:text-[44px] text-[#FAF7FF] tracking-[-0.02em] leading-tight mb-[16px] text-center">
            Terms of Service
          </h1>
          <p className="font-sans font-normal text-[14px] text-[#9A91B5] mb-[48px] text-center font-mono">
            TrinetraEdu-AI (trinetraedu-ai.com) • Effective Date: 15-07-2026 • Last Updated: 14-07-2026
          </p>

          <div className="w-full bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[24px] md:p-[48px] shadow-[0_0_40px_rgba(139,92,246,0.05)]">
            <div className="prose prose-invert max-w-none text-[#B8B0D1] font-sans font-normal text-[15px] leading-[1.8] space-y-6">

              <hr className="border-[#1E0A35] my-6" />

              {/* IMPORTANT LEGAL NOTICES */}
              <div className="border-l-2 border-[#A78BFA] pl-[16px] py-[8px] bg-[rgba(139,92,246,0.02)] rounded-r-md space-y-2 my-6">
                <p className="font-medium text-[#FAF7FF] italic text-[14px] leading-relaxed"><strong>IMPORTANT NOTICE REGARDING LEGAL STATUS:</strong></p>
                <p className="font-medium text-[#FAF7FF] italic text-[14px] leading-relaxed">TrinetraEdu-AI is currently a proprietary concern of its founders, pending formal registration under the Limited Liability Partnership Act, 2008. References to "Company," "we," "us," or "our" in these Terms refer to TrinetraEdu-AI in its current legal form. Upon formal incorporation, these Terms will be updated to reflect the registered entity details, and Users will be notified as required under Section 16 (Changes to Terms). We are transparent about this status and committed to legal compliance throughout our operational lifecycle.</p>
              </div>

              <hr className="border-[#1E0A35] my-6" />

              <div className="border-l-2 border-[#A78BFA] pl-[16px] py-[8px] bg-[rgba(139,92,246,0.02)] rounded-r-md space-y-2 my-6">
                <p className="font-medium text-[#FAF7FF] italic text-[14px] leading-relaxed"><strong>PLEASE READ THESE TERMS OF SERVICE CAREFULLY.</strong></p>
                <p className="font-medium text-[#FAF7FF] italic text-[14px] leading-relaxed">By accessing or using this Platform, you are entering into a legally binding contract. If you do not agree to these Terms in their entirety, you must immediately cease all use of the Platform.</p>
              </div>

              <hr className="border-[#1E0A35] my-6" />

              {/* TABLE OF CONTENTS */}
              <h2 className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">TABLE OF CONTENTS</h2>
              <nav className="space-y-2 text-[14px] text-[#A78BFA] font-medium">
                <ol className="list-decimal list-inside space-y-1">
                  <li><a href="#1-acceptance-of-terms" className="hover:underline">Acceptance of Terms</a></li>
                  <li><a href="#2-eligibility" className="hover:underline">Eligibility</a></li>
                  <li><a href="#3-account-registration-and-security" className="hover:underline">Account Registration & Security</a></li>
                  <li><a href="#4-free-tier-and-paid-services" className="hover:underline">Free Tier & Paid Services</a></li>
                  <li><a href="#5-acceptable-use-policy" className="hover:underline">Acceptable Use Policy</a></li>
                  <li><a href="#6-user-generated-content" className="hover:underline">User-Generated Content</a></li>
                  <li><a href="#7-intellectual-property" className="hover:underline">Intellectual Property</a></li>
                  <li><a href="#8-third-party-services" className="hover:underline">Third-Party Services</a></li>
                  <li><a href="#9-service-availability" className="hover:underline">Service Availability</a></li>
                  <li><a href="#10-security-practices" className="hover:underline">Security Practices</a></li>
                  <li><a href="#11-limitation-of-liability" className="hover:underline">Limitation of Liability</a></li>
                  <li><a href="#12-indemnification" className="hover:underline">Indemnification</a></li>
                  <li><a href="#13-data-handling" className="hover:underline">Data Handling</a></li>
                  <li><a href="#14-termination" className="hover:underline">Termination</a></li>
                  <li><a href="#15-dispute-resolution" className="hover:underline">Dispute Resolution</a></li>
                  <li><a href="#16-changes-to-terms" className="hover:underline">Changes to Terms</a></li>
                  <li><a href="#17-future-feature-provisions" className="hover:underline">Future Feature Provisions</a></li>
                  <li><a href="#18-miscellaneous" className="hover:underline">Miscellaneous</a></li>
                  <li><a href="#19-contact-us" className="hover:underline">Contact Us</a></li>
                </ol>
              </nav>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 1: ACCEPTANCE OF TERMS */}
              <h2 id="1-acceptance-of-terms" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">1. ACCEPTANCE OF TERMS</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">1.1 The Agreement</h3>
              <p>These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and <strong>TrinetraEdu-AI</strong> (a proprietary concern of the founders, pending formal registration under the Limited Liability Partnership Act, 2008) ("Company," "we," "us," or "our").</p>
              <p>These Terms govern your access to and use of the TrinetraEdu-AI zero-code AI platform, including its:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Website(s) and web application</li>
                <li>Mobile applications (if any)</li>
                <li>Application Programming Interfaces (APIs)</li>
                <li>AI-powered voice agents</li>
                <li>MSME Navigator tool</li>
                <li>Document processing features</li>
                <li>Marketplace (upon launch)</li>
                <li>All other related products, services, and features</li>
              </ul>
              <p>(collectively referred to as the "Platform").</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">1.2 Incorporated Policies</h3>
              <p>These Terms incorporate by reference the following additional policies, each of which forms part of the binding agreement between you and the Company:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li><strong>Privacy Policy</strong> — governs the collection, processing, and protection of your personal data</li>
                <li><strong>Cookie Policy</strong> — governs the use of cookies and similar tracking technologies</li>
                <li><strong>Refund and Cancellation Policy</strong> — governs all subscription and payment-related matters</li>
              </ul>
              <p>In the event of any conflict between these Terms and any incorporated policy on matters specifically addressed by that policy, the specific policy shall prevail to the extent of that conflict.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">1.3 Binding Nature of Acceptance</h3>
              <p>By <strong>any</strong> of the following acts, you agree to be bound by these Terms:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Clicking "I Agree," "Accept," or any similar affirmation button;</li>
                <li><strong>(b)</strong> Registering for an account on the Platform;</li>
                <li><strong>(c)</strong> Accessing or browsing the Platform after these Terms have been made available to you;</li>
                <li><strong>(d)</strong> Using any API, feature, or service of the Platform.</li>
              </ol>
              <p><strong>If you do not agree to these Terms, you must not access, register for, or use the Platform in any manner.</strong></p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">1.4 Authority to Contract</h3>
              <p>If you are accessing the Platform on behalf of a business, organization, educational institution, or other legal entity, you represent and warrant that you have the legal authority to bind that entity to these Terms, and all references to "you" shall apply to both you individually and to that entity.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">1.5 Acknowledgment of Startup Status</h3>
              <p>You acknowledge and accept that:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> TrinetraEdu-AI is currently operating as an unregistered proprietary concern pending formal incorporation;</li>
                <li><strong>(b)</strong> Certain features and service commitments described in these Terms reflect the Company's intended operational standards and may be subject to refinement as the Company matures;</li>
                <li><strong>(c)</strong> This does not diminish the binding legal nature of these Terms or the Company's obligations to you as a User.</li>
              </ol>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 2: ELIGIBILITY */}
              <h2 id="2-eligibility" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">2. ELIGIBILITY</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">2.1 Minimum Age Requirements</h3>
              <p>To use the Platform, you must meet one of the following age criteria:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> <strong>18 years of age or older</strong> — you may register and use the Platform independently; or</li>
                <li><strong>(b)</strong> <strong>Between 13 and 18 years of age</strong> — you may only use the Platform with the <strong>verified, documented consent and active supervision</strong> of a parent or legal guardian who:</li>
              </ol>
              <ul className="list-disc list-inside pl-[16px] space-y-1 ml-[16px]">
                <li>Is 18 years of age or older;</li>
                <li>Has read and agreed to these Terms on your behalf; and</li>
                <li>Accepts full legal responsibility for your use of the Platform.</li>
              </ul>
              <p><strong>The Platform is not intended for children below the age of 13 years.</strong> If we discover that a User below 13 years of age has registered without proper guardian consent, we will immediately delete that account and any associated data without notice.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">2.2 Legal Capacity</h3>
              <p>You represent and warrant that you:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Possess full legal capacity to enter into a binding contract under the <strong>Indian Contract Act, 1872</strong>, and are not a person disqualified from contracting under applicable law;</li>
                <li><strong>(b)</strong> Are not subject to any court order, regulatory restriction, or legal prohibition that would prevent you from entering into or performing your obligations under these Terms;</li>
                <li><strong>(c)</strong> If located outside India, are complying with all laws applicable in your jurisdiction regarding the use of AI-powered platforms, data processing, and digital services.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">2.3 Geographic Restrictions</h3>
              <p>The Platform is developed and operated from India and is primarily intended for Indian users. However, international Users may access the Platform subject to:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Compliance with their local laws;</li>
                <li><strong>(b)</strong> Acceptance that Indian law governs this agreement as specified in Section 15;</li>
                <li><strong>(c)</strong> The Company's right to restrict access from specific jurisdictions for regulatory or compliance reasons, without prior notice.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">2.4 Business User Eligibility</h3>
              <p>If you are a business User:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> You must be a duly constituted and lawfully operating business entity;</li>
                <li><strong>(b)</strong> You warrant that the person accepting these Terms on your behalf is duly authorized to do so;</li>
                <li><strong>(c)</strong> You accept that the Company may request proof of business registration or authority before permitting certain advanced features.</li>
              </ol>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 3: ACCOUNT REGISTRATION & SECURITY */}
              <h2 id="3-account-registration-and-security" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">3. ACCOUNT REGISTRATION & SECURITY</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.1 Accurate Registration Information</h3>
              <p>When registering for an account, you agree to provide:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Your true full name (or the registered business name, if applicable);</li>
                <li><strong>(b)</strong> A valid and actively monitored email address;</li>
                <li><strong>(c)</strong> Accurate phone number and location information where requested;</li>
                <li><strong>(d)</strong> Any other information required by the registration process.</li>
              </ol>
              <p>You further agree to <strong>promptly update</strong> your account information to ensure it remains accurate, complete, and current at all times. Providing false registration information is a material breach of these Terms.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.2 Account Credentials and Confidentiality</h3>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> You are <strong>solely and entirely responsible</strong> for maintaining the confidentiality of your account password, API keys, authentication tokens, and any other access credentials associated with your account.</li>
                <li><strong>(b)</strong> You are responsible for <strong>all activity that occurs under your account</strong>, whether or not you authorized that activity.</li>
                <li><strong>(c)</strong> You agree to implement reasonable security practices, including using a strong and unique password, enabling two-factor authentication (2FA) where offered, and not sharing credentials with unauthorized persons.</li>
                <li><strong>(d)</strong> You must <strong>notify us immediately</strong> at <a href="mailto:support@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">support@trinetraedu-ai.com</a> if you become aware of or reasonably suspect any unauthorized use of your account, any compromise of your credentials, or any other security incident related to your account.</li>
                <li><strong>(e)</strong> The Company will not be liable for any loss or damage arising from your failure to comply with this Section, including losses resulting from unauthorized account access where you failed to notify the Company.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.3 One Account Per User</h3>
              <p>Unless the Company has provided prior written authorization, only <strong>one account per individual or legal entity</strong> is permitted. Creating multiple accounts to circumvent usage limits, subscription fees, or any account suspension or termination is a material breach of these Terms.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.4 Account Suspension and Termination by Company</h3>
              <p>The Company reserves the right to, at its sole discretion:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> <strong>Immediately suspend or restrict</strong> any account where it reasonably suspects fraud, unauthorized access, security risk, illegal activity, or violation of these Terms, without prior notice;</li>
                <li><strong>(b)</strong> <strong>Permanently terminate</strong> any account found to be in material violation of these Terms, the Acceptable Use Policy, or any applicable law, after providing notice where legally and practically required;</li>
                <li><strong>(c)</strong> <strong>Require re-verification</strong> of your identity or business registration status at any time, and suspend access pending satisfactory completion of such verification.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.5 No Sharing of API Access</h3>
              <p>If the Platform provides you with API access credentials, you may not:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Share, publish, or distribute your API keys;</li>
                <li><strong>(b)</strong> Embed your API keys in publicly accessible code repositories;</li>
                <li><strong>(c)</strong> Use your API keys to power a service or product that gives third parties access to the Platform without the Company's prior written authorization.</li>
              </ol>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 4: FREE TIER & PAID SERVICES */}
              <h2 id="4-free-tier-and-paid-services" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">4. FREE TIER & PAID SERVICES</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">4.1 Free Tier</h3>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> The Platform may offer a <strong>free tier</strong> providing limited access to demo features and trial usage, subject to usage caps, feature restrictions, and time limits as displayed on the Platform's pricing page.</li>
                <li><strong>(b)</strong> The Company reserves the right to <strong>modify, restrict, or discontinue</strong> the free tier at any time, with <strong>30 days' advance notice</strong> to affected Users.</li>
                <li><strong>(c)</strong> Free tier usage does not entitle the User to any service level commitments, guaranteed uptime, or priority support.</li>
                <li><strong>(d)</strong> The Company may display promotional content, feature announcements, or upgrade prompts to free tier Users.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">4.2 Paid Subscription Tiers</h3>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Paid subscriptions provide access to features and usage limits as specified on the Platform's pricing page at the time of subscription.</li>
                <li><strong>(b)</strong> Subscriptions are billed in advance on a monthly or annual basis, as selected at the time of purchase.</li>
                <li><strong>(c)</strong> Subscription access is <strong>personal and non-transferable</strong> unless the Company explicitly offers team or organizational plans allowing multiple users under one subscription.</li>
                <li><strong>(d)</strong> You authorize the Company (or its payment processor) to charge your designated payment method for all applicable subscription fees and taxes on the billing cycle you have selected.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">4.3 Pricing Changes</h3>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> The Company reserves the right to change pricing for any plan at any time.</li>
                <li><strong>(b)</strong> <strong>Existing subscribers</strong> will be given a <strong>minimum of 30 days' advance notice by email</strong> before any price change takes effect on their next billing cycle.</li>
                <li><strong>(c)</strong> If you do not agree to a price change, you may cancel your subscription before the new pricing takes effect. Continued use of the Platform after the new pricing takes effect constitutes your acceptance of the revised pricing.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">4.4 Taxes</h3>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> All prices are exclusive of applicable taxes unless stated otherwise.</li>
                <li><strong>(b)</strong> <strong>Goods and Services Tax (GST)</strong> and any other applicable taxes will be charged at the prevailing rate in addition to the subscription fee.</li>
                <li><strong>(c)</strong> You are responsible for providing accurate GST registration information if you are eligible to claim input tax credit.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">4.5 Payment Failure</h3>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> If payment fails on your billing date, the Company will attempt to notify you and may provide a grace period of up to <strong>7 days</strong> to resolve the payment issue before downgrading or suspending your account.</li>
                <li><strong>(b)</strong> Accounts with outstanding dues may be restricted to free tier access or suspended until payment is completed.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">4.6 Refunds</h3>
              <p>All refunds are governed by the <strong>Refund and Cancellation Policy</strong> incorporated into these Terms. Key provisions for reference:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> <strong>No refunds</strong> are issued for services already consumed or features already used;</li>
                <li><strong>(b)</strong> <strong>Annual plans</strong> canceled within <strong>14 calendar days</strong> of the original purchase date are eligible for a pro-rata refund for genuinely unused months, subject to the Refund and Cancellation Policy;</li>
                <li><strong>(c)</strong> <strong>Monthly plans</strong> are non-refundable for mid-cycle cancellations, except where the Platform was unavailable for more than <strong>48 continuous hours</strong> due to causes solely attributable to the Company;</li>
                <li><strong>(d)</strong> Refund requests must be submitted via email to <a href="mailto:billing@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">billing@trinetraedu-ai.com</a> with supporting details, and will be processed within <strong>10 business days</strong> of approval.</li>
              </ol>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 5: ACCEPTABLE USE POLICY */}
              <h2 id="5-acceptable-use-policy" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">5. ACCEPTABLE USE POLICY</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">5.1 General Prohibited Conduct</h3>
              <p>You agree that you shall <strong>not</strong>, and shall not permit, authorize, or enable any third party to, use the Platform to:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Violate any applicable local, state, national, or international law or regulation, including but not limited to the <strong>Indian Penal Code, 1860</strong>, the <strong>Information Technology Act, 2000</strong> and its associated Rules, the <strong>Digital Personal Data Protection Act, 2023</strong>, or any other law applicable to your use case;</li>
                <li><strong>(b)</strong> Transmit, upload, post, or otherwise make available any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, sexually explicit, invasive of another's privacy, hateful, or racially, ethnically, or otherwise objectionable;</li>
                <li><strong>(c)</strong> Impersonate any person or entity, or falsely state or otherwise misrepresent your affiliation with a person or entity;</li>
                <li><strong>(d)</strong> Upload, transmit, or distribute malware, viruses, Trojan horses, worms, spyware, adware, or any other malicious or harmful code;</li>
                <li><strong>(e)</strong> Interfere with, disrupt, or attempt to gain unauthorized access to the Platform's servers, networks, or security systems, or any other system connected to the Platform;</li>
                <li><strong>(f)</strong> Conduct or facilitate <strong>distributed denial-of-service (DDoS) attacks</strong>, brute force attacks, credential stuffing, or other cyberattacks;</li>
                <li><strong>(g)</strong> Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code, underlying machine learning models, model weights, training data, or system architecture of any component of the Platform;</li>
                <li><strong>(h)</strong> Conduct unauthorized <strong>automated scraping, web crawling, or data mining</strong> of the Platform;</li>
                <li><strong>(i)</strong> Make excessive, abusive, or bot-driven API calls that exceed documented rate limits or that degrade Platform performance for other users;</li>
                <li><strong>(j)</strong> <strong>Resell, sublicense, rent, white-label, or otherwise provide access</strong> to the Platform or its services to third parties without the Company's prior written authorization;</li>
                <li><strong>(k)</strong> Use the Platform to develop, train, or improve a <strong>competing AI product or service</strong> without explicit written authorization from the Company;</li>
                <li><strong>(l)</strong> Use AI-generated outputs from the Platform to <strong>deceive, defraud, or mislead</strong> any person, including presenting AI-generated content as human-created without appropriate disclosure.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">5.2 Voice Agent Specific Prohibitions</h3>
              <p>In addition to the general prohibitions above, Users deploying voice agents through the Platform shall not:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Use voice agents to conduct <strong>spam calls, unsolicited robocalling, automated phishing</strong>, or any form of fraudulent outbound communication;</li>
                <li><strong>(b)</strong> Use voice agents to <strong>impersonate government officials, law enforcement, financial institutions</strong>, or any other entity in a manner intended to deceive call recipients;</li>
                <li><strong>(c)</strong> <strong>Record calls without consent</strong> of all parties to the call, in violation of applicable Indian law or the law of the jurisdiction in which the call recipient is located;</li>
                <li><strong>(d)</strong> Use voice agents for <strong>debt collection or financial solicitation</strong> without holding requisite licenses and registrations under applicable law.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">5.3 TRAI Compliance Obligation</h3>
              <p>Users deploying voice agents through the Platform are <strong>solely and entirely responsible</strong> for ensuring compliance with all applicable <strong>Telecom Regulatory Authority of India (TRAI) regulations</strong>, including but not limited to:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Registration under the applicable <strong>commercial communication framework</strong> for any outbound calling or SMS use case;</li>
                <li><strong>(b)</strong> <strong>Sender ID registration</strong> for commercial communications;</li>
                <li><strong>(c)</strong> Maintenance of and adherence to <strong>consumer consent records</strong> for outbound communications;</li>
                <li><strong>(d)</strong> Compliance with the <strong>Do Not Disturb (DND) registry</strong> requirements;</li>
                <li><strong>(e)</strong> Adherence to <strong>permissible calling hours</strong> and frequency limits set by TRAI for commercial communications;</li>
                <li><strong>(f)</strong> Any other TRAI directions, circulars, or regulations as amended from time to time.</li>
              </ol>
              <p><strong>The Company is not responsible for and shall not be liable for any TRAI penalties, fines, or enforcement actions arising from your use of voice agent features.</strong> The Company may suspend or permanently revoke voice agent access for accounts found to be non-compliant with telecom regulations, without prior notice and without liability.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">5.4 AI Ethics and Responsible Use</h3>
              <p>You agree to use the Platform's AI capabilities responsibly, including:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Not using AI-generated content to spread disinformation, propaganda, or deliberately false information at scale;</li>
                <li><strong>(b)</strong> Not using AI voice cloning or synthetic voice features (if offered) to create <strong>deceptive deepfake audio</strong> of real persons without their consent;</li>
                <li><strong>(c)</strong> Disclosing to your end-users where AI is being used to interact with them, in compliance with applicable consumer protection law;</li>
                <li><strong>(d)</strong> Not using the Platform to make <strong>automated, consequential decisions</strong> about individuals (such as credit scoring, employment screening, or insurance underwriting) without implementing appropriate human oversight and informing affected individuals.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">5.5 Consequences of Violation</h3>
              <p>Violation of this Acceptable Use Policy may, at the Company's discretion, result in:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Immediate suspension of your account, without prior notice;</li>
                <li><strong>(b)</strong> Permanent termination of your account;</li>
                <li><strong>(c)</strong> Reporting of illegal activity to law enforcement or regulatory authorities;</li>
                <li><strong>(d)</strong> Civil action for damages or injunctive relief; and/or</li>
                <li><strong>(e)</strong> Any other remedy available to the Company under law or equity.</li>
              </ol>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 6: USER-GENERATED CONTENT */}
              <h2 id="6-user-generated-content" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">6. USER-GENERATED CONTENT</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">6.1 Ownership of User Content</h3>
              <p>You retain all ownership rights in the data, content, text, prompts, files, documents, images, configurations, workflow designs, and other materials you upload, submit, or create on or through the Platform ("User Content"). Nothing in these Terms transfers ownership of your User Content to the Company.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">6.2 License Granted to the Company</h3>
              <p>By uploading or submitting User Content to the Platform, you grant the Company a limited, non-exclusive, worldwide, royalty-free, revocable (upon termination of your account) license to access, host, store, process, transmit, and use your User Content <strong>solely to the extent necessary to</strong>:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Provide the Platform's services to you;</li>
                <li><strong>(b)</strong> Maintain, debug, and improve the technical performance of the Platform;</li>
                <li><strong>(c)</strong> Comply with legal obligations; and</li>
                <li><strong>(d)</strong> Enforce these Terms.</li>
              </ol>
              <p>"The Company will not use your User Content to train, fine-tune, or improve AI models without your separate, specific, and informed consent. This prohibition does not apply to: (a) inference processing performed to generate responses you request; or (b) storing data within your account to personalize your experience on the Platform."</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">6.3 Your Representations Regarding User Content</h3>
              <p>By submitting User Content, you represent and warrant that:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> You own all rights to the User Content or have obtained all necessary licenses and permissions to submit it;</li>
                <li><strong>(b)</strong> Your User Content does not infringe any third party's intellectual property rights, privacy rights, or any other legal rights;</li>
                <li><strong>(c)</strong> Your User Content complies with all applicable laws and these Terms.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">6.4 Public and Community Content</h3>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Any content you submit to <strong>publicly visible areas</strong> of the Platform — including blog comments, community forums, reviews, or public agent showcases — may be viewed by other Users and the public.</li>
                <li><strong>(b)</strong> The Company reserves the right to <strong>moderate, edit, or remove</strong> any public-facing User Content that violates these Terms, applicable law, or Platform community standards, without prior notice and without liability to you.</li>
                <li><strong>(c)</strong> You grant the Company the right to display your publicly submitted content within the Platform and in promotional materials (e.g., testimonials, case studies) subject to your privacy settings and consent.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">6.5 Business Data</h3>
              <p>The Company acknowledges that Users may process sensitive business data, customer records, or proprietary information through the Platform. The Company:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Does not claim ownership of such data;</li>
                <li><strong>(b)</strong> Will process it only in accordance with the Privacy Policy and applicable data protection law;</li>
                <li><strong>(c)</strong> Maintains technical and organizational security measures appropriate to the sensitivity of the data processed, as described in Section 10.</li>
              </ol>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 7: INTELLECTUAL PROPERTY */}
              <h2 id="7-intellectual-property" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">7. INTELLECTUAL PROPERTY</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">7.1 Company's Intellectual Property</h3>
              <p>The Company owns all right, title, and interest in and to:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> The Platform and all its constituent software, code (front-end and back-end), databases, and infrastructure;</li>
                <li><strong>(b)</strong> All AI models, algorithms, training methodologies, prompt engineering systems, and processing pipelines developed by or for the Company;</li>
                <li><strong>(c)</strong> Platform templates, workflow designs, agent configurations provided by the Company as default or example resources;</li>
                <li><strong>(d)</strong> The Platform's user interface, visual design, graphics, logos, icons, and overall look and feel;</li>
                <li><strong>(e)</strong> All documentation, guides, tutorials, and knowledge base content authored by the Company;</li>
                <li><strong>(f)</strong> All patents (applied for or granted), trademarks, copyrights, trade secrets, and other intellectual property rights subsisting in any of the above.</li>
              </ol>
              <p><strong>Nothing in these Terms grants you any right, title, or interest in any of the foregoing, except for the limited license to use the Platform as described in these Terms.</strong></p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">7.2 User's Intellectual Property</h3>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> You retain ownership of your <strong>User Content</strong> as described in Section 6.1.</li>
                <li><strong>(b)</strong> You retain ownership of <strong>custom AI agent configurations and workflows</strong> you design using the Platform's zero-code tools, to the extent such configurations represent original creative or intellectual work by you, subject to the Company's underlying rights in the Platform tools used to create them.</li>
                <li><strong>(c)</strong> AI-generated outputs produced by the Platform in response to your inputs may be used by you subject to applicable law regarding AI-generated content ownership and these Terms.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">7.3 Feedback and Suggestions</h3>
              <p>Any feedback, bug reports, feature requests, suggestions, recommendations, or other input you voluntarily provide to the Company regarding the Platform ("Feedback") shall:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Become the <strong>sole and exclusive property</strong> of the Company upon submission;</li>
                <li><strong>(b)</strong> Be usable by the Company <strong>without restriction, compensation, attribution, or obligation</strong> to you;</li>
                <li><strong>(c)</strong> Not be treated as confidential information.</li>
              </ol>
              <p>You waive any moral rights or similar rights you may have in such Feedback to the maximum extent permitted by applicable law.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">7.4 Trademarks</h3>
              <p>"TrinetraEdu-AI," the TrinetraEdu-AI logo, and all related product and service names, designs, and slogans are proprietary marks of the Company. <strong>No license to use the Company's trademarks is granted</strong> under these Terms or otherwise, except with the Company's prior written consent in each instance.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">7.5 Copyright Infringement Reporting</h3>
              <p>If you believe that content on the Platform infringes your copyright, please notify the Company at <a href="mailto:support@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">support@trinetraedu-ai.com</a> with the subject line "Copyright Infringement Notice," providing:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Identification of the copyrighted work claimed to be infringed;</li>
                <li><strong>(b)</strong> Identification of the infringing content and its location on the Platform;</li>
                <li><strong>(c)</strong> Your contact information and a statement of good faith belief that the use is unauthorized;</li>
                <li><strong>(d)</strong> A declaration that the information is accurate and you are the copyright owner or authorized to act on their behalf.</li>
              </ol>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 8: THIRD-PARTY SERVICES */}
              <h2 id="8-third-party-services" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">8. THIRD-PARTY SERVICES</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">8.1 Third-Party Integrations</h3>
              <p>The Platform integrates with and relies upon third-party service providers to deliver certain functionalities. <strong>Current key third-party integrations include, but are not limited to:</strong></p>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Third-Party Provider</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Functionality Provided</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]"><strong>Vapi</strong></td>
                      <td className="p-3">Voice AI infrastructure and real-time voice agent orchestration</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]"><strong>Twilio</strong></td>
                      <td className="p-3">Telephony, SMS, and communication infrastructure</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]"><strong>Google Gemini</strong></td>
                      <td className="p-3">Large language model (LLM) capabilities for AI processing</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]"><strong>Supabase</strong></td>
                      <td className="p-3">Database infrastructure, authentication, and real-time data</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]"><strong>Stripe / Razorpay</strong></td>
                      <td className="p-3">Payment processing</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[#A5A1B0] text-[13px] mt-2">This list may be updated from time to time. Material changes to third-party providers that affect data processing will be reflected in the updated Privacy Policy.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">8.2 Third-Party Terms</h3>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> By using Platform features that rely on third-party integrations, <strong>you agree to be bound by each respective third-party provider's own terms of service, acceptable use policy, and privacy policy</strong> as applicable.</li>
                <li><strong>(b)</strong> You are encouraged to review the terms of key providers before using features that depend on their services.</li>
                <li><strong>(c)</strong> In particular, if you use voice agent features, you are subject to both Vapi's and Twilio's terms of service and acceptable use policies regarding permissible use of their communications infrastructure.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">8.3 Company's Limitation of Liability for Third Parties</h3>
              <p>The Company is <strong>not responsible for and expressly disclaims all liability</strong> with respect to:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Service outages, errors, performance degradation, or unavailability attributable to third-party providers;</li>
                <li><strong>(b)</strong> Third-party providers' data handling practices, privacy practices, or security incidents;</li>
                <li><strong>(c)</strong> Changes to third-party providers' terms, pricing, or features that affect the Platform's functionality;</li>
                <li><strong>(d)</strong> Third-party providers' decisions to restrict, suspend, or terminate their services.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">8.4 Supabase and Data Infrastructure</h3>
              <p>The Platform's database and authentication infrastructure is hosted on <strong>Supabase</strong>, which in turn uses cloud infrastructure providers. Your data processed through the Platform is subject to Supabase's data processing terms in addition to the Company's own data handling commitments in Section 13 and the Privacy Policy.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">8.5 No Endorsement</h3>
              <p>The inclusion of third-party services in the Platform does not constitute an endorsement, recommendation, or guarantee of such services by the Company.</p>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 9: SERVICE AVAILABILITY */}
              <h2 id="9-service-availability" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">9. SERVICE AVAILABILITY</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">9.1 Best-Effort Basis</h3>
              <p>The Platform is provided on a <strong>"best-effort" basis</strong>. The Company <strong>does not guarantee</strong> uninterrupted, error-free, or continuously available access to the Platform or any of its features.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">9.2 No SLA for Free Tier</h3>
              <p>No service level agreement (SLA) or uptime commitment applies to free tier Users. Free tier access may be more frequently subject to maintenance, rate limiting, or capacity constraints.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">9.3 Paid Tier Availability</h3>
              <p>The Company aims to maintain <strong>high availability</strong> for paid tier Users and will use commercially reasonable efforts to:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Provide <strong>advance notice of at least 48 hours</strong> for scheduled maintenance windows via email or in-platform notification, except in emergency situations;</li>
                <li><strong>(b)</strong> Restore service <strong>as promptly as reasonably possible</strong> following unplanned outages;</li>
                <li><strong>(c)</strong> Communicate the status of major outages via email communications.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">9.4 Third-Party Dependency Acknowledgment</h3>
              <p>Users acknowledge that Platform availability is partially dependent on third-party services (including those listed in Section 8), and that outages caused by such third parties are outside the Company's direct control. Such outages will not automatically entitle Users to refunds or service credits unless specifically provided in the Refund and Cancellation Policy.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">9.5 Maintenance Rights</h3>
              <p>The Company reserves the right to:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Take the Platform offline for scheduled or emergency maintenance at any time;</li>
                <li><strong>(b)</strong> Modify, suspend, or permanently discontinue any feature or service, in whole or in part, with <strong>30 days' notice</strong> for planned discontinuations that materially affect paying Users.</li>
              </ol>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 10: SECURITY PRACTICES */}
              <h2 id="10-security-practices" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">10. SECURITY PRACTICES</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">10.1 Enterprise-Grade Security Measures</h3>
              <p>The Platform implements the following technical and organizational security measures to protect User data and Platform integrity:</p>
              <p><strong>(a) Encryption:</strong></p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>All data transmitted between your browser/application and the Platform is encrypted using <strong>Transport Layer Security (TLS) 1.3</strong> or higher;</li>
                <li>All User data stored in Platform databases is encrypted at rest using <strong>AES-256 encryption</strong>.</li>
              </ul>
              <p><strong>(b) Database Access Controls:</strong></p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li><strong>Row-Level Security (RLS)</strong> is enforced on all database tables containing User data, ensuring that each User can access only their own data and no cross-tenant data leakage occurs.</li>
              </ul>
              <p><strong>(c) Consent Integrity:</strong></p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>All consent records (including parental consent for minor users and DPDP Act consent records) are <strong>cryptographically signed using SHA-256 hashing</strong> to ensure tamper-evident, auditable records.</li>
              </ul>
              <p><strong>(d) API Rate Limiting:</strong></p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li><strong>Rate limiting controls</strong> are implemented on all API endpoints to prevent abuse, protect service availability, and mitigate brute-force and enumeration attacks.</li>
              </ul>
              <p><strong>(e) Vulnerability Management:</strong></p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>The Platform undergoes <strong>regular automated dependency vulnerability scanning</strong> to identify and remediate known security vulnerabilities in software libraries and components.</li>
              </ul>
              <p><strong>(f) Security Reviews and Penetration Testing:</strong></p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>The Company conducts <strong>quarterly internal security reviews</strong> to assess the Platform's security posture;</li>
                <li>An <strong>annual penetration test</strong> is conducted by an independent security professional or firm to identify and remediate exploitable vulnerabilities (upon reaching 100+ active users or within 12 months of paid tier launch, whichever is earlier);</li>
                <li>Critical findings from security reviews are remediated on a <strong>risk-prioritized basis</strong>.</li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">10.2 Breach Response Plan and Notification</h3>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> The Platform maintains a documented <strong>internal data breach response plan</strong> that governs detection, containment, assessment, notification, and post-incident review procedures.</li>
                <li><strong>(b)</strong> In the event of a personal data breach that is likely to result in risk to your rights and freedoms:</li>
              </ol>
              <ul className="list-disc list-inside pl-[16px] space-y-1 ml-[16px]">
                <li><strong>(i) User Notification:</strong> Affected Users will be notified <strong>within 72 hours of the Company's discovery</strong> of the breach, describing the nature of the breach, data categories affected, likely consequences, and remedial steps taken or proposed;</li>
                <li><strong>(ii) CERT-In Reporting:</strong> The Company will report the incident to the <strong>Indian Computer Emergency Response Team (CERT-In)</strong> within <strong>6 hours of discovery</strong>, as required by the IT (Amendment) Act, 2000 and CERT-In directions;</li>
                <li><strong>(iii) Data Protection Board:</strong> Upon the operationalization of the <strong>Digital Personal Data Protection Act, 2023</strong> notification and reporting requirements, the Company will report qualifying personal data breaches to the <strong>Data Protection Board of India</strong> within the timeframes prescribed under the DPDP Act and its associated rules.</li>
              </ul>
              <ol className="list-decimal list-inside pl-[16px] space-y-2" start={3}>
                <li><strong>(c)</strong> Notification to you will be provided via <strong>email to your registered email address</strong>. It is your responsibility to maintain an accurate and monitored email address in your account.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">10.3 User Security Responsibilities</h3>
              <p>The Company's security measures are most effective when complemented by responsible User behavior. You are responsible for:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Using strong, unique passwords for your Platform account;</li>
                <li><strong>(b)</strong> Enabling two-factor authentication (2FA) where offered;</li>
                <li><strong>(c)</strong> Not sharing account credentials;</li>
                <li><strong>(d)</strong> Keeping your registered email account secure, as it is used for breach notifications and account recovery;</li>
                <li><strong>(e)</strong> Promptly reporting suspected security incidents to <a href="mailto:support@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">support@trinetraedu-ai.com</a>.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">10.4 Responsible Disclosure</h3>
              <p>If you discover a security vulnerability in the Platform, please report it responsibly to <a href="mailto:support@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">support@trinetraedu-ai.com</a> with the subject line "Security Vulnerability Report." Do not exploit or publicly disclose the vulnerability before giving the Company a reasonable opportunity to investigate and remediate it. The Company appreciates responsible disclosure and will acknowledge valid reports.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">10.5 No Guarantee of Absolute Security</h3>
              <p><strong>Notwithstanding the security measures described in this Section, no security system is impenetrable.</strong> The Company cannot guarantee absolute security against:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Unauthorized access by sophisticated threat actors;</li>
                <li><strong>(b)</strong> Exploitation of previously unknown (zero-day) vulnerabilities;</li>
                <li><strong>(c)</strong> Security failures attributable to third-party service providers;</li>
                <li><strong>(d)</strong> Security compromises resulting from a User's own failure to maintain credential security;</li>
                <li><strong>(e)</strong> Force majeure events affecting digital infrastructure.</li>
              </ol>
              <p>The Company commits to implementing what is <strong>commercially reasonable</strong> in terms of security practices for a platform of its type and scale, and to continuously improving its security posture. Users are encouraged to implement independent security measures for their own sensitive data.</p>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 11: LIMITATION OF LIABILITY */}
              <h2 id="11-limitation-of-liability" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">11. LIMITATION OF LIABILITY</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.1 Aggregate Liability Cap</h3>
              <p>To the <strong>maximum extent permitted by applicable Indian law</strong>, the Company's <strong>total aggregate liability</strong> to you arising out of or related to these Terms, the Privacy Policy, or your use of the Platform — whether in contract, tort (including negligence), statute, or otherwise — shall not exceed:</p>
              <p><strong>The total fees actually paid by you to the Company in the six (6) calendar months immediately preceding the date on which the event giving rise to the claim first occurred.</strong></p>
              <p>For free tier Users, the Company's maximum aggregate liability shall not exceed <strong>₹1,000 (Indian Rupees One Thousand Only)</strong>.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.2 Exclusion of Consequential and Indirect Damages</h3>
              <p>To the maximum extent permitted by applicable law, the Company shall <strong>not be liable for</strong>:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Loss of profits or revenue;</li>
                <li><strong>(b)</strong> Loss of business or business opportunity;</li>
                <li><strong>(c)</strong> Loss, corruption, or unauthorized access to data;</li>
                <li><strong>(d)</strong> Business interruption losses;</li>
                <li><strong>(e)</strong> Reputational harm or loss of goodwill;</li>
                <li><strong>(f)</strong> Costs of procuring substitute services;</li>
                <li><strong>(g)</strong> Any indirect, incidental, special, consequential, exemplary, or punitive damages;</li>
              </ol>
              <p><strong>whether or not the Company has been advised of the possibility of such damages</strong>, and regardless of the legal theory asserted.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.3 AI Output Disclaimer</h3>
              <p>The Platform uses AI technologies that may produce outputs that are <strong>inaccurate, incomplete, biased, or inappropriate</strong>. Specifically:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> <strong>AI-generated advice, recommendations, or information</strong> — including outputs from the MSME Navigator, document analysis tools, or voice agents — are provided for <strong>informational and assistance purposes only</strong> and do not constitute professional legal, financial, regulatory, or business advice;</li>
                <li><strong>(b)</strong> <strong>MSME scheme applications</strong> — The Company makes <strong>no guarantee</strong> regarding the outcome of any government scheme application submitted or facilitated through the Platform. Outcomes depend entirely on third-party government authorities and their internal criteria, which are beyond the Company's knowledge or control;</li>
                <li><strong>(c)</strong> <strong>Voice agent performance</strong> — Call success rates, speech recognition accuracy, natural language understanding quality, and overall conversational performance are <strong>not guaranteed</strong> and may vary significantly based on factors including third-party service performance, network quality, ambient conditions, speaker accent, and input data quality;</li>
                <li><strong>(d)</strong> You are solely responsible for <strong>reviewing, verifying, and making your own independent judgment</strong> regarding AI-generated outputs before relying on them for any business, legal, financial, or personal decision.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.4 Third-Party Service Losses</h3>
              <p>The Company is not liable for any loss or damage arising from:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Outages or failures of third-party services (Vapi, Twilio, Google Gemini, Supabase, or others);</li>
                <li><strong>(b)</strong> Changes to third-party terms or pricing that affect your use of the Platform;</li>
                <li><strong>(c)</strong> Third-party security incidents that affect data processed through their systems.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.5 Non-Excludable Liability</h3>
              <p><strong>Nothing in these Terms shall exclude or limit the Company's liability for:</strong></p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Death or personal injury caused by the Company's negligence;</li>
                <li><strong>(b)</strong> Fraud or fraudulent misrepresentation by the Company;</li>
                <li><strong>(c)</strong> Any liability that cannot be excluded or limited under applicable Indian law, including mandatory consumer protection provisions;</li>
                <li><strong>(d)</strong> Any willful misconduct or gross negligence of the Company.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.6 Startup Context Disclosure</h3>
              <p>You acknowledge that TrinetraEdu-AI is an <strong>early-stage proprietary concern</strong> that is transparent about its startup status. Certain service commitments made in these Terms reflect the Company's intended operational standards and best efforts, and you accept this context when agreeing to these Terms and using the Platform.</p>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 12: INDEMNIFICATION */}
              <h2 id="12-indemnification" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">12. INDEMNIFICATION</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">12.1 User's Indemnification Obligation</h3>
              <p>You agree to <strong>indemnify, defend, and hold harmless</strong> the Company, its founders, officers, employees, agents, advisors, and successors from and against any and all claims, demands, actions, suits, proceedings, liabilities, damages, awards, judgments, settlements, fines, penalties, regulatory sanctions, reasonable legal fees, court costs, and other litigation expenses arising out of or in connection with:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(i)</strong> Your use or misuse of the Platform or any of its features;</li>
                <li><strong>(ii)</strong> Your violation of any provision of these Terms, including the Acceptable Use Policy;</li>
                <li><strong>(iii)</strong> Your violation of any applicable law or regulation, including but not limited to TRAI regulations, the IT Act, the DPDP Act, or consumer protection laws;</li>
                <li><strong>(iv)</strong> Your violation of any third party's rights, including intellectual property rights, privacy rights, or data protection rights;</li>
                <li><strong>(v)</strong> User Content you upload, submit, or make available through the Platform;</li>
                <li><strong>(vi)</strong> Your deployment of voice agents in violation of applicable telecom law or without proper consents;</li>
                <li><strong>(vii)</strong> Any claim by your end-users, customers, or employees arising from your use of AI-generated outputs without appropriate human review.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">12.2 Indemnification Procedure</h3>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> The Company will promptly notify you of any indemnifiable claim;</li>
                <li><strong>(b)</strong> You will assume control of the defense of such claim, provided that the Company has the right to participate in the defense with counsel of its choice at your expense;</li>
                <li><strong>(c)</strong> You will not settle any claim that imposes obligations on, admits liability for, or disparages the Company without the Company's prior written consent.</li>
              </ol>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 13: DATA HANDLING */}
              <h2 id="13-data-handling" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">13. DATA HANDLING</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">13.1 Governing Privacy Policy</h3>
              <p>All personal data handling practices — including the categories of data collected, purposes of processing, legal bases for processing, data sharing practices, User rights, and the Company's obligations as a Data Fiduciary under the <strong>Digital Personal Data Protection Act, 2023</strong> — are governed in detail by the Company's <strong>Privacy Policy</strong>, which is incorporated into these Terms by reference.</p>
              <p><strong>In the event of any conflict between this Section 13 and the Privacy Policy on data handling matters, the Privacy Policy shall prevail.</strong></p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">13.2 Summary of Key Retention Periods</h3>
              <p>The following data retention periods apply to User data on the Platform. These are provided as a summary; the Privacy Policy contains full and binding retention terms:</p>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Data Category</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Retention Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Voice call recordings</td>
                      <td className="p-3">Deleted after <strong>10 days</strong> from date of recording</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Call transcripts</td>
                      <td className="p-3">Deleted after <strong>10 days</strong> from date of call</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Uploaded documents (raw files)</td>
                      <td className="p-3">Deleted after <strong>7 days</strong> from upload; maximum 3 most recent documents retained</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Extracted document data</td>
                      <td className="p-3">Deleted after <strong>30 days</strong> from extraction</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">MSME Navigator business profile</td>
                      <td className="p-3">Retained while account is active; deleted upon account closure</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Scheme match results</td>
                      <td className="p-3">Deleted after <strong>90 days</strong> from date of match</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Account profile data (active)</td>
                      <td className="p-3">Retained until account deletion</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Account profile data (inactive — 12+ months no login)</td>
                      <td className="p-3">Deleted <strong>30 days</strong> after written warning</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Consent records</td>
                      <td className="p-3">Retained <strong>permanently</strong> (legal compliance requirement under DPDP Act, 2023 — never deleted)</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Processing activity logs</td>
                      <td className="p-3">Retained <strong>permanently</strong> (Data Fiduciary accountability record under DPDP Act, 2023)</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Payment and transaction records</td>
                      <td className="p-3">Retained for <strong>8 years</strong> (Income Tax Act, 1961 compliance)</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Security and audit logs</td>
                      <td className="p-3">Retained for <strong>180 days</strong> (CERT-In Directions, 2022 — auto-deleted after retention period)</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Call analytics (anonymized)</td>
                      <td className="p-3">Identifying elements removed at <strong>90 days</strong>; anonymized aggregate data retained indefinitely</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Community forum posts and blog comments</td>
                      <td className="p-3">Retained until you delete them or your account is closed</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Support and grievance records</td>
                      <td className="p-3">Retained for duration of account + <strong>3 years</strong> from resolution</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[#A5A1B0] text-[13px] mt-2">This table is a summary. The Privacy Policy contains the complete, binding retention schedule with legal bases for each retention period. In case of any inconsistency, the Privacy Policy prevails.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">13.3 User Rights</h3>
              <p>Subject to applicable law and the Privacy Policy, you have the right to:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> <strong>Access</strong> your personal data held by the Company;</li>
                <li><strong>(b)</strong> <strong>Correct</strong> inaccurate or incomplete personal data;</li>
                <li><strong>(c)</strong> <strong>Request deletion</strong> of your personal data (subject to legal retention requirements);</li>
                <li><strong>(d)</strong> <strong>Withdraw consent</strong> previously granted for specific processing activities;</li>
                <li><strong>(e)</strong> <strong>Nominate</strong> a person to exercise your DPDP Act rights on your behalf.</li>
              </ol>
              <p>To exercise any of these rights, please contact <a href="mailto:grievance@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">grievance@trinetraedu-ai.com</a> or the Grievance Officer as detailed in Section 19.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">13.4 Data Localization</h3>
              <p>The Company processes and stores User data primarily on servers located in India through its Supabase infrastructure. Cross-border transfers, if any, are governed by the Privacy Policy and applicable DPDP Act provisions.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">13.5 No Sale of Personal Data</h3>
              <p>The Company does <strong>not and will not sell, rent, or commercially trade</strong> your personal data to any third party. Data sharing with third-party service providers is strictly limited to what is necessary to provide the Platform's services, as detailed in the Privacy Policy.</p>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 14: TERMINATION */}
              <h2 id="14-termination" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">14. TERMINATION</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">14.1 Termination by Either Party (Without Cause)</h3>
              <p>Either party may terminate the relationship governed by these Terms at any time by providing <strong>30 days' written notice</strong> to the other:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> <strong>You</strong> may terminate by canceling your subscription through the Platform settings and/or sending written notice to <a href="mailto:support@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">support@trinetraedu-ai.com</a>;</li>
                <li><strong>(b)</strong> <strong>The Company</strong> may terminate by sending written notice to your registered email address.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">14.2 Termination by the Company for Cause (Immediate)</h3>
              <p>The Company may <strong>terminate or suspend your account immediately and without prior notice</strong> in the event of:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Material violation of any provision of these Terms, including the Acceptable Use Policy;</li>
                <li><strong>(b)</strong> Conduct that poses a <strong>security risk</strong> to the Platform, other Users, or third parties;</li>
                <li><strong>(c)</strong> Actual or suspected <strong>fraud, identity theft, or criminal activity</strong> connected to your account;</li>
                <li><strong>(d)</strong> <strong>Non-payment</strong> of fees owed, following the grace period described in Section 4.5;</li>
                <li><strong>(e)</strong> Violation of applicable <strong>TRAI regulations</strong> through voice agent usage;</li>
                <li><strong>(f)</strong> A regulatory authority or court order requiring suspension or termination.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">14.3 Suspension Prior to Termination</h3>
              <p>Where circumstances permit, the Company may <strong>suspend</strong> your account (rather than immediately terminate) to investigate an alleged violation and provide you an opportunity to respond within a reasonable timeframe before a termination decision is made.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">14.4 Effect of Termination</h3>
              <p>Upon termination of your account (whether by you or by the Company):</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> <strong>Access</strong> to the Platform ceases immediately (termination for cause) or at the end of the 30-day notice period (termination without cause);</li>
                <li><strong>(b)</strong> <strong>Active subscriptions</strong> will not be renewed following termination. No prorated refund will be issued for the remainder of the billing cycle in cases of termination for cause;</li>
                <li><strong>(c)</strong> <strong>User data</strong> will be deleted or anonymized within <strong>30 days of termination</strong>, subject to the retention obligations described in Section 13.2;</li>
                <li><strong>(d)</strong> <strong>Surviving Clauses</strong> — The following Sections survive termination: Sections 7, 10, 11, 12, 13, 14.4, 15, and 18.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">14.5 Data Export Before Termination</h3>
              <p><strong>Users are strongly encouraged to export all data they wish to retain before initiating or accepting termination of their account.</strong> The Company will use reasonable efforts to provide a data export facility. After the 30-day post-termination retention period, the Company has no obligation to retrieve, restore, or provide copies of deleted data.</p>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 15: DISPUTE RESOLUTION */}
              <h2 id="15-dispute-resolution" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">15. DISPUTE RESOLUTION</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">15.1 Governing Law</h3>
              <p>These Terms, and any dispute arising out of or related to these Terms or your use of the Platform, shall be <strong>governed by and construed exclusively in accordance with the laws of India</strong>, without regard to conflict of laws principles.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">15.2 Informal Resolution (Mandatory First Step)</h3>
              <p>Prior to initiating any formal mediation, arbitration, or litigation, the parties agree to first attempt to resolve the dispute <strong>informally</strong>:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> The aggrieved party shall send a written notice describing the dispute, the specific relief sought, and relevant facts;</li>
                <li><strong>(b)</strong> The parties shall negotiate <strong>in good faith for a period of 15 days</strong> from the date of receipt of such notice;</li>
                <li><strong>(c)</strong> Notices under this Section shall be sent to: <strong><a href="mailto:legal@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">legal@trinetraedu-ai.com</a></strong> (for notices to the Company) or to the User's registered email address (for notices to the User).</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">15.3 Mandatory Mediation</h3>
              <p>If informal resolution fails, the parties agree to submit the dispute to <strong>formal mediation</strong> before any arbitration or litigation:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> Mediation shall be conducted for a period of <strong>30 days</strong> from the date a party formally invokes mediation in writing;</li>
                <li><strong>(b)</strong> A mediator shall be agreed upon by the parties within <strong>7 days</strong>. If no agreement is reached, either party may request appointment through a recognized mediation institution in Kanpur;</li>
                <li><strong>(c)</strong> Mediation shall be conducted in <strong>Kanpur</strong>, in English;</li>
                <li><strong>(d)</strong> Costs of mediation shall be shared equally between the parties unless otherwise agreed;</li>
                <li><strong>(e)</strong> Mediation proceedings are <strong>confidential</strong> and without prejudice to either party's legal position.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">15.4 Binding Arbitration</h3>
              <p>If the dispute remains unresolved after mediation:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> The dispute shall be <strong>finally and bindingly resolved by arbitration</strong> under the <strong>Arbitration and Conciliation Act, 1996</strong> (as amended);</li>
                <li><strong>(b)</strong> The arbitration shall be conducted by a <strong>sole arbitrator</strong> appointed by mutual agreement. If the parties cannot agree within <strong>15 days</strong>, the arbitrator shall be appointed in accordance with the rules of the <strong>Indian Council of Arbitration (ICA)</strong>;</li>
                <li><strong>(c)</strong> The <strong>seat and venue of arbitration</strong> shall be <strong>Kanpur, Uttar Pradesh, India</strong>;</li>
                <li><strong>(d)</strong> The language of arbitration shall be <strong>English</strong>;</li>
                <li><strong>(e)</strong> The arbitration award shall be <strong>final, binding, and enforceable</strong> in any court of competent jurisdiction;</li>
                <li><strong>(f)</strong> Each party shall bear its own legal costs in arbitration, unless the arbitrator awards costs otherwise.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">15.5 Court Jurisdiction</h3>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> For the purpose of seeking <strong>interim or emergency relief</strong> or for enforcement of an arbitral award, the parties submit to the <strong>exclusive jurisdiction of the courts located in Kanpur, Uttar Pradesh, India</strong>;</li>
                <li><strong>(b)</strong> For disputes not subject to arbitration, the parties agree to the exclusive jurisdiction of the courts in Kanpur.</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">15.6 Consumer Protection Carve-Out</h3>
              <p>Nothing in this Section prevents you from filing a complaint before:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>(a)</strong> The <strong>Consumer Disputes Redressal Commission</strong> under the Consumer Protection Act, 2019;</li>
                <li><strong>(b)</strong> The <strong>Data Protection Board of India</strong> for matters arising under the DPDP Act, 2023;</li>
                <li><strong>(c)</strong> Any other statutory tribunal or regulatory authority with mandatory jurisdiction over your dispute.</li>
              </ol>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 16: CHANGES TO TERMS */}
              <h2 id="16-changes-to-terms" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">16. CHANGES TO TERMS</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">16.1 Right to Modify</h3>
              <p>The Company reserves the right to <strong>amend, update, or replace</strong> these Terms at any time, including to reflect changes in the Platform's features, pricing, services, applicable law, third-party integrations, organizational structure, or security requirements.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">16.2 Standard Notice Period</h3>
              <p>For <strong>non-material changes</strong>, the Company will provide at least <strong>30 days' advance notice by email</strong> to your registered email address before the revised Terms take effect, update the "Last Updated" date, and make the revised Terms available on the Platform.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">16.3 Material Changes — Explicit Re-Acceptance Required</h3>
              <p>A change is considered <strong>"material"</strong> if it significantly reduces your rights, increases your obligations, changes the dispute resolution mechanism, alters pricing for existing subscriptions, changes how User data is processed, or reflects a change in the Company's legal entity. For material changes, the Company will require <strong>explicit re-acceptance</strong> via an in-platform consent prompt and allow you to reject the revised Terms and terminate your account within the notice period with a prorated refund.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">16.4 Company Registration Change Notice</h3>
              <p>When the Company completes formal registration under the <strong>Limited Liability Partnership Act, 2008</strong>, a notification will be sent to all registered Users describing the change in entity status, updated registered address, and any consequential changes to these Terms. This will be treated as a material change requiring re-acceptance.</p>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 17: FUTURE FEATURE PROVISIONS */}
              <h2 id="17-future-feature-provisions" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">17. FUTURE FEATURE PROVISIONS</h2>
              <p>The following provisions apply <strong>prospectively</strong> and will govern specified features <strong>upon their launch</strong> on the Platform.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">17.1 AI Marketplace</h3>
              <p>The Platform may operate a Marketplace enabling users to list, buy, and sell AI agent templates, workflow designs, and related digital products. The Company will charge sellers a commission at a rate published at launch. Sellers are solely responsible for the legality, quality, and originality of their listings. The Company's role in disputes will be limited to that of a facilitator.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">17.2 Partner and Referral Program</h3>
              <p>The Platform may offer a Partner or Referral Program. Commission rates, eligibility criteria, and payment cycles will be set out in a separate Partner/Referral Program Agreement. The Company reserves the right to modify or discontinue the program, subject to honoring commissions already earned and accrued.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">17.3 Voice Agents — Detailed Regulatory Provisions</h3>
              <p><strong>(a) Consent for Call Recording:</strong> Users must obtain explicit, informed, and documented consent from all parties before recording calls, implement clear disclosure at the start of recorded calls, and maintain records of such consents.</p>
              <p><strong>(b) TRAI Registration:</strong> Users must independently ensure Commercial Communication Sender Registration, DND compliance, time-of-day restrictions, and all applicable telecom licensing.</p>
              <p><strong>(c) AI Voice Disclosure:</strong> Users must ensure call recipients are meaningfully informed that they are interacting with an AI system.</p>
              <p><strong>(d) Liability:</strong> The Company accepts no liability for penalties arising from Users' non-compliance with voice agent regulations.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">17.4 Enterprise and Team Plans</h3>
              <p>Upon launch of enterprise or team subscription plans, multi-user organizations will be subject to additional terms governing User management, data segregation, and administrator responsibilities.</p>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 18: MISCELLANEOUS */}
              <h2 id="18-miscellaneous" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">18. MISCELLANEOUS</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">18.1 Severability</h3>
              <p>If any provision of these Terms is found to be invalid, illegal, or unenforceable, that provision shall be modified to the minimum extent necessary to make it valid and enforceable, and the remaining provisions shall continue in full force and effect.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">18.2 No Waiver</h3>
              <p>The Company's failure to enforce any right or provision shall not constitute a waiver. All waivers must be in writing and signed by an authorized representative of the Company.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">18.3 Entire Agreement</h3>
              <p>These Terms, together with the Privacy Policy, Cookie Policy, and Refund and Cancellation Policy, constitute the <strong>entire agreement</strong> between you and the Company regarding your use of the Platform.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">18.4 Assignment</h3>
              <p>You may not assign or transfer your rights under these Terms without the Company's prior written consent. The Company may freely assign these Terms in connection with a merger, acquisition, or sale of assets.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">18.5 Force Majeure</h3>
              <p>Neither party shall be liable for failure or delay in performance caused by circumstances beyond its reasonable control, including natural disasters, war, terrorism, internet infrastructure failures, or government action. If a force majeure event continues for more than <strong>60 consecutive days</strong>, either party may terminate the affected services with immediate effect.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">18.6 Language</h3>
              <p>These Terms are drafted in <strong>English</strong>, which shall be the controlling language. Any translation is for convenience only.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">18.7 Electronic Communications</h3>
              <p>By using the Platform, you consent to receiving communications electronically. All agreements, notices, and disclosures provided electronically satisfy any legal requirement that such communications be in writing.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">18.8 Relationship of Parties</h3>
              <p>Nothing in these Terms creates a partnership, joint venture, employment relationship, or agency relationship between you and the Company. You are an <strong>independent party</strong> using the Company's platform services.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">18.9 Export Controls</h3>
              <p>You represent that you are not located in a country subject to an Indian government embargo or designated as a "terrorist-supporting" country, and are not on any Indian or international restricted parties list.</p>

              <hr className="border-[#1E0A35] my-6" />

              {/* SECTION 19: CONTACT US */}
              <h2 id="19-contact-us" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">19. CONTACT US</h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">General Support</h3>
              <p><strong>Email:</strong> <a href="mailto:support@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">support@trinetraedu-ai.com</a></p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">Billing and Subscription Queries</h3>
              <p><strong>Email:</strong> <a href="mailto:billing@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">billing@trinetraedu-ai.com</a></p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">Privacy and Data Protection Queries</h3>
              <p><strong>Email:</strong> <a href="mailto:privacy@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">privacy@trinetraedu-ai.com</a></p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">Grievance Officer</h3>
              <p>In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li><strong>Name:</strong> The Grievance Officer</li>
                <li><strong>Title:</strong> Grievance Officer — TrinetraEdu-AI</li>
                <li><strong>Email:</strong> <a href="mailto:grievance@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">grievance@trinetraedu-ai.com</a></li>
                <li><strong>Response Commitment:</strong> The Grievance Officer will acknowledge complaints within <strong>72 hours</strong> and resolve them within <strong>30 days</strong>.</li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">Registered Address</h3>
              <p><strong>TrinetraEdu-AI</strong> (a proprietary concern of the founders, pending formal registration under the Limited Liability Partnership Act, 2008)</p>
              <p><em>Currently operating remotely. A registered address will be established upon company incorporation.</em></p>
              <p><strong>Operational Jurisdiction:</strong> Kanpur, Uttar Pradesh, India</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">Legal Notices</h3>
              <p>Formal legal notices shall be sent to: <a href="mailto:legal@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">legal@trinetraedu-ai.com</a></p>

              <hr className="border-[#1E0A35] my-6" />

              <p className="text-[#A5A1B0] text-[13px] text-center">This document was last updated on 14-07-2026. Prior versions are archived and available upon request.</p>

              <p className="text-[#A5A1B0] text-[13px] text-center">© 2026 TrinetraEdu-AI. All Rights Reserved.</p>

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}