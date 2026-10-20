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
          details: formData.additionalDetails,
          submittedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast.success("Your grievance has been submitted successfully.");
      } else {
        toast.error("Failed to submit grievance. Please email us directly.");
      }
    } catch {
      toast.error("Network error. Please try again or email us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col bg-[#FAFAFA] min-h-screen pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
        <div className="max-w-5xl lg:max-w-6xl mx-auto w-full relative z-10 flex flex-col">

          {/* Header */}
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#0F172A] tracking-tight mb-3 text-center">
            Grievance Redressal
          </h1>
          <p className="text-center text-[#64748B] max-w-[600px] mx-auto leading-relaxed mb-10 text-sm sm:text-base">
            We value your trust and are committed to resolving your concerns promptly and fairly.
            Read our grievance framework or submit a ticket directly to our compliance officer.
          </p>

          {/* Unified Content Card */}
          <div className="w-full bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-12 shadow-xs space-y-10 text-[#334155] text-sm sm:text-[15px] leading-relaxed">

            {/* Section 1: Intro */}
            <div>
              <h2 className="font-bold text-lg sm:text-xl text-[#0F172A] mb-4 flex items-center gap-2.5 tracking-tight">
                <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
                1. Our Commitment to Your Rights
              </h2>
              <p className="mb-4">
                At Vaakriti AI, we aim to build a transparent and secure AI voice ecosystem. We respect your control over your personal information and recognize your legal right to voice any grievances or concerns regarding how we process, store, or protect your data.
              </p>
              <p>
                This mechanism has been established to ensure you have a clear, reliable path to seek resolution for any data privacy, security, or service discrepancies on our platform.
              </p>
            </div>

            <hr className="border-[#E2E8F0]" />

            {/* Section 2: What You Can Complain About */}
            <div>
              <h2 className="font-bold text-lg sm:text-xl text-[#0F172A] mb-4 flex items-center gap-2.5 tracking-tight">
                <HelpCircle className="w-5 h-5 text-[#2563EB]" />
                2. What You Can Complain About
              </h2>
              <p className="mb-6">
                We handle complaints and queries relating to the following matters:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
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
                  <div key={index} className="flex flex-col border-l-2 border-slate-200 pl-4 py-1">
                    <h3 className="text-[#0F172A] font-semibold text-sm mb-1 flex items-center gap-2">
                      {item.title}
                    </h3>
                    <p className="text-[#64748B] text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-[#E2E8F0]" />

            {/* Section 3: How to Submit a Grievance */}
            <div>
              <h2 className="font-bold text-lg sm:text-xl text-[#0F172A] mb-4 flex items-center gap-2.5 tracking-tight">
                <FileText className="w-5 h-5 text-[#2563EB]" />
                3. How to Submit
              </h2>
              <p className="mb-6">
                We provide two secure ways to raise a grievance. Send an email directly to <a href="mailto:grievance@vaakriti.com" className="text-[#2563EB] hover:underline font-semibold">grievance@vaakriti.com</a>, or fill out the official online submission portal below.
              </p>

              {/* Submission Form Area */}
              <div className="mt-6 pt-2">
                {isSubmitted ? (
                  <div className="flex flex-col items-center justify-center text-center py-10 bg-emerald-50/50 border border-emerald-200 rounded-2xl px-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-[#0F172A] font-bold text-lg mb-2">Grievance Submitted</h3>
                    <p className="text-[#64748B] text-sm leading-relaxed mb-6 max-w-md">
                      Thank you. Your grievance has been submitted successfully. We will review your concern and get back to you shortly.
                    </p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-[#2563EB] hover:underline text-sm font-semibold flex items-center gap-1.5"
                    >
                      Submit another concern
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-xl mx-auto bg-slate-50/50 border border-slate-200 p-6 sm:p-8 rounded-2xl">
                    <div>
                      <label htmlFor="fullName" className="block text-[#0F172A] text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" /> Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        required
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full bg-white border border-slate-200 text-[#0F172A] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#2563EB]"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-[#0F172A] text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" /> Registered Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="e.g. rahul@company.com"
                        className="w-full bg-white border border-slate-200 text-[#0F172A] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#2563EB]"
                      />
                    </div>

                    <div>
                      <label htmlFor="grievanceType" className="block text-[#0F172A] text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-500" /> Grievance Classification <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="grievanceType"
                        name="grievanceType"
                        value={formData.grievanceType}
                        onChange={handleChange}
                        className="w-full bg-white border border-slate-200 text-[#0F172A] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#2563EB]"
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
                      <label htmlFor="description" className="block text-[#0F172A] text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-500" /> Detailed Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        required
                        rows={4}
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Please explain the details of your grievance here..."
                        className="w-full bg-white border border-slate-200 text-[#0F172A] rounded-xl px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#2563EB] resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isSubmitting ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

            <hr className="border-[#E2E8F0]" />

            {/* Section 4: Process timeline & tracking */}
            <div>
              <h2 className="font-bold text-lg sm:text-xl text-[#0F172A] mb-4 flex items-center gap-2.5 tracking-tight">
                <Clock className="w-5 h-5 text-[#2563EB]" />
                4. Turnaround Timelines & Resolution Process
              </h2>
              <p className="mb-6">
                We investigate every ticket systematically to provide root-cause solutions. Once a ticket is generated, the process moves according to the following stages:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col border-l-2 border-slate-200 pl-4">
                  <span className="text-xs text-[#2563EB] font-mono tracking-wider uppercase mb-1 font-bold">Step 1</span>
                  <h4 className="text-[#0F172A] font-semibold text-sm mb-1">Acknowledgment</h4>
                  <span className="text-[#2563EB] font-bold text-xs mb-1 block">Within 72 Hours</span>
                  <p className="text-[#64748B] text-xs leading-relaxed">
                    You receive an acknowledgment email containing your unique Ticket ID. Save this ID for references and follow-ups.
                  </p>
                </div>

                <div className="flex flex-col border-l-2 border-slate-200 pl-4">
                  <span className="text-xs text-[#2563EB] font-mono tracking-wider uppercase mb-1 font-bold">Step 2</span>
                  <h4 className="text-[#0F172A] font-semibold text-sm mb-1">Initial Assessment</h4>
                  <span className="text-[#2563EB] font-bold text-xs mb-1 block">Within 15 Days</span>
                  <p className="text-[#64748B] text-xs leading-relaxed">
                    Our compliance team completes the preliminary analysis and requests further documentation or clarifications if needed.
                  </p>
                </div>

                <div className="flex flex-col border-l-2 border-slate-200 pl-4">
                  <span className="text-xs text-[#2563EB] font-mono tracking-wider uppercase mb-1 font-bold">Step 3</span>
                  <h4 className="text-[#0F172A] font-semibold text-sm mb-1">Final Resolution</h4>
                  <span className="text-[#2563EB] font-bold text-xs mb-1 block">Within 30 Days</span>
                  <p className="text-[#64748B] text-xs leading-relaxed">
                    A comprehensive resolution or a justified decision letter is sent to your registered address, closing the ticket.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-[#E2E8F0]" />

            {/* Section 5: Urgent Security Issues */}
            <div className="border-l-4 border-rose-500 pl-4 py-3 bg-rose-50/60 rounded-r-xl">
              <h2 className="font-bold text-lg text-rose-900 mb-2 flex items-center gap-2 tracking-tight">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                5. Urgent Security & Vulnerability Disclosures
              </h2>
              <p className="text-rose-950 text-sm leading-relaxed mb-3">
                If you suspect a vulnerability, have discovered an active security exploit, or believe user data has been compromised, please bypass the standard grievance pipeline:
              </p>
              <ul className="text-rose-900 text-xs sm:text-sm leading-relaxed list-disc list-inside space-y-1">
                <li>Send an email to <a href="mailto:grievance@vaakriti.com" className="text-rose-700 font-bold hover:underline">grievance@vaakriti.com</a> with the subject line <strong>&ldquo;URGENT: Security Issue&rdquo;</strong>.</li>
                <li>Our incident management response team will acknowledge and address your report within <strong>24 hours</strong>.</li>
                <li>Please practice responsible disclosure and refrain from sharing details publicly before we release a patch.</li>
              </ul>
            </div>

            <hr className="border-[#E2E8F0]" />

            {/* Section 6: Escalation */}
            <div>
              <h2 className="font-bold text-lg sm:text-xl text-[#0F172A] mb-4 flex items-center gap-2.5 tracking-tight">
                <Building className="w-5 h-5 text-[#2563EB]" />
                6. Escalation Matrix & Legal Recourse
              </h2>
              <p className="mb-4">
                If you are dissatisfied with our response, or if your concern is not resolved within the 30-day timeline, you may proceed with the following escalation steps:
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex gap-4 items-start border-l-2 border-slate-200 pl-4">
                  <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">1</div>
                  <div>
                    <h4 className="text-[#0F172A] font-semibold text-sm mb-1">Internal Escalation</h4>
                    <p className="text-[#64748B] text-xs sm:text-sm leading-relaxed">
                      Reply directly to your ticket requesting a senior manager review. The issue will be escalated to our legal department for secondary assessment.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start border-l-2 border-slate-200 pl-4">
                  <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">2</div>
                  <div>
                    <h4 className="text-[#0F172A] font-semibold text-sm mb-1">Regulatory Escalation (Data Protection Board of India)</h4>
                    <p className="text-[#64748B] text-xs sm:text-sm leading-relaxed">
                      Under the DPDP Act 2023, if your complaint remains unresolved, you have the right to file an official complaint with the <strong>Data Protection Board of India (DPBI)</strong>. You can find their contact details and file complaints on the official DPBI portal.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-[#E2E8F0]" />

            {/* Section 7: Grievance Officer Details */}
            <div>
              <h2 className="font-bold text-lg sm:text-xl text-[#0F172A] mb-4 flex items-center gap-2.5 tracking-tight">
                <User className="w-5 h-5 text-[#2563EB]" />
                7. Official Grievance Officer Contact Details
              </h2>
              <p className="mb-4">
                In compliance with the Information Technology Act 2000 and the Digital Personal Data Protection Act 2023, the contact details of our Grievance Officer are listed below:
              </p>

              <div className="space-y-2 text-sm text-[#334155]">
                <p><strong>Designation:</strong> Grievance Officer</p>
                <p><strong>Email Address:</strong> <a href="mailto:grievance@vaakriti.com" className="text-[#2563EB] hover:underline font-semibold">grievance@vaakriti.com</a></p>
                <p><strong>Operational Jurisdiction:</strong> Kanpur, Uttar Pradesh, India</p>
              </div>
            </div>

            <hr className="border-[#E2E8F0]" />

            {/* Legal Footnotes */}
            <div className="pt-2">
              <h5 className="text-[#0F172A] text-xs font-bold mb-3 uppercase tracking-wider font-mono">Legal Citations & Regulatory References</h5>
              <ol className="text-[#64748B] text-xs leading-relaxed list-decimal list-inside space-y-1.5">
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
