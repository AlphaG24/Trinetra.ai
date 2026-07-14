"use client";

import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { toast } from "sonner";
import {
  ShieldCheck,
  Mail,
  FileText,
  HelpCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Send,
  Building,
  User,
  MessageSquare
} from "lucide-react";

export default function GrievanceRedressalPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    grievanceType: "privacy_policy_violation",
    description: "",
    additionalDetails: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("https://formspree.io/f/mjgnkbay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          grievanceType: formData.grievanceType,
          message: formData.description,
          additionalDetails: formData.additionalDetails || "N/A"
        })
      });

      if (response.ok) {
        setIsSubmitted(true);
        setFormData({
          fullName: "",
          email: "",
          grievanceType: "privacy_policy_violation",
          description: "",
          additionalDetails: ""
        });
        toast.success("Grievance submitted successfully!");
      } else {
        throw new Error("API response was not ok");
      }
    } catch (error) {
      toast.error("Failed to submit grievance. Please email us directly at grievance@trinetraedu-ai.com.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col bg-[#080010] min-h-screen pt-[140px] pb-[100px] px-[20px] relative overflow-hidden font-sans">

        {/* Subtle Background Glows */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 600px 600px at center top, rgba(139,92,246,0.06) 0%, transparent 60%)'
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] z-0 pointer-events-none rounded-full blur-[120px]"
          style={{
            background: 'rgba(139,92,246,0.02)'
          }}
        />

        <div className="max-w-[850px] mx-auto w-full relative z-10 flex flex-col">

          {/* Header */}
          <h1 className="font-display font-bold text-[36px] md:text-[44px] text-[#FAF7FF] tracking-[-0.02em] leading-tight mb-[16px] text-center">
            Grievance Redressal
          </h1>
          <p className="text-center text-[#B8B0D1] max-w-[600px] mx-auto leading-relaxed mb-[64px]">
            We value your trust and are committed to resolving your concerns promptly and fairly.
            Read our grievance framework or submit a ticket directly to our compliance officer.
          </p>

          {/* Unified Content Card */}
          <div className="w-full bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[24px] md:p-[48px] shadow-[0_0_40px_rgba(139,92,246,0.05)] space-y-12 text-[#B8B0D1] text-[15px] leading-[1.8]">

            {/* Section 1: Intro */}
            <div>
              <h2 className="font-semibold text-[20px] text-[#FAF7FF] mb-[16px] flex items-center gap-[10px] tracking-tight">
                <ShieldCheck className="w-5 h-5 text-[#A78BFA]" />
                1. Our Commitment to Your Rights
              </h2>
              <p className="mb-[16px]">
                At TrinetraEdu-AI, we aim to build a transparent and secure educational ecosystem. We respect your control over your personal information and recognize your legal right to voice any grievances or concerns regarding how we process, store, or protect your data.
              </p>
              <p>
                This mechanism has been established to ensure you have a clear, reliable path to seek resolution for any data privacy, security, or service discrepancies on our platform.
              </p>
            </div>

            <hr className="border-[#1E0A35]" />

            {/* Section 2: What You Can Complain About */}
            <div>
              <h2 className="font-semibold text-[20px] text-[#FAF7FF] mb-[16px] flex items-center gap-[10px] tracking-tight">
                <HelpCircle className="w-5 h-5 text-[#A78BFA]" />
                2. What You Can Complain About
              </h2>
              <p className="mb-[24px]">
                We handle complaints and queries relating to the following matters:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[32px] gap-y-[20px]">
                {[
                  { title: "Data Access Requests", desc: "Request to view all personal information we currently hold about you." },
                  { title: "Data Correction Requests", desc: "Request updates to incorrect, incomplete, or outdated personal information." },
                  { title: "Data Deletion Requests", desc: "Request permanent removal of your personal information from our active databases." },
                  { title: "Consent Withdrawal", desc: "Request us to stop processing your data or revoke specific consents previously given." },
                  { title: "Security Concerns", desc: "Report suspected data breaches, unauthorised account access, or vulnerability findings." },
                  { title: "Content Takedown", desc: "Request removal of copyrighted materials or offensive content published on our blog/forum." },
                  { title: "Account & Billing Issues", desc: "Raise issues related to login failures, profile lockouts, or billing disputes." },
                  { title: "Privacy Policy Violations", desc: "Report instances where you feel our data operations deviated from our published policy." }
                ].map((item, index) => (
                  <div key={index} className="flex flex-col border-l-2 border-[#1E0A35] pl-[16px] py-[2px]">
                    <h3 className="text-[#FAF7FF] font-medium text-[15px] mb-[4px] flex items-center gap-[8px]">
                      {item.title}
                    </h3>
                    <p className="text-[#9A91B5] text-[13px] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-[#1E0A35]" />

            {/* Section 3: How to Submit a Grievance */}
            <div>
              <h2 className="font-semibold text-[20px] text-[#FAF7FF] mb-[16px] flex items-center gap-[10px] tracking-tight">
                <FileText className="w-5 h-5 text-[#A78BFA]" />
                3. How to Submit
              </h2>
              <p className="mb-[24px]">
                We provide two secure ways to raise a grievance. Send an email directly to <a href="mailto:grievance@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">grievance@trinetraedu-ai.com</a>, or fill out the official online submission portal below.
              </p>

              {/* Submission Form Area */}
              <div className="mt-8 pt-4">
                {isSubmitted ? (
                  <div className="flex flex-col items-center justify-center text-center py-[40px] bg-[rgba(139,92,246,0.02)] border border-[#1E0A35] rounded-xl px-4">
                    <div className="w-[64px] h-[64px] rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[#10B981] flex items-center justify-center mb-[24px]">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-[#FAF7FF] font-semibold text-[20px] mb-[8px]">Grievance Submitted</h3>
                    <p className="text-[#9A91B5] text-[14px] leading-relaxed mb-[24px] max-w-[450px]">
                      Thank you. Your grievance has been submitted successfully. We will review your concern and get back to you shortly.
                    </p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-[#A78BFA] hover:underline text-[14px] flex items-center gap-[6px]"
                    >
                      Submit another concern
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-[20px] max-w-[650px] mx-auto">
                    <div>
                      <label htmlFor="fullName" className="block text-[#FAF7FF] text-[14px] font-medium mb-[8px] flex items-center gap-[6px]">
                        <User className="w-4 h-4 text-[#6B6088]" /> Full Name <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        required
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="e.g. Ram "
                        className="w-full bg-[#130224] border border-[#1E0A35] text-[#FAF7FF] rounded-[8px] px-[16px] py-[10px] text-[14px] outline-none transition-colors focus:border-[#A78BFA]"
                        suppressHydrationWarning={true}
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-[#FAF7FF] text-[14px] font-medium mb-[8px] flex items-center gap-[6px]">
                        <Mail className="w-4 h-4 text-[#6B6088]" /> Registered Email Address <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="e.g. name@domain.com"
                        className="w-full bg-[#130224] border border-[#1E0A35] text-[#FAF7FF] rounded-[8px] px-[16px] py-[10px] text-[14px] outline-none transition-colors focus:border-[#A78BFA]"
                        suppressHydrationWarning={true}
                      />
                    </div>

                    <div>
                      <label htmlFor="grievanceType" className="block text-[#FAF7FF] text-[14px] font-medium mb-[8px] flex items-center gap-[6px]">
                        <Building className="w-4 h-4 text-[#6B6088]" /> Grievance Classification <span className="text-[#EF4444]">*</span>
                      </label>
                      <select
                        id="grievanceType"
                        name="grievanceType"
                        value={formData.grievanceType}
                        onChange={handleChange}
                        className="w-full bg-[#130224] border border-[#1E0A35] text-[#FAF7FF] rounded-[8px] px-[16px] py-[10px] text-[14px] outline-none transition-colors focus:border-[#A78BFA]"
                        suppressHydrationWarning={true}
                      >
                        <option value="data_access">Data Access Request</option>
                        <option value="data_correction">Data Correction Request</option>
                        <option value="data_deletion">Data Deletion Request</option>
                        <option value="consent_withdrawal">Consent Withdrawal</option>
                        <option value="security_concern">Security & Breach Reporting</option>
                        <option value="content_takedown">Content Takedown Request</option>
                        <option value="account_billing">Account & Billing Issue</option>
                        <option value="privacy_policy_violation">Privacy Policy Violation</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-[#FAF7FF] text-[14px] font-medium mb-[8px] flex items-center gap-[6px]">
                        <MessageSquare className="w-4 h-4 text-[#6B6088]" /> Detailed Description <span className="text-[#EF4444]">*</span>
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        required
                        rows={4}
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Please explain the details of your grievance here..."
                        className="w-full bg-[#130224] border border-[#1E0A35] text-[#FAF7FF] rounded-[8px] px-[16px] py-[10px] text-[14px] outline-none transition-colors focus:border-[#A78BFA] resize-none"
                        suppressHydrationWarning={true}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#A78BFA] hover:bg-[#8B5CF6] text-[#0C0118] font-semibold text-[14px] py-[12px] rounded-[8px] transition-colors duration-200 flex items-center justify-center gap-[8px]"
                      suppressHydrationWarning={true}
                    >
                      {isSubmitting ? (
                        <span className="w-5 h-5 border-2 border-[#0C0118] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Submit Grievance
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            <hr className="border-[#1E0A35]" />

            {/* Section 4: Process timeline & tracking */}
            <div>
              <h2 className="font-semibold text-[20px] text-[#FAF7FF] mb-[16px] flex items-center gap-[10px] tracking-tight">
                <Clock className="w-5 h-5 text-[#A78BFA]" />
                4. Turnaround Timelines & Resolution Process
              </h2>
              <p className="mb-[24px]">
                We investigate every ticket systematically to provide root-cause solutions. Once a ticket is generated, the process moves according to the following stages:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
                <div className="flex flex-col border-l-2 border-[#1E0A35] pl-[16px]">
                  <span className="text-[12px] text-[#A78BFA] font-mono tracking-wider uppercase mb-[4px]">Step 1</span>
                  <h4 className="text-[#FAF7FF] font-medium text-[15px] mb-[4px]">Acknowledgment</h4>
                  <span className="text-[#FAF7FF] font-semibold text-[13px] mb-[4px] block text-purple-300">Within 72 Hours</span>
                  <p className="text-[#9A91B5] text-[13px] leading-relaxed">
                    You receive an acknowledgment email containing your unique Ticket ID. Save this ID for references and follow-ups.
                  </p>
                </div>

                <div className="flex flex-col border-l-2 border-[#1E0A35] pl-[16px]">
                  <span className="text-[12px] text-[#A78BFA] font-mono tracking-wider uppercase mb-[4px]">Step 2</span>
                  <h4 className="text-[#FAF7FF] font-medium text-[15px] mb-[4px]">Initial Assessment</h4>
                  <span className="text-[#FAF7FF] font-semibold text-[13px] mb-[4px] block text-purple-300">Within 15 Days</span>
                  <p className="text-[#9A91B5] text-[13px] leading-relaxed">
                    Our compliance team completes the preliminary analysis and requests further documentation or clarifications if needed.
                  </p>
                </div>

                <div className="flex flex-col border-l-2 border-[#1E0A35] pl-[16px]">
                  <span className="text-[12px] text-[#A78BFA] font-mono tracking-wider uppercase mb-[4px]">Step 3</span>
                  <h4 className="text-[#FAF7FF] font-medium text-[15px] mb-[4px]">Final Resolution</h4>
                  <span className="text-[#FAF7FF] font-semibold text-[13px] mb-[4px] block text-purple-300">Within 30 Days</span>
                  <p className="text-[#9A91B5] text-[13px] leading-relaxed">
                    A comprehensive resolution or a justified decision letter is sent to your registered address, closing the ticket.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-[#1E0A35]" />

            {/* Section 5: Urgent Security Issues */}
            <div className="border-l-2 border-[#EF4444] pl-[16px] py-[4px] bg-[rgba(239,68,68,0.01)] rounded-r-md">
              <h2 className="font-semibold text-[20px] text-[#FCA5A5] mb-[12px] flex items-center gap-[10px] tracking-tight">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                5. Urgent Security & Vulnerability Disclosures
              </h2>
              <p className="text-[#EF4444] opacity-80 leading-[1.8] mb-[16px]">
                If you suspect a vulnerability, have discovered an active security exploit, or believe user data has been compromised, please bypass the standard grievance pipeline:
              </p>
              <ul className="text-[#FCA5A5] text-[13px] leading-[1.8] list-disc list-inside mb-[20px] space-y-1">
                <li>Send an email to <a href="mailto:grievance@trinetraedu-ai.com" className="text-[#EF4444] font-semibold hover:underline">grievance@trinetraedu-ai.com</a> with the subject line <strong>"URGENT: Security Issue"</strong>.</li>
                <li>Our incident management response team will acknowledge and address your report within **24 hours**.</li>
                <li>Please practice responsible disclosure and refrain from sharing details publicly before we release a patch.</li>
              </ul>
            </div>

            <hr className="border-[#1E0A35]" />

            {/* Section 6: Escalation */}
            <div>
              <h2 className="font-semibold text-[20px] text-[#FAF7FF] mb-[16px] flex items-center gap-[10px] tracking-tight">
                <Building className="w-5 h-5 text-[#A78BFA]" />
                6. Escalation Matrix & Legal Recourse
              </h2>
              <p className="mb-[20px]">
                If you are dissatisfied with our response, or if your concern is not resolved within the 30-day timeline, you may proceed with the following escalation steps:
              </p>

              <div className="space-y-[16px] mb-[24px]">
                <div className="flex gap-[16px] items-start border-l border-[#1E0A35] pl-[16px]">
                  <div className="w-[20px] h-[20px] rounded-full bg-[#A78BFA] text-[#0C0118] flex items-center justify-center font-bold text-[12px] flex-shrink-0 mt-[4px]">1</div>
                  <div>
                    <h4 className="text-[#FAF7FF] font-medium text-[15px] mb-[2px]">Internal Escalation</h4>
                    <p className="text-[#9A91B5] text-[13px] leading-relaxed">
                      Reply directly to your ticket requesting a senior manager review. The issue will be escalated to our legal department for secondary assessment.
                    </p>
                  </div>
                </div>

                <div className="flex gap-[16px] items-start border-l border-[#1E0A35] pl-[16px]">
                  <div className="w-[20px] h-[20px] rounded-full bg-[#A78BFA] text-[#0C0118] flex items-center justify-center font-bold text-[12px] flex-shrink-0 mt-[4px]">2</div>
                  <div>
                    <h4 className="text-[#FAF7FF] font-medium text-[15px] mb-[2px]">Regulatory Escalation (Data Protection Board of India)</h4>
                    <p className="text-[#9A91B5] text-[13px] leading-relaxed">
                      Under the DPDP Act 2023, if your complaint remains unresolved, you have the right to file an official complaint with the <strong>Data Protection Board of India (DPBI)</strong>. You can find their contact details and file complaints on the official DPBI portal.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-[#1E0A35]" />

            {/* Section 7: Grievance Officer Details */}
            <div>
              <h2 className="font-semibold text-[20px] text-[#FAF7FF] mb-[16px] flex items-center gap-[10px] tracking-tight">
                <User className="w-5 h-5 text-[#A78BFA]" />
                7. Official Grievance Officer Contact Details
              </h2>
              <p className="mb-[24px]">
                In compliance with the Information Technology Act 2000 and the Digital Personal Data Protection Act 2023, the contact details of our Grievance Officer are listed below:
              </p>

              <div className="space-y-[12px]">
                <p><strong>Designation:</strong> Grievance Officer</p>
                <p><strong>Email Address:</strong> <a href="mailto:grievance@trinetraedu-ai.com" className="text-[#A78BFA] hover:underline">grievance@trinetraedu-ai.com</a></p>
                <p><strong>Operational Jurisdiction:</strong> Kanpur, Uttar Pradesh, India</p>
              </div>
            </div>

            <hr className="border-[#1E0A35]" />

            {/* Legal Footnotes */}
            <div className="pt-[8px] opacity-60">
              <h5 className="text-[#FAF7FF] text-[13px] font-semibold mb-[12px] uppercase tracking-wider font-mono">Legal Citations & Regulatory References</h5>
              <ol className="text-[#9A91B5] text-[11px] leading-[1.7] list-decimal list-inside space-y-1.5">
                <li>Established under Section 8(10) of the Digital Personal Data Protection Act, 2023 (DPDP Act 2023), ensuring the right to register a grievance with data fiduciaries.</li>
                <li>Published in compliance with Rule 3(11) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 (IT Rules 2021).</li>
                <li>Aligned with the Consumer Protection Act, 2019 and rules thereunder for customer dispute redressal.</li>
              </ol>
            </div>

          </div>

        </div>
      </div>
    </Layout>
  );
}
