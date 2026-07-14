import { Layout } from "@/components/layout/Layout";

export const metadata = {
  title: "Privacy Policy | TrinetraEdu-AI",
  description: "Privacy Policy for TrinetraEdu-AI in compliance with the DPDP Act 2023 and CERT-In guidelines.",
};

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="font-sans font-normal text-[14px] text-[#9A91B5] mb-[48px] text-center font-mono">
            TrinetraEdu-AI (trinetraedu-ai.com) • Effective Date: 15-07-2026 • Last Updated: 14-07-2026
          </p>

          <div className="w-full bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[24px] md:p-[48px] shadow-[0_0_40px_rgba(139,92,246,0.05)]">
            <div className="prose prose-invert max-w-none text-[#B8B0D1] font-sans font-normal text-[15px] leading-[1.8] space-y-6">

              <div className="border-l-2 border-[#A78BFA] pl-[16px] py-[4px] bg-[rgba(139,92,246,0.02)] rounded-r-md">
                <p className="font-medium text-[#FAF7FF] italic text-[14px] leading-relaxed">
                  <strong>A note before you read this:</strong> We have written this policy to be read by an actual person, not just filed away. If you have a question that this document does not answer, our Grievance Officer contact is in Section 16 and we will respond within 72 hours.
                </p>
              </div>

              <hr className="border-[#1E0A35] my-6" />

              <h2 className="text-[#FAF7FF] font-semibold text-[22px] tracking-tight mt-[32px] mb-[16px] border-b border-[#1E0A35] pb-2">
                Table of Contents
              </h2>
              <nav className="space-y-2 text-[14px] text-[#A78BFA] font-medium">
                <ol className="list-decimal list-inside space-y-1">
                  <li><a href="#1-introduction-and-scope" className="hover:underline">Introduction and Scope</a></li>
                  <li><a href="#2-definitions" className="hover:underline">Definitions</a></li>
                  <li><a href="#3-what-data-we-collect" className="hover:underline">What Data We Collect</a></li>
                  <li><a href="#4-how-we-use-your-data" className="hover:underline">How We Use Your Data</a></li>
                  <li><a href="#5-legal-basis-for-processing" className="hover:underline">Legal Basis for Processing</a></li>
                  <li><a href="#6-data-sharing-and-third-party-processors" className="hover:underline">Data Sharing and Third-Party Processors</a></li>
                  <li><a href="#7-data-retention-periods" className="hover:underline">Data Retention Periods</a></li>
                  <li><a href="#8-data-storage-location-and-international-transfers" className="hover:underline">Data Storage Location and International Transfers</a></li>
                  <li><a href="#9-security-measures" className="hover:underline">Security Measures</a></li>
                  <li><a href="#10-breach-notification-policy" className="hover:underline">Breach Notification Policy</a></li>
                  <li><a href="#11-your-rights-under-the-dpdp-act-2023" className="hover:underline">Your Rights Under the DPDP Act 2023</a></li>
                  <li><a href="#12-how-to-exercise-your-rights" className="hover:underline">How to Exercise Your Rights</a></li>
                  <li><a href="#13-cookie-policy" className="hover:underline">Cookie Policy</a></li>
                  <li><a href="#14-childrens-privacy" className="hover:underline">Children&apos;s Privacy</a></li>
                  <li><a href="#15-changes-to-this-policy" className="hover:underline">Changes to This Policy</a></li>
                  <li><a href="#16-grievance-officer-and-contact" className="hover:underline">Grievance Officer and Contact</a></li>
                  <li><a href="#17-effective-date-and-jurisdiction" className="hover:underline">Effective Date and Jurisdiction</a></li>
                </ol>
              </nav>

              <hr className="border-[#1E0A35] my-6" />

              {/* Section 1: Introduction and Scope */}
              <h2 id="1-introduction-and-scope" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                1. Introduction and Scope
              </h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">1.1 — Who We Are</h3>
              <p>
                TrinetraEdu-AI (&ldquo;Platform,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is a zero-code artificial intelligence platform for Indian MSMEs, startups, and businesses. The Platform is currently operated as a proprietary concern by its founding team and is in the process of registering as a Limited Liability Partnership (LLP) under the Limited Liability Partnership Act, 2008. This Policy will be updated with the registered entity&apos;s legal name, registration number, and address upon completion of incorporation. Until that time, references to &ldquo;TrinetraEdu-AI&rdquo; refer to the entity operating the Platform as a proprietary concern.
              </p>
              <p>
                The Platform is accessible at <strong>trinetraedu-ai.com</strong> and all associated subdomains, including but not limited to <strong>msme.trinetraedu-ai.com</strong>, and any additional tools or subdomains launched under the TrinetraEdu-AI brand in the future (collectively, the &ldquo;Platform&rdquo;).
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">1.2 — What This Policy Covers</h3>
              <p>This Privacy Policy (&ldquo;Policy&rdquo;) describes:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>What personal data we collect from you and why</li>
                <li>How we process that data and on what legal basis</li>
                <li>Who we share it with and under what conditions</li>
                <li>Exactly how long we keep it before deleting it</li>
                <li>The security measures we have implemented to protect it</li>
                <li>Your rights under Indian data protection law and how to exercise them</li>
                <li>How to contact us if something goes wrong</li>
              </ul>
              <p>
                <strong>This Policy applies uniformly across all tools, subdomains, features, and services offered under the TrinetraEdu-AI Platform</strong>, regardless of whether you access them through the main domain or any subdomain. If a specific tool operates under terms that differ materially from this Policy, those differences will be disclosed to you at the point of access to that tool.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">1.3 — Applicable Law</h3>
              <p>This Policy is designed to comply with:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li><strong>Digital Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;)</strong> — primary governing statute for personal data processing in India</li>
                <li><strong>Information Technology Act, 2000 (&ldquo;IT Act&rdquo;)</strong> — including Section 70B (CERT-In reporting obligations) and Section 43A (reasonable security practices)</li>
                <li><strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 (&ldquo;SPDI Rules&rdquo;)</strong> — governing sensitive personal data</li>
                <li><strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong> — applicable to our community forum and blog</li>
                <li><strong>CERT-In Directions dated April 28, 2022</strong> — governing cybersecurity incident reporting timelines</li>
              </ul>
              <p>
                As the Platform expands globally, this Policy will be updated to address the requirements of applicable international frameworks, including the EU General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), the Singapore Personal Data Protection Act (PDPA), and the UAE Personal Data Protection Law (PDPL), for users in those jurisdictions. When such expansion occurs, jurisdiction-specific addenda will be published alongside this Policy.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">1.4 — Your Agreement</h3>
              <p>
                By registering for an account, accessing any feature of the Platform, or clicking &ldquo;I Agree&rdquo; on any consent interface, you acknowledge that you have read and understood this Policy. If you do not agree with any part of this Policy, you should not access or use the Platform.
              </p>
              <p>
                If you are accessing the Platform on behalf of a business entity (which is our primary use case), you represent that you have authority to bind that entity to this Policy and that the entity accepts this Policy on behalf of all individuals whose data you may submit to the Platform through your account.
              </p>

              {/* Section 2: Definitions */}
              <h2 id="2-definitions" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                2. Definitions
              </h2>
              <p>
                The following definitions apply throughout this Policy. Where terms appear in the DPDP Act 2023, we use them in the same sense as defined in that Act.
              </p>
              <div className="space-y-4">
                <p><strong>&ldquo;Data Principal&rdquo;</strong> means the natural person to whom the personal data relates. In this Policy, we also refer to the Data Principal as &ldquo;you,&rdquo; &ldquo;your,&rdquo; or &ldquo;User.&rdquo;</p>
                <p><strong>&ldquo;Data Fiduciary&rdquo;</strong> means the entity that determines the purpose and means of processing personal data. TrinetraEdu-AI is the Data Fiduciary in respect of all personal data collected through the Platform, as defined under Section 2(i) of the DPDP Act.</p>
                <p><strong>&ldquo;Data Processor&rdquo;</strong> means any entity that processes personal data on behalf of the Data Fiduciary, under a contract and solely on the instructions of the Data Fiduciary, as defined under Section 2(k) of the DPDP Act. Our third-party service providers listed in Section 6 are Data Processors.</p>
                <p><strong>&ldquo;Personal Data&rdquo;</strong> means any data about an individual who is identifiable by or in relation to such data, as defined under Section 2(t) of the DPDP Act.</p>
                <p><strong>&ldquo;Sensitive Personal Data or Information&rdquo; or &ldquo;SPDI&rdquo;</strong> has the meaning assigned to it under Rule 3 of the SPDI Rules, 2011, and includes financial information (bank account details, credit/debit card details, payment instrument details), passwords, biometric information, and health information. Where we collect SPDI, we apply heightened security controls as described in Section 9.</p>
                <p><strong>&ldquo;Processing&rdquo;</strong> means any operation or set of operations performed on personal data, including collection, recording, organisation, structuring, storage, adaptation, retrieval, use, disclosure, transmission, or erasure.</p>
                <p><strong>&ldquo;Consent&rdquo;</strong> means the free, specific, informed, unconditional, and unambiguous indication of agreement by a Data Principal to the processing of their personal data for a specified purpose, as defined under Section 6 of the DPDP Act. Consent on our Platform is recorded in the manner described in Section 9.4.</p>
                <p><strong>&ldquo;Consent Manager&rdquo;</strong> has the meaning assigned under Section 2(g) of the DPDP Act, referring to a registered entity through which a Data Principal may give, manage, review, and withdraw consent.</p>
                <p><strong>&ldquo;Breach&rdquo;</strong> or <strong>&ldquo;Personal Data Breach&rdquo;</strong> means any unauthorised processing or accidental disclosure, acquisition, sharing, use, alteration, destruction, or loss of access to personal data that compromises the confidentiality, integrity, or availability of such data.</p>
                <p><strong>&ldquo;Nominated Person&rdquo;</strong> means an individual nominated by a Data Principal under Section 14 of the DPDP Act to exercise the rights of the Data Principal in the event of the Data Principal&apos;s death or incapacity.</p>
                <p><strong>&ldquo;Platform&rdquo;</strong> means the TrinetraEdu-AI website, all subdomain tools, mobile applications (if any), APIs, and any other services offered under the TrinetraEdu-AI brand.</p>
                <p><strong>&ldquo;CERT-In&rdquo;</strong> means the Indian Computer Emergency Response Team, constituted under Section 70B of the IT Act.</p>
                <p><strong>&ldquo;Data Protection Board&rdquo;</strong> means the Data Protection Board of India, to be constituted under Section 18 of the DPDP Act.</p>
              </div>

              {/* Section 3: What Data We Collect */}
              <h2 id="3-what-data-we-collect" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                3. What Data We Collect
              </h2>
              <p>
                We collect only the personal data that is necessary to provide the specific service you are using. We do not collect data speculatively or in excess of what is required for the stated purpose. Below is a complete account of every category of personal data we collect, organized by the service or context in which it is collected.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.1 — Account and Registration Data</h3>
              <p>When you create an account on the Platform, we collect:</p>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Data Item</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">How It Is Collected</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Full name</td>
                      <td className="p-3 border-r border-[#1E0A35]">Registration form</td>
                      <td className="p-3">Used for account identification and communication</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Email address</td>
                      <td className="p-3 border-r border-[#1E0A35]">Registration form</td>
                      <td className="p-3">Used for login, communication, and service notifications</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Mobile phone number</td>
                      <td className="p-3 border-r border-[#1E0A35]">Registration form</td>
                      <td className="p-3">Used for account security and service-related communication</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Company name</td>
                      <td className="p-3 border-r border-[#1E0A35]">Registration form</td>
                      <td className="p-3">Used to personalize your experience and for MSME Navigator services</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Password</td>
                      <td className="p-3 border-r border-[#1E0A35]">Registration form</td>
                      <td className="p-3"><strong>Stored exclusively in hashed form using bcrypt. We cannot read, recover, or share your password.</strong> We have no access to your plaintext password at any time.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[13px] text-[#9A91B5] italic">
                We do not collect your date of birth, gender, home address, or national identity number during registration, unless you voluntarily provide such information through a support communication or a specific service feature that requires it.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.2 — Voice Agent Data</h3>
              <p>When you use the Platform&apos;s voice agent tools, we collect:</p>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Data Item</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Retention</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Auto-Deleted?</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Call recordings (audio files)</td>
                      <td className="p-3 border-r border-[#1E0A35]">10 days from date of recording</td>
                      <td className="p-3 text-emerald-400 font-semibold">Yes — permanently deleted</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Call transcripts (text)</td>
                      <td className="p-3 border-r border-[#1E0A35]">10 days from date of call</td>
                      <td className="p-3 text-emerald-400 font-semibold">Yes — permanently deleted</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Call analytics (duration, sentiment scores, outcome tags)</td>
                      <td className="p-3 border-r border-[#1E0A35]">90 days, then anonymized</td>
                      <td className="p-3 text-emerald-400 font-semibold">Yes — identifying elements removed after 90 days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                <strong>Important:</strong> Call recordings and transcripts are retained for 10 days to allow you to review, download, or use them within your account. After 10 days, they are permanently and irretrievably deleted from our systems and from the systems of our voice infrastructure processors. This deletion is automated and irreversible.
              </p>
              <p>
                Voice recordings may capture the voices of third parties who participate in calls made using your voice agent. If you deploy a voice agent that interacts with your customers, you are responsible for ensuring that those third parties are informed that their voice may be recorded and for obtaining any consents required under applicable law before initiating or enabling such calls. The Platform provides you with the ability to include consent disclosures at the start of calls; it is your responsibility to activate and configure these features appropriately.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.3 — Document Structuring Tool Data</h3>
              <p>When you use the Document Structuring Tool:</p>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Data Item</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Retention</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Auto-Deleted?</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Uploaded documents (raw files)</td>
                      <td className="p-3 border-r border-[#1E0A35]">7 days from upload date; maximum of 3 most recent documents retained at any time</td>
                      <td className="p-3 text-emerald-400 font-semibold">Yes — older documents and all documents after 7 days are permanently deleted</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Extracted data (structured output from document processing)</td>
                      <td className="p-3 border-r border-[#1E0A35]">30 days from the date of extraction</td>
                      <td className="p-3 text-emerald-400 font-semibold">Yes — permanently deleted after 30 days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Documents you upload may contain personal data about third parties (your customers, employees, or business partners). You are responsible for ensuring you have the authority or consent to upload such documents to the Platform. We process the content of your documents solely to provide the document structuring service you have requested. We do not read, review, or retain the content of your documents beyond what is technically necessary for processing and the retention periods stated above.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.4 — MSME Navigator Data</h3>
              <p>When you use the MSME Scheme Navigator:</p>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Data Item</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Retention</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Auto-Deleted?</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Business profile data (sector, annual turnover, company type, registration status, and similar MSME profile attributes)</td>
                      <td className="p-3 border-r border-[#1E0A35]">Retained while your account is active; deleted when you delete your account or your account is closed for inactivity</td>
                      <td className="p-3">As applicable</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Scheme match results (which schemes your business profile matched, and the basis for the match)</td>
                      <td className="p-3 border-r border-[#1E0A35]">90 days from the date of the match</td>
                      <td className="p-3 text-emerald-400 font-semibold">Yes — permanently deleted after 90 days</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Consent records (your record of consent to process business profile data for scheme matching)</td>
                      <td className="p-3 border-r border-[#1E0A35]">Permanently retained</td>
                      <td className="p-3 text-rose-400 font-semibold">Never deleted — this is a legal compliance requirement under the DPDP Act</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                <strong>Why we retain consent records permanently:</strong> Section 6 of the DPDP Act and the compliance requirements applicable to Data Fiduciaries require us to be able to demonstrate that we had valid consent for each processing activity. Consent records are not personal data in the operational sense — they are legal compliance records that establish the fact, timing, and scope of your consent. We retain these records in our immutable audit log. Retention of consent records does not mean your business profile data or scheme results are retained — those are deleted on the schedule above.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.5 — Payment Data</h3>
              <p>
                When you upgrade to a paid tier, your payment is processed by a third-party, PCI-DSS compliant payment gateway:
              </p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li><strong>Indian users:</strong> Razorpay</li>
                <li><strong>International users (upon launch):</strong> Stripe</li>
              </ul>
              <p>
                <strong>We do not receive, store, or have access to your raw card number, CVV, UPI PIN, bank account number, or any other raw payment credential.</strong> These are entered directly into and processed by Razorpay or Stripe&apos;s secure payment interface. We receive a transaction confirmation and a payment reference ID from the gateway, which we retain for billing record purposes.
              </p>
              <p>
                Payment records (transaction references, amounts, dates, and subscription status) are retained for <strong>8 years</strong> from the date of the transaction, as required under the Income Tax Act, 1961 and applicable Indian financial record-keeping obligations.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.6 — Cookie Data</h3>
              <p>
                We use only essential authentication cookies. We do not use advertising cookies, third-party tracking cookies, or traditional analytics cookies that track individual behavior. The full details of our cookie practices are in Section 13.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.7 — Community Forum and Blog Data</h3>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Data Item</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Retention</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Post content and comments</td>
                      <td className="p-3 border-r border-[#1E0A35]">Until you delete them or your account is closed</td>
                      <td className="p-3">Visible to other Platform users</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Display name associated with posts</td>
                      <td className="p-3 border-r border-[#1E0A35]">As above</td>
                      <td className="p-3">You may use a display name different from your registered name</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Timestamp of each post</td>
                      <td className="p-3 border-r border-[#1E0A35]">As above</td>
                      <td className="p-3">Shown alongside your posts</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                We do not collect any personal data beyond what you voluntarily submit in a post or comment. Be aware that information you share publicly in the forum is visible to other users and should not include sensitive personal or financial information.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.8 — Technical and Security Logs</h3>
              <p>For security, fraud prevention, and compliance purposes, we maintain:</p>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Log Type</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Retention</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Security event logs (failed login attempts, suspicious activity flags, consent action logs including IP address and user-agent at time of consent)</td>
                      <td className="p-3 border-r border-[#1E0A35]">180 days</td>
                      <td className="p-3">Fraud detection, breach investigation, legal compliance</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Processing activity logs (records of which processing activities were performed on which data, without the data itself)</td>
                      <td className="p-3 border-r border-[#1E0A35]">Permanent</td>
                      <td className="p-3">DPDP Act compliance record-keeping</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Security logs are not used for any marketing, profiling, or commercial purpose. They are accessed only by the founding team for security and compliance purposes.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">3.9 — Data We Do Not Collect</h3>
              <p>For transparency, we explicitly confirm that we do not collect the following:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Aadhaar numbers (unless voluntarily submitted in a document you upload, in which case we process but do not store them beyond the document retention period)</li>
                <li>Biometric data</li>
                <li>Religion, caste, political opinion, or trade union membership</li>
                <li>Health or medical data</li>
                <li>GPS location data</li>
                <li>Data from social media accounts or third-party login providers (we do not offer social login)</li>
                <li>Any data from users under 18 (see Section 14)</li>
              </ul>

              {/* Section 4: How We Use Your Data */}
              <h2 id="4-how-we-use-your-data" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                4. How We Use Your Data
              </h2>
              <p>
                We operate under a strict purpose limitation principle: <strong>we process your personal data only for the specific purpose for which it was collected.</strong> We do not repurpose your data for secondary uses without obtaining fresh consent from you.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">4.1 — Purposes of Processing</h3>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Data Category</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Specific Purposes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Account data (name, email, phone, company name)</td>
                      <td className="p-3">Creating and maintaining your account; verifying your identity when you contact support; sending you service notifications (e.g., retention warnings, policy updates, feature changes); enabling login and authentication</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Voice agent data (recordings, transcripts, analytics)</td>
                      <td className="p-3">Delivering the voice agent service you have configured; generating transcripts for your review within the retention window; producing call outcome analytics for your account dashboard; investigating service errors or bugs you report</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Document data (uploaded files, extracted data)</td>
                      <td className="p-3">Performing the AI-based document structuring or extraction you have requested; displaying results in your account dashboard; retaining outputs for your access within the retention window</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">MSME Navigator data (business profile, match results)</td>
                      <td className="p-3">Matching your business profile against available government schemes; displaying relevant scheme information and eligibility indicators; improving the accuracy of matching results for your profile over time</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Payment data (transaction references)</td>
                      <td className="p-3">Confirming payment and activating your subscription; maintaining billing records as required by Indian financial law; issuing receipts and invoices</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Cookie data</td>
                      <td className="p-3">Maintaining your authenticated session across the Platform and its subdomains; preventing repeated login prompts across Platform tools</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Community data (forum posts, blog comments)</td>
                      <td className="p-3">Displaying your contributions in the community forum and blog for other users to read and engage with</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Security logs</td>
                      <td className="p-3">Detecting and preventing unauthorized access, fraud, and abuse; investigating security incidents; demonstrating compliance with CERT-In and DPDP Act requirements</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">4.2 — What We Explicitly Do Not Do With Your Data</h3>
              <p>We make the following commitments clearly and without qualification:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-2">
                <li><strong>We do not sell your personal data.</strong> We have never sold personal data, and we will never sell personal data to any third party, under any circumstances.</li>
                <li><strong>We do not use your data to train AI models.</strong> Your voice recordings, documents, business profiles, call transcripts, and any other content you submit are not used to train, fine-tune, or improve any artificial intelligence or machine learning model — whether operated by us or by any third-party processor. When we send your data to AI processing providers (listed in Section 6), it is transmitted solely to obtain a single response and is not retained by those providers for model training under our data processing agreements with them. You should review those providers&apos; own terms if you have concerns about their independent data practices.</li>
                <li><strong>We do not perform automated decision-making with legal or significant effects.</strong> The MSME Navigator uses AI to suggest matching schemes, but these are suggestions for your review — no automated system makes any final determination about your eligibility for any government scheme or benefit. All outputs require your assessment and independent verification.</li>
                <li><strong>We do not profile you for marketing or advertising purposes.</strong></li>
                <li><strong>We do not share your data with any party not listed in Section 6</strong>, except where we are required to do so by law.</li>
                <li><strong>We distinguish between processing and training.</strong> When you use our AI tools, your data is transmitted to AI processors solely to generate responses for you in real-time (&ldquo;inference processing&rdquo;). This is not model training. We do not use your data to fine-tune, retrain, or permanently modify any AI model&apos;s behavior for other users. However, we do store certain outputs and interaction history within your account to personalize your experience — for example, remembering your learning progress, weak areas, or preferences. This data is stored in your account profile and is never used to train models that serve other users.</li>
              </ol>

              {/* Section 5: Legal Basis for Processing */}
              <h2 id="5-legal-basis-for-processing" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                5. Legal Basis for Processing
              </h2>
              <p>Every processing activity we conduct must have a valid legal basis. Under the DPDP Act 2023 and the SPDI Rules, our legal bases are as follows:</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">5.1 — Consent (Section 6, DPDP Act 2023)</h3>
              <p>
                The primary legal basis for most of our processing activities is your free, specific, informed, unconditional, and unambiguous consent, obtained before we begin processing. We obtain consent:
              </p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>At registration, for processing your account data</li>
                <li>At the point of first use of each tool, for processing tool-specific data (e.g., voice agent data, document data, MSME Navigator data)</li>
                <li>Through a clear consent interface that describes, in plain language, exactly what data will be processed and why, before asking for your agreement</li>
              </ul>
              <p>
                Each consent record is cryptographically signed using SHA-256 and stored in an immutable log that records your consent text, the timestamp of consent, your IP address, and the user-agent string of your browser. This record is retained permanently and cannot be altered after the fact.
              </p>
              <p>
                You may withdraw any consent at any time as described in Section 12. Withdrawal of consent does not affect the lawfulness of processing that occurred before the withdrawal.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">5.2 — Performance of a Contract (Section 7, DPDP Act 2023 / General Contract Law)</h3>
              <p>
                Some processing is necessary to perform the contract between you and TrinetraEdu-AI — specifically, to provide the services you have subscribed to. This includes maintaining your account, processing payments, and delivering service notifications. You cannot opt out of this processing while remaining a user of the Platform; however, you may close your account at any time.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">5.3 — Legal Obligation</h3>
              <p>We process certain data because we are required to do so by law. This includes:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Retaining consent records permanently (as a compliance record under the DPDP Act)</li>
                <li>Retaining payment records for 8 years (as required under Indian financial and tax law)</li>
                <li>Retaining security logs for 180 days (as required under CERT-In Directions, 2022)</li>
                <li>Retaining processing activity logs permanently (as a Data Fiduciary accountability record under the DPDP Act)</li>
                <li>Providing personal data to government authorities, courts, or law enforcement where required by a valid legal order</li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">5.4 — Legitimate Uses (Section 7, DPDP Act 2023)</h3>
              <p>For specific, limited purposes, we rely on the legitimate uses provision of the DPDP Act, including:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Operating security monitoring systems (rate limiting, failed login tracking, suspicious activity detection) to protect the integrity of the Platform and the safety of user accounts</li>
                <li>Investigating and responding to security incidents</li>
                <li>Fraud detection and prevention</li>
              </ul>
              <p>We do not rely on this basis for any marketing, profiling, or commercial data processing activity.</p>

              {/* Section 6: Data Sharing and Third-Party Processors */}
              <h2 id="6-data-sharing-and-third-party-processors" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                6. Data Sharing and Third-Party Processors
              </h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">6.1 — Our Approach to Data Sharing</h3>
              <p>We share your personal data with third parties only where it is necessary to provide the services you have requested. Every third party to whom we transmit personal data acts as a Data Processor under a written agreement that:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Prohibits them from processing your data for any purpose other than what we have specified</li>
                <li>Requires them to implement appropriate technical and organisational security measures</li>
                <li>Requires them to delete your data upon termination of the agreement or our instruction</li>
                <li>Prohibits them from disclosing your data to sub-processors without our authorisation</li>
                <li>Requires them to assist us in meeting our obligations under applicable data protection law</li>
              </ul>
              <p><strong>We do not sell personal data. We do not share personal data for advertising purposes. We do not disclose personal data to any party not listed below</strong>, except where required by law.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">6.2 — Complete List of Third-Party Data Processors</h3>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Processor</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Country of Operation</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Purpose</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Categories of Data Shared</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Their Privacy Policy</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Supabase, Inc.</td>
                      <td className="p-3 border-r border-[#1E0A35]">Database hosted in Mumbai, India (AWS ap-south-1)</td>
                      <td className="p-3 border-r border-[#1E0A35]">Primary database and file storage for all Platform data; authentication services</td>
                      <td className="p-3 border-r border-[#1E0A35]">All categories of personal data collected through the Platform, as applicable to your account and the features you use</td>
                      <td className="p-3">
                        <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#A78BFA] hover:underline">supabase.com/privacy</a>
                      </td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Vercel, Inc.</td>
                      <td className="p-3 border-r border-[#1E0A35]">United States (Washington D.C. edge network)</td>
                      <td className="p-3 border-r border-[#1E0A35]">Frontend hosting and delivery of the Platform&apos;s web interface</td>
                      <td className="p-3 border-r border-[#1E0A35]">Technical request data (IP addresses, request headers) processed in serving the Platform interface; your personal data is not stored on Vercel&apos;s servers — it is stored in Supabase</td>
                      <td className="p-3">
                        <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#A78BFA] hover:underline">vercel.com/legal/privacy-policy</a>
                      </td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Vapi AI</td>
                      <td className="p-3 border-r border-[#1E0A35]">United States</td>
                      <td className="p-3 border-r border-[#1E0A35]">Voice AI infrastructure — processing audio and generating call transcripts for the voice agent tools</td>
                      <td className="p-3 border-r border-[#1E0A35]">Call audio recordings; call metadata</td>
                      <td className="p-3">
                        <a href="https://vapi.ai/privacy" target="_blank" rel="noopener noreferrer" className="text-[#A78BFA] hover:underline">vapi.ai/privacy</a>
                      </td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Twilio, Inc.</td>
                      <td className="p-3 border-r border-[#1E0A35]">United States</td>
                      <td className="p-3 border-r border-[#1E0A35]">Telephony services — routing and connecting phone calls for paid voice agent features</td>
                      <td className="p-3 border-r border-[#1E0A35]">Call routing data; phone numbers involved in calls</td>
                      <td className="p-3">
                        <a href="https://www.twilio.com/en-us/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-[#A78BFA] hover:underline">twilio.com/en-us/legal/privacy</a>
                      </td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Google LLC (Gemini API)</td>
                      <td className="p-3 border-r border-[#1E0A35]">United States</td>
                      <td className="p-3 border-r border-[#1E0A35]">Large language model (LLM) processing — generating AI responses for document structuring, scheme matching, and other AI features</td>
                      <td className="p-3 border-r border-[#1E0A35]">The content of documents or queries you submit for AI processing — transmitted to obtain a response and not retained for model training under our agreement</td>
                      <td className="p-3">
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#A78BFA] hover:underline">policies.google.com/privacy</a>
                      </td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Mistral AI</td>
                      <td className="p-3 border-r border-[#1E0A35]">France (EU)</td>
                      <td className="p-3 border-r border-[#1E0A35]">Fallback LLM provider — used when Google Gemini is unavailable or when a specific processing task is better suited to Mistral&apos;s models</td>
                      <td className="p-3 border-r border-[#1E0A35]">Document or query content, as above — transmitted solely to obtain a response</td>
                      <td className="p-3">
                        <a href="https://mistral.ai/privacy" target="_blank" rel="noopener noreferrer" className="text-[#A78BFA] hover:underline">mistral.ai/privacy</a>
                      </td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Razorpay Software Pvt. Ltd.</td>
                      <td className="p-3 border-r border-[#1E0A35]">India</td>
                      <td className="p-3 border-r border-[#1E0A35]">Payment processing for Indian users (upon activation of paid tier)</td>
                      <td className="p-3 border-r border-[#1E0A35]">Billing and transaction data — Razorpay independently collects and processes your payment credentials under their own privacy policy; we do not receive raw card or payment credential data</td>
                      <td className="p-3">
                        <a href="https://razorpay.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#A78BFA] hover:underline">razorpay.com/privacy</a>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Stripe, Inc.</td>
                      <td className="p-3 border-r border-[#1E0A35]">United States</td>
                      <td className="p-3 border-r border-[#1E0A35]">Payment processing for international users (upon activation of paid tier for international users)</td>
                      <td className="p-3 border-r border-[#1E0A35]">Billing and transaction data — as above, Stripe processes payment credentials independently</td>
                      <td className="p-3">
                        <a href="https://stripe.com/in/privacy" target="_blank" rel="noopener noreferrer" className="text-[#A78BFA] hover:underline">stripe.com/in/privacy</a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[13px] text-[#9A91B5] italic">
                <strong>Note on AI processors:</strong> When your data is transmitted to Google Gemini or Mistral AI for processing, it is sent solely to generate a single response to your request. Our data processing agreements with these providers (or their applicable API terms of service) prohibit them from using your data to train or improve their models. However, you should independently review these providers&apos; terms of service and privacy policies to satisfy yourself about their independent data practices. If you have concerns about a specific provider, contact our Grievance Officer and we will provide you with details of the applicable contractual restriction.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">6.3 — Disclosures Required by Law</h3>
              <p>We may disclose personal data to courts, law enforcement agencies, government authorities, or regulatory bodies where we are required to do so by a valid and binding legal order issued under applicable Indian law. Where we receive such an order:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>We will review the order for legal validity before complying</li>
                <li>We will notify you of the order to the extent we are legally permitted to do so</li>
                <li>We will disclose only the minimum personal data required to satisfy the legal obligation</li>
                <li>We will document the disclosure in our processing activity log</li>
              </ul>
              <p>We will not voluntarily share your personal data with law enforcement without a legal order unless we believe, in good faith, that such disclosure is necessary to prevent imminent serious harm to a person.</p>

              {/* Section 7: Data Retention Periods */}
              <h2 id="7-data-retention-periods" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                7. Data Retention Periods
              </h2>
              <p>We retain personal data for the minimum period necessary to fulfil the purpose for which it was collected, or as required by law. The following table sets out our complete, exact data retention schedule. <strong>&ldquo;Auto-Delete&rdquo; means the deletion is performed automatically by our systems on a scheduled basis without manual intervention.</strong></p>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Data Type</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Retention Period</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Auto-Delete?</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Basis for Retention Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Voice call recordings (audio)</td>
                      <td className="p-3 border-r border-[#1E0A35]">10 days from date of recording</td>
                      <td className="p-3 border-r border-[#1E0A35] text-emerald-400 font-semibold">✅ Yes</td>
                      <td className="p-3">Minimum necessary for you to access and use your recordings; permanent deletion thereafter</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Voice call transcripts (text)</td>
                      <td className="p-3 border-r border-[#1E0A35]">10 days from date of call</td>
                      <td className="p-3 border-r border-[#1E0A35] text-emerald-400 font-semibold">✅ Yes</td>
                      <td className="p-3">As above</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Call analytics (identifying elements)</td>
                      <td className="p-3 border-r border-[#1E0A35]">Identifying elements deleted at 90 days; anonymized aggregate data retained indefinitely</td>
                      <td className="p-3 border-r border-[#1E0A35] text-emerald-400 font-semibold">✅ Yes (identifying elements)</td>
                      <td className="p-3">90-day window allows meaningful account-level analytics; anonymized data does not constitute personal data</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Uploaded documents (raw files)</td>
                      <td className="p-3 border-r border-[#1E0A35]">7 days from upload date; maximum 3 most recent documents retained at any time regardless of date</td>
                      <td className="p-3 border-r border-[#1E0A35] text-emerald-400 font-semibold">✅ Yes</td>
                      <td className="p-3">Minimum necessary for processing and review; automatic rolling deletion of older files</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Extracted document data (structured outputs)</td>
                      <td className="p-3 border-r border-[#1E0A35]">30 days from extraction date</td>
                      <td className="p-3 border-r border-[#1E0A35] text-emerald-400 font-semibold">✅ Yes</td>
                      <td className="p-3">Allows you sufficient time to retrieve and use outputs</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">MSME Navigator business profile</td>
                      <td className="p-3 border-r border-[#1E0A35]">Retained while your account is active</td>
                      <td className="p-3 border-r border-[#1E0A35] text-rose-400 font-semibold">❌ No (manual — deleted on account closure or inactivity process)</td>
                      <td className="p-3">Necessary for ongoing scheme matching services</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Scheme match results</td>
                      <td className="p-3 border-r border-[#1E0A35]">90 days from date of match</td>
                      <td className="p-3 border-r border-[#1E0A35] text-emerald-400 font-semibold">✅ Yes</td>
                      <td className="p-3">Sufficient window for you to review and act on results</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Account profile data (active accounts)</td>
                      <td className="p-3 border-r border-[#1E0A35]">Until you request deletion or your account is closed</td>
                      <td className="p-3 border-r border-[#1E0A35] text-rose-400 font-semibold">❌ No</td>
                      <td className="p-3">Necessary for service delivery</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Account profile data (inactive accounts — no login for 12 consecutive months)</td>
                      <td className="p-3 border-r border-[#1E0A35]">30 days after written warning is sent, then permanently deleted</td>
                      <td className="p-3 border-r border-[#1E0A35] text-emerald-400 font-semibold">✅ Yes</td>
                      <td className="p-3">Balanced against your right not to have stale data retained indefinitely</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Consent records</td>
                      <td className="p-3 border-r border-[#1E0A35]">Permanently</td>
                      <td className="p-3 border-r border-[#1E0A35] text-rose-400 font-semibold">❌ Never deleted</td>
                      <td className="p-3">Mandatory legal compliance record under DPDP Act 2023; establishes the fact and scope of consent for each processing activity</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Processing activity logs</td>
                      <td className="p-3 border-r border-[#1E0A35]">Permanently</td>
                      <td className="p-3 border-r border-[#1E0A35] text-rose-400 font-semibold">❌ Never deleted</td>
                      <td className="p-3">Data Fiduciary accountability record under DPDP Act 2023</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Payment records (transaction references, amounts, dates)</td>
                      <td className="p-3 border-r border-[#1E0A35]">8 years from transaction date</td>
                      <td className="p-3 border-r border-[#1E0A35] text-rose-400 font-semibold">❌ No</td>
                      <td className="p-3">Required under Income Tax Act, 1961 and Indian financial record-keeping law</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Security logs (failed logins, security events, IP/user-agent on consent actions)</td>
                      <td className="p-3 border-r border-[#1E0A35]">180 days</td>
                      <td className="p-3 border-r border-[#1E0A35] text-emerald-400 font-semibold">✅ Yes</td>
                      <td className="p-3">Required under CERT-In Directions dated April 28, 2022</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Community forum posts and blog comments</td>
                      <td className="p-3 border-r border-[#1E0A35]">Until you delete them or your account is closed</td>
                      <td className="p-3 border-r border-[#1E0A35] text-rose-400 font-semibold">❌ No</td>
                      <td className="p-3">Visibility is at your discretion; you may delete your own posts at any time</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Support and grievance records (support emails, complaint records, resolution documentation, data rights requests, and related correspondence)</td>
                      <td className="p-3 border-r border-[#1E0A35]">Retained for the duration of your account plus 3 years from the date of resolution or account closure, whichever is later</td>
                      <td className="p-3 border-r border-[#1E0A35] text-rose-400 font-semibold">❌ No</td>
                      <td className="p-3">Required for legal defense, regulatory compliance, and to demonstrate compliance with DPDP Act grievance response obligations</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">7.1 — Inactive Account Procedure</h3>
              <p>If your account shows no login activity for <strong>12 consecutive months</strong>, we will:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-1">
                <li>Send you an email notification to your registered email address, warning that your account and associated data will be deleted in <strong>30 days</strong> unless you log in</li>
                <li>Send a reminder at <strong>15 days</strong> and <strong>7 days</strong> before the deletion date</li>
                <li>Permanently delete your account and all associated non-exempt data on the 30th day, if no login is recorded</li>
              </ol>
              <p>Payment records, consent records, and processing activity logs are not deleted as part of the inactive account process, as these are subject to independent legal retention requirements.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">7.2 — What &ldquo;Permanent Deletion&rdquo; Means</h3>
              <p>When we say data is permanently deleted, we mean:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>The data is removed from our primary database (Supabase)</li>
                <li>The data is removed from any backup systems within the next scheduled backup cycle (maximum 7 days from scheduled deletion)</li>
                <li>Deletion instructions are propagated to all relevant Data Processors (Vapi, etc.) as part of our processor agreements</li>
                <li>The data cannot be recovered, restored, or accessed by us or any processor after deletion is confirmed</li>
              </ul>
              <p>We do not maintain shadow copies, undisclosed backups, or any other secondary store of deleted data.</p>

              {/* Section 8: Data Storage Location and International Transfers */}
              <h2 id="8-data-storage-location-and-international-transfers" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                8. Data Storage Location and International Transfers
              </h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">8.1 — Primary Data Storage</h3>
              <p>
                All personal data collected through the Platform is stored on database servers located in <strong>Mumbai, India</strong>, operated by Supabase, Inc. on Amazon Web Services infrastructure in the <strong>ap-south-1 (Asia Pacific — Mumbai) region</strong>. This means that your personal data, at rest, is stored within Indian territory.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">8.2 — Data Transmission to AI Processors Outside India</h3>
              <p>
                When you use AI-powered features on the Platform (document structuring, scheme matching, voice agent AI responses), your query content or document content is transmitted to AI processing providers — specifically Google LLC (United States) and Mistral AI (France) — for the sole purpose of generating a response. This constitutes a cross-border transfer of data.
              </p>
              <p>
                <strong>Current status:</strong> We acknowledge that the specific rules governing cross-border personal data transfers under the DPDP Act 2023 are subject to the Central Government&apos;s notification of permitted countries and additional conditions under Section 16 of the DPDP Act, which has not yet been fully operationalized at the time this Policy was drafted. We are monitoring regulatory developments and will update this Policy to reflect any new requirements as they come into effect.
              </p>
              <p><strong>Safeguards currently in place for AI processing transfers:</strong></p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Data transmitted to AI processors is limited to the minimum content necessary to generate a response (we do not transmit your account profile or identifying account data alongside document content where this can be avoided)</li>
                <li>AI processors are bound by contractual terms or API terms of service that prohibit use of your data for independent model training</li>
                <li>Processed responses are returned to our systems in India (Supabase) and the transmitted content is not retained by the AI processor beyond the immediate request-response cycle, to the extent provided by their applicable terms</li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">8.3 — Vercel Frontend Hosting</h3>
              <p>
                The Platform&apos;s web interface is served through Vercel&apos;s global edge network, with infrastructure including servers in Washington D.C. and other locations. Your personal data (account data, voice recordings, documents, etc.) is not stored on Vercel&apos;s servers — it is stored in Supabase (Mumbai). Vercel processes technical request data (IP addresses and request headers) in the course of serving the Platform&apos;s web interface.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">8.4 — Future International Expansion</h3>
              <p>When the Platform begins actively serving users outside India, this Policy will be updated to:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Identify the additional jurisdictions and applicable data protection laws</li>
                <li>Describe the cross-border transfer mechanisms in place (such as Standard Contractual Clauses for EU users or equivalent safeguards for other jurisdictions)</li>
                <li>Appoint local representatives or Data Protection Officers where required by applicable law</li>
                <li>Update the list of processors if new processors are engaged for international operations</li>
              </ul>
              <p>We will provide 30 days&apos; prior notice of any material changes to our data transfer practices.</p>

              {/* Section 9: Security Measures */}
              <h2 id="9-security-measures" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                9. Security Measures
              </h2>
              <p>We have implemented the following specific technical and organisational security measures to protect your personal data. We describe each measure in specific technical terms so you can assess its adequacy.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">9.1 — Encryption</h3>
              <p><strong>In Transit:</strong> All data transmitted between your browser and the Platform, and between the Platform and our processors, is encrypted using <strong>TLS 1.3</strong> (Transport Layer Security version 1.3). We do not support TLS 1.0 or TLS 1.1, which are deprecated protocols. HTTP Strict Transport Security (HSTS) is enabled, meaning your browser will refuse to connect to the Platform over an unencrypted connection.</p>
              <p><strong>At Rest:</strong> All data stored in Supabase is encrypted at rest using <strong>AES-256</strong> (Advanced Encryption Standard with a 256-bit key), implemented at the database storage layer.</p>
              <p><strong>Sensitive Fields:</strong> For particularly sensitive structured data fields — including PAN numbers, GSTIN, and bank account details where these appear in structured data you provide — we apply an additional layer of <strong>AES-256-GCM</strong> encryption at the application level before writing to the database, using the <code>pgcrypto</code> extension. This means these fields are encrypted twice: once at the application level and once at the storage layer.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">9.2 — Database Access Controls</h3>
              <p><strong>Row-Level Security (RLS):</strong> We have enabled Row-Level Security on <strong>all</strong> database tables that contain user data. RLS is a PostgreSQL feature that enforces, at the database engine level, that each query can only return rows belonging to the authenticated user making the request. This means that even if an application-layer bug caused an incorrect query to be executed, the database itself would block unauthorized row access.</p>
              <p><strong>Parameterized Queries:</strong> All database queries executed by the Platform use parameterized queries (also called prepared statements). We do not construct SQL queries by concatenating user-supplied input. This eliminates SQL injection as an attack vector.</p>
              <p><strong>Access Limitation:</strong> Direct database access is restricted to the two founding team members only, both of whom have multi-factor authentication (MFA) enabled on their database access credentials.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">9.3 — Authentication and Session Security</h3>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Passwords are hashed using <strong>bcrypt</strong> with an appropriate work factor. Plaintext passwords are never stored, logged, or transmitted to our servers after initial hashing.</li>
                <li>Authentication sessions are managed using <strong>Supabase JWT (JSON Web Tokens)</strong> with automatic <strong>refresh token rotation</strong> — each time a session token is refreshed, the old refresh token is invalidated.</li>
                <li>Sessions automatically expire after <strong>30 minutes of inactivity</strong>, requiring re-authentication.</li>
                <li>Failed login attempts are logged and flagged for security review.</li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">9.4 — Consent Record Integrity</h3>
              <p>Consent records are protected against tampering as follows:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Each consent record is <strong>cryptographically signed using SHA-256 hashing</strong>, producing a unique fingerprint of the consent at the time it was given</li>
                <li>Consent records are stored in an <strong>immutable append-only log</strong> — they are never updated or deleted after creation</li>
                <li>Every consent action logs your <strong>IP address and browser user-agent string</strong> at the time of consent, creating a verifiable record of the device and network from which consent was given</li>
                <li>Any attempt to alter a consent record would produce a SHA-256 hash mismatch, making tampering detectable</li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">9.5 — Network and Application Security</h3>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li><strong>DDoS Protection:</strong> The Platform&apos;s web interface is protected against distributed denial-of-service attacks through Vercel&apos;s infrastructure-level protection.</li>
                <li><strong>Rate Limiting:</strong> All API endpoints implement rate limiting to prevent brute-force attacks, credential stuffing, and abuse. Requests exceeding defined thresholds are automatically blocked.</li>
                <li><strong>CORS Configuration:</strong> Cross-Origin Resource Sharing (CORS) is configured to allow requests only from authorised Platform domains.</li>
                <li><strong>Security Headers:</strong> The Platform implements the following HTTP security headers:
                  <ul className="list-disc list-inside pl-[24px] space-y-1">
                    <li><code>Content-Security-Policy (CSP)</code> — restricts which resources the browser may load</li>
                    <li><code>X-Frame-Options: DENY</code> — prevents the Platform from being embedded in iframes (clickjacking protection)</li>
                    <li><code>X-Content-Type-Options: nosniff</code> — prevents MIME-type sniffing</li>
                    <li><code>Strict-Transport-Security (HSTS)</code> — enforces HTTPS connections</li>
                  </ul>
                </li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">9.6 — Monitoring and Alerting</h3>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Security events (failed logins, unusual query volumes, consent actions, access to restricted resources) are logged to an immutable security event log retained for 180 days</li>
                <li>Suspicious activity patterns (such as large volumes of database reads within a short time window) are flagged for review</li>
                <li>Rate limiting violations are logged and reviewed</li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">9.7 — Security Review Program</h3>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li><strong>Quarterly security reviews</strong> of infrastructure configuration, RLS policies, credential status, and dependency vulnerability status</li>
                <li><strong>Annual penetration testing</strong> by an external security professional, targeting OWASP Top 10 vulnerability categories (upon reaching 100+ active users or within 12 months of paid tier launch, whichever is earlier)</li>
                <li><strong>Continuous dependency scanning</strong> using <code>npm audit</code> and equivalent tools, with critical and high-severity vulnerabilities patched on a priority basis</li>
                <li><strong>Breach response plan:</strong> We maintain a documented internal breach response plan specifying exact procedures, timelines, and responsibilities for detecting, containing, investigating, and notifying breaches. This plan is tested quarterly through tabletop exercises.</li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">9.8 — Important Limitation</h3>
              <p>
                While we have implemented the measures described above, no security system is impenetrable, and no method of data transmission or storage is 100% secure. We cannot guarantee that your personal data will never be accessed, disclosed, or altered by an unauthorized third party. We commit to notifying you promptly and taking all reasonable remedial steps if a breach occurs, as described in Section 10.
              </p>

              {/* Section 10: Breach Notification Policy */}
              <h2 id="10-breach-notification-policy" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                10. Breach Notification Policy
              </h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">10.1 — Our Commitment</h3>
              <p>
                <strong>We maintain a documented internal breach response plan. In the event of a personal data breach that is likely to result in harm to you, we commit to notifying you within 72 hours of our becoming aware of the breach.</strong>
              </p>
              <p>
                This commitment is not conditional on completing a full investigation. If we are aware of a potential breach affecting your data, we will notify you with the information available at the time, and provide updates as our investigation progresses.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">10.2 — What We Will Tell You</h3>
              <p>Our breach notification to you will include, to the extent the information is known at the time:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>A description of what happened (in plain language, without technical jargon that obscures the facts)</li>
                <li>The categories and approximate volume of personal data affected</li>
                <li>The period during which your data was exposed</li>
                <li>The steps we have taken or are taking to contain and remedy the breach</li>
                <li>The specific steps, if any, we recommend you take to protect yourself (such as changing your password or monitoring for phishing contact)</li>
                <li>The contact details of our Grievance Officer for further questions</li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">10.3 — Regulatory Notifications</h3>
              <p>In parallel with user notification:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>We will notify the <strong>Indian Computer Emergency Response Team (CERT-In)</strong> at incident@cert-in.org.in within <strong>6 hours</strong> of discovering a breach, as required under Section 70B of the IT Act and the CERT-In Directions dated April 28, 2022</li>
                <li>We will notify the <strong>Data Protection Board of India</strong> within <strong>72 hours</strong> of discovering a breach, as required under the DPDP Act 2023, through the official reporting mechanism established by the Board</li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">10.4 — Evidence Preservation</h3>
              <p>
                In the event of a breach, we will preserve all relevant logs, system state records, and forensic evidence for a minimum of <strong>180 days</strong> from the date of discovery, in compliance with CERT-In requirements, and will make this evidence available to authorized regulatory authorities upon request.
              </p>

              {/* Section 11: Your Rights Under the DPDP Act 2023 */}
              <h2 id="11-your-rights-under-the-dpdp-act-2023" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                11. Your Rights Under the DPDP Act 2023
              </h2>
              <p>
                As a Data Principal under the DPDP Act 2023, you have the following rights in respect of your personal data processed by TrinetraEdu-AI. These rights are available to you free of charge, subject to the conditions and exceptions described below.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.1 — Right to Access Information (Section 11, DPDP Act 2023)</h3>
              <p>You have the right to obtain from us:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Confirmation of whether we are processing your personal data</li>
                <li>A summary of the personal data we hold about you</li>
                <li>A description of the processing activities we are performing on your data, and the purposes for which each activity is conducted</li>
                <li>The identities of any Data Processors (third parties) to whom your data has been disclosed</li>
              </ul>
              <p>We will provide this information within <strong>30 days</strong> of receiving a verified request. This right is available to you free of charge.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.2 — Right to Correction and Completion (Section 12, DPDP Act 2023)</h3>
              <p>You have the right to request that we:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Correct any personal data we hold about you that is inaccurate or misleading</li>
                <li>Complete any personal data we hold about you that is incomplete</li>
                <li>Update any personal data we hold about you that is outdated</li>
              </ul>
              <p>For account profile data, you may make corrections directly in your account settings without submitting a formal request. For data that cannot be corrected through self-service, submit a request to our Grievance Officer as described in Section 12.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.3 — Right to Erasure (Section 12, DPDP Act 2023)</h3>
              <p>You have the right to request deletion of your personal data. Upon receiving a verified erasure request:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>We will delete your account and all associated personal data within <strong>30 days</strong></li>
                <li>Automatic deletions on the schedules described in Section 7 will continue in parallel</li>
                <li><strong>Consent records and processing activity logs will not be deleted</strong>, as these are legal compliance records retained under Section 5.3 of this Policy. However, these records do not contain your operational personal data — they contain only the fact, timing, and scope of your consent.</li>
                <li><strong>Payment records will not be deleted</strong> to the extent retention is required by Indian law (8-year retention)</li>
                <li><strong>Security logs will be retained</strong> for the remainder of their 180-day retention period</li>
              </ul>
              <p>If you request erasure of your personal data, your account will be closed and you will no longer be able to access the Platform using that account.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.4 — Right to Withdraw Consent (Section 6, DPDP Act 2023)</h3>
              <p>You may withdraw your consent to any specific processing activity at any time, without providing a reason. Withdrawal of consent:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Takes effect from the date of withdrawal and does not retroactively invalidate processing that occurred while consent was valid</li>
                <li>For consent that relates to a specific tool (e.g., the voice agent tool), withdrawal will result in deletion of the data collected under that consent, in accordance with the retention schedule in Section 7</li>
                <li>For consent that relates to account registration, withdrawal is equivalent to a request for account closure and erasure</li>
              </ul>
              <p>We will process consent withdrawal requests within <strong>30 days</strong>.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.5 — Right to Nominate (Section 14, DPDP Act 2023)</h3>
              <p>
                You have the right to nominate another individual (a &ldquo;Nominated Person&rdquo;) to exercise your rights under the DPDP Act in the event of your death or incapacity. To register a nominee, contact our Grievance Officer with the nominee&apos;s name and contact details. We will maintain a record of your nomination securely linked to your account.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.6 — Right to Grievance Redressal (Section 13, DPDP Act 2023)</h3>
              <p>You have the right to a readily accessible means of grievance redressal for any concern or complaint related to your personal data. Our grievance mechanism is described in detail in Section 16.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.7 — Right to Data Portability</h3>
              <p>You have the right to request an export of your personal data in a <strong>structured, machine-readable JSON format</strong>. The export will include your account profile data, MSME Navigator business profile, and scheme match results within their retention windows. Data that has already been automatically deleted under the schedule in Section 7 cannot be included in a portability export.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">11.8 — Limitations on Rights</h3>
              <p>The following limitations apply to the exercise of rights under this Section:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Rights are available only to the verified account holder. We will verify your identity before processing any rights request.</li>
                <li>Rights are not available for data that we are legally required to retain (consent records, payment records, processing activity logs).</li>
                <li>The right to erasure does not apply to data that has already been automatically deleted — there is nothing remaining to delete.</li>
                <li>Exercise of rights is subject to applicable exceptions and qualifications under the DPDP Act 2023 and other applicable Indian law.</li>
              </ul>

              {/* Section 12: How to Exercise Your Rights */}
              <h2 id="12-how-to-exercise-your-rights" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                12. How to Exercise Your Rights
              </h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">12.1 — Submission of a Request</h3>
              <p>To exercise any right described in Section 11, submit a written request to our Grievance Officer at:</p>
              <p className="font-mono bg-[rgba(139,92,246,0.02)] p-4 rounded-md border border-[#1E0A35]">
                <strong>Email:</strong> grievance@trinetraedu-ai.com<br />
                <strong>Subject line:</strong> &ldquo;Data Rights Request — [Your Full Name] — [Type of Request]&rdquo;
              </p>
              <p>Your request should include:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Your full name and registered email address</li>
                <li>A clear description of the right you wish to exercise</li>
                <li>For correction requests: the specific data that is incorrect and the correct information</li>
                <li>For erasure or withdrawal requests: confirmation that you understand the consequences (account closure for erasure; service impact for consent withdrawal)</li>
                <li>Any other information that would help us identify the specific data at issue</li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">12.2 — Identity Verification</h3>
              <p>To protect your data from unauthorised access requests, we will verify your identity before processing any request. Verification will be conducted by confirming:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>That the request comes from the registered email address associated with the account; or</li>
                <li>Where this is not possible, by requesting reasonable additional verification information</li>
              </ul>
              <p>We will not require you to provide any additional sensitive personal data beyond what is reasonably necessary for verification purposes.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">12.3 — Our Response Timeline</h3>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Step</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Timeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35]">Acknowledgment of your request</td>
                      <td className="p-3">Within <strong>72 hours</strong> of receipt</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35]">Identity verification (if required)</td>
                      <td className="p-3">Within <strong>5 business days</strong> of receipt of verification information</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35]">Resolution and completion of your request</td>
                      <td className="p-3">Within <strong>30 days</strong> of receipt of a complete and verified request</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35]">Notification if we are unable to fulfil the request</td>
                      <td className="p-3">Within <strong>30 days</strong>, with reasons</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">12.4 — Escalation to the Data Protection Board</h3>
              <p>
                If you are not satisfied with our response to your rights request or grievance, you have the right to escalate your complaint to the <strong>Data Protection Board of India</strong>, to be constituted under Section 18 of the DPDP Act 2023. Information on how to file a complaint with the Board will be available at the Ministry of Electronics and Information Technology&apos;s official portal (meity.gov.in) upon operationalization of the Board.
              </p>

              {/* Section 13: Cookie Policy */}
              <h2 id="13-cookie-policy" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                13. Cookie Policy
              </h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">13.1 — What Cookies We Use</h3>
              <p>The Platform uses <strong>only essential authentication cookies</strong>. We do not use any of the following:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Third-party tracking cookies</li>
                <li>Advertising or remarketing cookies</li>
                <li>Behavioral analytics cookies (Google Analytics, Hotjar, Mixpanel, or equivalent services that track individual user behavior)</li>
                <li>Social media cookies or pixels (including Facebook Pixel, LinkedIn Insight Tag, or equivalent)</li>
                <li>Cross-site tracking mechanisms of any kind</li>
              </ul>
              <p>The essential cookies we do use serve one purpose: keeping you securely logged in as you navigate between tools on the Platform.</p>
              <p>We do use <strong>privacy-respecting analytics tools</strong> (Google Search Console and Vercel Analytics) that measure aggregate traffic and page performance without placing cookies on your device, without tracking you across websites, and without collecting personal identifiers. Full details are in our standalone Cookie Policy.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">13.2 — Details of Essential Cookies</h3>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Cookie Name</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Purpose</th>
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Duration</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Attributes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35] font-medium text-[#FAF7FF]">Authentication session cookie (managed by Supabase Auth)</td>
                      <td className="p-3 border-r border-[#1E0A35]">Maintains your authenticated session across Platform tools and subdomains so you do not need to log in repeatedly</td>
                      <td className="p-3 border-r border-[#1E0A35]">Session-based — deleted when you close your browser; refresh tokens have a longer lifespan to enable persistent login if you choose</td>
                      <td className="p-3"><code>HttpOnly</code> (not accessible to JavaScript); <code>Secure</code> (transmitted only over HTTPS); <code>SameSite=Strict</code> (not sent in cross-site requests)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p><code>HttpOnly</code>, <code>Secure</code>, and <code>SameSite=Strict</code> are specific security attributes that protect your session cookie from common attack types including cross-site scripting (XSS) and cross-site request forgery (CSRF).</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">13.3 — Cookie Consent</h3>
              <p>Because we use only essential cookies strictly necessary for the operation of the Platform, we do not require your specific consent to set these cookies under current Indian law. However, you may disable cookies in your browser settings. Disabling cookies will prevent you from logging in and using the Platform, as authentication requires cookies to function.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">13.4 — Full Cookie Policy</h3>
              <p>A standalone Cookie Policy document with full technical details, including information about our privacy-respecting analytics tools, is available at trinetraedu-ai.com/cookies and is incorporated into this Privacy Policy by reference.</p>

              {/* Section 14: Children's Privacy */}
              <h2 id="14-childrens-privacy" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                14. Children&apos;s Privacy
              </h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">14.1 — Age Restriction</h3>
              <p>The Platform is designed for use by businesses and business owners, and is <strong>not intended for use by individuals under the age of 18 years</strong>. We do not knowingly collect personal data from anyone under 18.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">14.2 — If We Discover a Minor&apos;s Data</h3>
              <p>If we become aware or have reason to believe that we have collected personal data from a person under 18, whether through registration or through data submitted by an account holder, we will:</p>
              <ol className="list-decimal list-inside pl-[16px] space-y-1">
                <li>Immediately suspend access to the relevant account pending review</li>
                <li>Permanently delete all personal data associated with the minor upon confirmation</li>
                <li>Notify the account holder of the deletion</li>
              </ol>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">14.3 — Parental or Guardian Reporting</h3>
              <p>If you believe a person under 18 has created an account or submitted personal data through the Platform, please contact our Grievance Officer immediately at grievance@trinetraedu-ai.com with the subject line &ldquo;Minor&apos;s Data — Urgent.&rdquo; We will treat all such reports as a priority matter and respond within 24 hours.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">14.4 — DPDP Act Obligations Regarding Children</h3>
              <p>The DPDP Act 2023 imposes specific obligations on Data Fiduciaries in respect of children&apos;s data, including the requirement to obtain verifiable parental consent. As our Platform is not intended for children, we treat the discovery of any minor&apos;s data as a compliance matter requiring immediate deletion rather than a situation requiring parental consent processing.</p>

              {/* Section 15: Changes to This Policy */}
              <h2 id="15-changes-to-this-policy" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                15. Changes to This Policy
              </h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">15.1 — How We Update This Policy</h3>
              <p>We may update this Policy from time to time to reflect:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Changes in the services we offer</li>
                <li>New or changed third-party processors</li>
                <li>Changes in applicable law or regulatory guidance (including as the DPDP Act&apos;s subordinate rules are notified)</li>
                <li>Changes in our data retention or security practices</li>
                <li>The results of our periodic security audits</li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">15.2 — How We Will Notify You</h3>
              <p><strong>For material changes</strong> — changes that expand the categories of data we collect, change the purposes for which we use data, add new third-party processors, reduce your rights, or otherwise materially affect your interests — we will:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Send you an email notification to your registered email address at least <strong>30 days before</strong> the change takes effect</li>
                <li>Display a prominent notice on the Platform&apos;s main page for at least 30 days</li>
                <li>Where the change requires fresh consent under applicable law, present a consent interface and obtain your agreement before the change takes effect for your account</li>
              </ul>
              <p><strong>For non-material changes</strong> (corrections of typographical errors, clarifications that do not change the substance of our practices, updates to reflect operationalized provisions of the DPDP Act that do not affect your rights) — we will update the &ldquo;Last Updated&rdquo; date and publish the revised Policy without advance notice.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">15.3 — Versioning</h3>
              <p>This Policy carries a version number (currently Version 2.0). Each materially revised version will carry an incremented version number. Prior versions of this Policy will be archived and made available on request to our Grievance Officer.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">15.4 — Your Continued Use</h3>
              <p>If you continue to use the Platform after a material change takes effect, we will treat this as acceptance of the revised Policy for non-consent-based processing activities. For processing activities that require consent, we will obtain fresh consent before processing under the new terms.</p>

              {/* Section 16: Grievance Officer and Contact */}
              <h2 id="16-grievance-officer-and-contact" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                16. Grievance Officer and Contact
              </h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">16.1 — Grievance Officer</h3>
              <p>In accordance with Section 13 of the DPDP Act 2023, Rule 5 of the SPDI Rules 2011, and Rule 3(2) of the IT Intermediary Guidelines 2021, TrinetraEdu-AI has designated a Grievance Officer to receive and address complaints and queries related to this Policy and the processing of personal data.</p>
              <ul className="list-none pl-[0px] space-y-2">
                <li><strong>Grievance Officer:</strong> The Grievance Officer</li>
                <li><strong>Designation:</strong> Co-Founder / Grievance Officer, TrinetraEdu-AI</li>
                <li><strong>Email:</strong> <a href="mailto:grievance@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">grievance@trinetraedu-ai.com</a></li>
                <li><strong>Platform Address:</strong> trinetraedu-ai.com</li>
                <li><strong>Registered Address:</strong> Currently operating remotely. Registered address will be updated upon company incorporation.</li>
              </ul>
              <p className="text-[13px] text-[#9A91B5] italic">
                <strong>Note on Grievance Officer Designation:</strong> Upon LLP incorporation, the designated Grievance Officer&apos;s full legal name and the registered address of the entity will be inserted in this Section. As required by the DPDP Act and the IT Intermediary Guidelines, the Grievance Officer is a natural person based in India who is authorised to receive, acknowledge, and respond to complaints on behalf of TrinetraEdu-AI.
              </p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">16.2 — Grievance Process</h3>
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-[#1E0A35] text-[14px]">
                  <thead>
                    <tr className="bg-[rgba(139,92,246,0.05)] border-b border-[#1E0A35]">
                      <th className="p-3 text-left border-r border-[#1E0A35] text-[#FAF7FF]">Step</th>
                      <th className="p-3 text-left text-[#FAF7FF]">Timeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35]">You submit a complaint or query to grievance@trinetraedu-ai.com</td>
                      <td className="p-3">—</td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35]">We acknowledge receipt of your complaint</td>
                      <td className="p-3">Within <strong>72 hours</strong></td>
                    </tr>
                    <tr className="border-b border-[#1E0A35]">
                      <td className="p-3 border-r border-[#1E0A35]">We investigate and respond substantively</td>
                      <td className="p-3">Within <strong>30 days</strong></td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r border-[#1E0A35]">If unresolved or unsatisfactory: you escalate to the Data Protection Board of India</td>
                      <td className="p-3">As per Board procedures (see meity.gov.in)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">16.3 — What to Include in Your Complaint</h3>
              <p>To help us resolve your complaint efficiently, please include:</p>
              <ul className="list-disc list-inside pl-[16px] space-y-1">
                <li>Your full name and registered email address</li>
                <li>A clear description of your complaint or concern</li>
                <li>The specific provision of this Policy or legal right that you believe has been violated (if applicable)</li>
                <li>The relevant dates and events</li>
                <li>Any supporting information you consider relevant</li>
              </ul>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">16.4 — Data Protection Board Escalation</h3>
              <p>If you are not satisfied with our response, you may file a complaint with the <strong>Data Protection Board of India</strong>, once constituted under Section 18 of the DPDP Act 2023. Information on filing a complaint will be published at the Ministry of Electronics and Information Technology portal (meity.gov.in). We will cooperate fully with any investigation or inquiry by the Board.</p>

              {/* Section 17: Effective Date and Jurisdiction */}
              <h2 id="17-effective-date-and-jurisdiction" className="text-[#FAF7FF] font-semibold text-[20px] tracking-tight mt-[32px] mb-[12px]">
                17. Effective Date and Jurisdiction
              </h2>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">17.1 — Effective Date</h3>
              <p>This Privacy Policy is effective as of <strong>15-07-2026</strong> and applies to all personal data collected on or after this date by TrinetraEdu-AI across all Platform tools, subdomains, and services, including msme.trinetraedu-ai.com and any tools or subdomains launched in the future under the TrinetraEdu-AI brand.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">17.2 — Governing Law and Jurisdiction</h3>
              <p>This Policy and all matters arising from it are governed by the laws of the Republic of India. Any dispute arising from this Policy or the processing of personal data that is not resolved through our grievance mechanism shall be subject to the jurisdiction of the courts in Kanpur, Uttar Pradesh, India, without prejudice to the right of either party to seek injunctive relief in any competent court.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">17.3 — Language</h3>
              <p>This Policy is drafted in English, which is the governing version. In the event of any translation being provided for the convenience of users in other languages, the English version shall prevail in case of any conflict or ambiguity.</p>

              <h3 className="text-[#FAF7FF] font-medium text-[16px] mt-[16px] mb-[8px]">17.4 — Severability</h3>
              <p>If any provision of this Policy is found to be invalid, unlawful, or unenforceable under applicable law, that provision shall be modified to the minimum extent necessary to make it valid, lawful, and enforceable, and the remaining provisions of this Policy shall continue in full force and effect.</p>

              <hr className="border-[#1E0A35] my-6" />

              <p className="text-[13px] text-[#9A91B5] italic">
                <em>This Privacy Policy was drafted for TrinetraEdu-AI and should be reviewed by qualified Indian legal counsel prior to publication — specifically to: (a) confirm and insert the final registered entity name, registration number, and address upon LLP incorporation; (b) finalize the name of the designated Grievance Officer; (c) confirm the applicable court of jurisdiction; (d) verify the terms of service / data processing agreements with all AI processors (Google Gemini and Mistral AI) with respect to the prohibition on model training using submitted data; and (e) monitor and incorporate any subordinate rules, regulations, or Board decisions issued under the DPDP Act 2023 after the date of this draft.</em>
              </p>

              <p className="text-center font-semibold text-[#FAF7FF] text-[16px] mt-8">
                <strong>TrinetraEdu-AI | trinetraedu-ai.com | grievance@trinetraedu-ai.com</strong>
              </p>

            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}