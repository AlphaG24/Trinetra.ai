"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Twitter,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { FacebookIcon } from "@/components/ui/FacebookIcon";
import { Layout } from "@/components/layout/Layout";
import { RedditIcon } from "@/components/ui/RedditIcon";
import {
  getConfigString,
  hasConfiguredValue,
  useActivePlans,
  useSiteConfig,
  useVisibleProducts,
} from "@/lib/site-content";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mjgnkbay";

export default function ContactPage() {
  const { data: siteConfig } = useSiteConfig();
  const { data: products, error: productsError } = useVisibleProducts();
  const { data: plans, error: plansError } = useActivePlans();
  const [honeypot, setHoneypot] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    interest: "",
    message: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState("");
  const [isCallbackSubmitting, setIsCallbackSubmitting] = useState(false);
  const [callbackStatus, setCallbackStatus] = useState<"idle" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [isFoundingInquiry, setIsFoundingInquiry] = useState(false);

  const companyEmail = getConfigString(siteConfig, "company_email");
  const phone1 = getConfigString(siteConfig, "company_phone_1");
  const phone2 = getConfigString(siteConfig, "company_phone_2");
  const linkedinUrl = getConfigString(siteConfig, "social_linkedin");
  const instagramUrl = getConfigString(siteConfig, "social_instagram");
  const twitterUrl = getConfigString(siteConfig, "social_twitter");
  const facebookUrl = getConfigString(siteConfig, "social_facebook");
  const redditUrl = getConfigString(siteConfig, "social_reddit");

  const dynamicProductOptions =
    products.length > 0
      ? products.map((product) => product.name)
      : productsError
        ? ["AI Voice Agent", "AI Workflow Agent"]
        : [];

  const dynamicPlanOptions =
    plans.length > 0
      ? plans.map((plan) => `${plan.name} Plan`)
      : plansError
        ? ["Starter Plan", "Professional Plan", "Enterprise Plan"]
        : [];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    const product = params.get("product");
    const source = params.get("source");

    let presetInterest = "";

    if (source === "founding") {
      presetInterest = "General Inquiry";
      setIsFoundingInquiry(true);
    } else {
      setIsFoundingInquiry(false);

      if (plan) {
        const matchedPlan = plans.find((item) => item.slug === plan);
        if (matchedPlan) {
          presetInterest = `${matchedPlan.name} Plan`;
        }
      } else if (product) {
        const matchedProduct = products.find((item) => item.slug === product);
        if (matchedProduct) {
          presetInterest = matchedProduct.name;
        }
      }
    }

    if (presetInterest) {
      setFormData((prev) => ({ ...prev, interest: presetInterest }));
    }
  }, [plans, products]);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    }

    if (!formData.interest) {
      newErrors.interest = "Please select an interest";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message cannot be empty";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (honeypot) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setButtonDisabled(true);

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitStatus("success");
        setFormData({
          name: "",
          email: "",
          phone: "",
          company: "",
          interest: "",
          message: "",
        });
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Failed to submit contact form", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
      window.setTimeout(() => {
        setButtonDisabled(false);
        setSubmitStatus("idle");
      }, 5000);
    }
  };

  const handleCallbackSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!callbackPhone) {
      return;
    }

    setIsCallbackSubmitting(true);
    setCallbackStatus("idle");

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formType: "Callback Request",
          phone: callbackPhone,
        }),
      });

      if (response.ok) {
        setCallbackStatus("success");
        window.setTimeout(() => {
          setIsModalOpen(false);
          setCallbackStatus("idle");
          setCallbackPhone("");
        }, 3000);
      } else {
        setCallbackStatus("error");
      }
    } catch (error) {
      console.error("Failed to submit callback request", error);
      setCallbackStatus("error");
    } finally {
      setIsCallbackSubmitting(false);
    }
  };

  const showComingSoonToast = () => {
    toast("Coming Soon! We're working on it.");
  };

  return (
    <Layout theme="vaakriti">
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#FAFAFA] text-[#0F172A] px-5 pb-24 pt-32 sm:pt-36">
        <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[58%_38%] lg:justify-between items-start">
          {/* Left Column: Form */}
          <motion.div
            id="contact-form-section"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col bg-white border border-[#E2E8F0] rounded-3xl p-8 sm:p-10 shadow-xs"
          >
            <div className="mb-5 inline-flex items-center gap-1.5 self-start rounded-full border border-[#2563EB]/25 bg-[#2563EB]/10 px-4 py-1.5 font-sans text-[12.5px] font-semibold text-[#2563EB]">
              <span>✦</span> Get in Touch
            </div>

            <h1 className="mb-3 font-sans text-[32px] sm:text-[40px] font-extrabold leading-tight tracking-tight text-[#0F172A]">
              Let&apos;s Build Something Together.
            </h1>

            <p className="mb-8 font-sans text-[15px] font-normal text-[#475569]">
              Tell us about your business and we&apos;ll show you how autonomous voice AI can help.
            </p>

            {isFoundingInquiry && (
              <div className="mb-5 inline-flex self-start rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 font-sans text-[13px] font-semibold text-amber-700">
                Founding Client Inquiry
              </div>
            )}

            <form className="flex flex-col gap-4.5" onSubmit={handleSubmit} noValidate>
              <input
                type="text"
                name="_honey"
                style={{ display: "none" }}
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    name="name"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full rounded-xl border px-4 py-3 font-sans text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] transition-all bg-[#FAFAFA] focus:bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 ${
                      errors.name ? "border-red-400" : "border-[#E2E8F0]"
                    }`}
                  />
                  {errors.name && (
                    <span className="px-1 font-sans text-[12px] text-red-500">{errors.name}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full rounded-xl border px-4 py-3 font-sans text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] transition-all bg-[#FAFAFA] focus:bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 ${
                      errors.email ? "border-red-400" : "border-[#E2E8F0]"
                    }`}
                  />
                  {errors.email && (
                    <span className="px-1 font-sans text-[12px] text-red-500">{errors.email}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full rounded-xl border px-4 py-3 font-sans text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] transition-all bg-[#FAFAFA] focus:bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 ${
                      errors.phone ? "border-red-400" : "border-[#E2E8F0]"
                    }`}
                  />
                  {errors.phone && (
                    <span className="px-1 font-sans text-[12px] text-red-500">{errors.phone}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    name="company"
                    placeholder="Company / Business Name"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] px-4 py-3 font-sans text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] transition-all focus:bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="relative">
                  <select
                    name="interest"
                    value={formData.interest}
                    onChange={handleInputChange}
                    className={`w-full cursor-pointer appearance-none rounded-xl border px-4 py-3 font-sans text-[15px] transition-all bg-[#FAFAFA] focus:bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 ${
                      errors.interest ? "border-red-400" : "border-[#E2E8F0]"
                    } ${formData.interest ? "text-[#0F172A]" : "text-[#94A3B8]"}`}
                  >
                    <option value="" disabled>
                      What are you interested in?
                    </option>
                    <option value="General Inquiry">General Inquiry</option>
                    {dynamicProductOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    {dynamicPlanOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    <option value="Partnership / Collaboration">Partnership / Collaboration</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B]">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                      <path
                        d="M1 1.5L6 6.5L11 1.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                {errors.interest && (
                  <span className="px-1 font-sans text-[12px] text-red-500">{errors.interest}</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <textarea
                  name="message"
                  placeholder="Tell us about your requirements or call flow..."
                  rows={4}
                  value={formData.message}
                  onChange={handleInputChange}
                  className={`w-full resize-none rounded-xl border px-4 py-3 font-sans text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] transition-all bg-[#FAFAFA] focus:bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 ${
                    errors.message ? "border-red-400" : "border-[#E2E8F0]"
                  }`}
                />
                {errors.message && (
                  <span className="px-1 font-sans text-[12px] text-red-500">{errors.message}</span>
                )}
              </div>

              {submitStatus === "success" && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[14px] font-semibold text-emerald-700">
                  <CheckCircle2 size={18} />
                  <span>Thank you! We&apos;ll get back to you within 24 hours.</span>
                </div>
              )}

              {submitStatus === "error" && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-600">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>
                    {companyEmail
                      ? `Something went wrong. Please try again or email us directly at ${companyEmail}`
                      : "Something went wrong. Please try again."}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={buttonDisabled || isSubmitting}
                className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-8 py-3.5 font-sans text-[15px] font-semibold text-white shadow-xs transition-all duration-200 hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#94A3B8]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message
                    <span className="transition-transform duration-200 group-hover:translate-x-1">
                      →
                    </span>
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Right Column: Contact Details */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex h-fit flex-col rounded-3xl border border-[#E2E8F0] bg-white p-8 sm:p-9 shadow-xs"
          >
            <h2 className="mb-6 font-sans text-[20px] font-bold text-[#0F172A]">
              Contact Information
            </h2>

            <div className="flex flex-col gap-5">
              {hasConfiguredValue(companyEmail) && (
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Email</div>
                    <a
                      href={`mailto:${companyEmail}`}
                      className="font-sans text-[14.5px] font-medium text-[#0F172A] hover:text-[#2563EB] transition-colors"
                    >
                      {companyEmail}
                    </a>
                  </div>
                </div>
              )}

              {(hasConfiguredValue(phone1) || hasConfiguredValue(phone2)) && (
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] shrink-0 mt-0.5">
                    <Phone size={18} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Call Us</span>
                    {hasConfiguredValue(phone1) && (
                      <a
                        href={`tel:${phone1.replace(/\s+/g, "")}`}
                        className="font-sans text-[14.5px] font-medium text-[#0F172A] hover:text-[#2563EB] transition-colors"
                      >
                        {phone1}
                      </a>
                    )}
                    {hasConfiguredValue(phone2) && (
                      <a
                        href={`tel:${phone2.replace(/\s+/g, "")}`}
                        className="font-sans text-[14.5px] font-medium text-[#0F172A] hover:text-[#2563EB] transition-colors"
                      >
                        {phone2}
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] shrink-0 mt-0.5">
                  <MapPin size={18} />
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Headquarters</span>
                  <p className="font-sans text-[14.5px] font-medium text-[#0F172A] leading-relaxed">
                    India (Remote-First Engineering & Telephony Network)
                  </p>
                </div>
              </div>
            </div>

            <div className="my-7 h-px w-full bg-[#E2E8F0]" />

            <h3 className="mb-4 font-sans text-[15px] font-bold text-[#0F172A]">
              Connect With Us
            </h3>
            <div className="flex items-center gap-3">
              {linkedinUrl && (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] text-[#475569] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                >
                  <Linkedin size={16} />
                </a>
              )}
              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] text-[#475569] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                >
                  <Instagram size={16} />
                </a>
              ) : (
                <button
                  type="button"
                  aria-label="Instagram"
                  title="Coming Soon"
                  onClick={showComingSoonToast}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] text-[#94A3B8] opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Instagram size={16} />
                </button>
              )}
              {twitterUrl ? (
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Twitter"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] text-[#475569] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                >
                  <Twitter size={16} />
                </a>
              ) : (
                <button
                  type="button"
                  aria-label="Twitter"
                  title="Coming Soon"
                  onClick={showComingSoonToast}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] text-[#94A3B8] opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Twitter size={16} />
                </button>
              )}
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] text-[#475569] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                >
                  <FacebookIcon size={16} />
                </a>
              )}
              {redditUrl && (
                <a
                  href={redditUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Reddit"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] text-[#475569] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                >
                  <RedditIcon size={16} />
                </a>
              )}
            </div>

            <div className="my-7 h-px w-full bg-[#E2E8F0]" />

            <h3 className="mb-2 font-sans text-[15px] font-bold text-[#0F172A]">
              Direct WhatsApp Support
            </h3>
            <p className="mb-4 font-sans text-[13.5px] text-[#64748B] leading-relaxed">
              Prefer instant messaging? Connect with our enterprise team on WhatsApp.
            </p>

            <a
              href="https://wa.me/919580619562?text=Hi%2C+I+want+to+know+more+about+Vaakriti+AI"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-5 py-3 font-sans text-[14px] font-semibold text-[#0F172A] shadow-2xs transition-all hover:border-[#2563EB] hover:text-[#2563EB]"
            >
              Chat on WhatsApp →
            </a>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
