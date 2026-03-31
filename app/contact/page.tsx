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

const FORMSPREE_ENDPOINT =
  process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT || "https://formspree.io/f/placeholder";

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
        ? ["AI Voice Agent", "AI Chat Agent", "AI Social Media Agent", "AI Workflow Agent"]
        : [];

  const dynamicPlanOptions =
    plans.length > 0
      ? plans.map((plan) => `${plan.name} Plan`)
      : plansError
        ? ["Starter Plan", "Growth Plan", "Scale Plan"]
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
        } else if (plan === "starter") {
          presetInterest = "Starter Plan";
        } else if (plan === "growth") {
          presetInterest = "Growth Plan";
        } else if (plan === "scale") {
          presetInterest = "Scale Plan";
        }
      }

      if (product) {
        const matchedProduct = products.find((item) => item.slug === product);
        if (matchedProduct) {
          presetInterest = matchedProduct.name;
        } else if (product === "voice-agent") {
          presetInterest = "AI Voice Agent";
        } else if (product === "chat-agent") {
          presetInterest = "AI Chat Agent";
        } else if (product === "social-agent") {
          presetInterest = "AI Social Media Agent";
        } else if (product === "workflow-agent") {
          presetInterest = "AI Workflow Agent";
        }
      }
    }

    if (!presetInterest) {
      return;
    }

    setFormData((prev) =>
      prev.interest === presetInterest ? prev : { ...prev, interest: presetInterest }
    );
  }, [plans, products]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    const phoneRegex = /^[\d\s\-+()]+$/;
    const digitCount = formData.phone.replace(/\D/g, "").length;
    if (!formData.phone || !phoneRegex.test(formData.phone) || digitCount < 10) {
      newErrors.phone = "Phone number must contain at least 10 digits.";
    }

    if (!formData.interest) {
      newErrors.interest = "Please select an area of interest.";
    }

    if (!formData.message || formData.message.length < 10) {
      newErrors.message = "Message must be at least 10 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (honeypot || !validateForm()) {
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

  const scrollToForm = () => {
    document
      .getElementById("contact-form-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const showComingSoonToast = () => {
    toast("Coming Soon! We're working on it.");
  };

  return (
    <Layout>
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#080010] px-[20px] pb-[100px] pt-[140px]">
        <div className="relative z-10 mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-[60px] lg:grid-cols-[55%_40%] lg:justify-between">
          <motion.div
            id="contact-form-section"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col lg:-mt-[56px]"
          >
            <div className="mb-[24px] inline-block self-start rounded-full border border-[rgba(139,92,246,0.15)] bg-[rgba(139,92,246,0.1)] px-[16px] py-[6px] font-sans text-[13px] font-medium text-[#A78BFA]">
              Get in Touch
            </div>

            <h1 className="mb-[16px] font-display text-[36px] font-bold leading-tight tracking-[-0.02em] text-[#F5F3FF] md:text-[44px]">
              Let&apos;s Build Something Together.
            </h1>

            <p className="mb-[36px] font-sans text-[16px] font-normal text-[#A8A0C0]">
              Tell us about your business and we&apos;ll show you how AI can help.
            </p>

            {isFoundingInquiry ? (
              <div className="mb-[20px] inline-flex self-start rounded-[10px] border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.08)] px-[14px] py-[8px] font-sans text-[13px] font-medium text-[#FBBF24]">
                Founding Client Inquiry
              </div>
            ) : null}

            <form className="flex flex-col gap-[20px]" onSubmit={handleSubmit} noValidate>
              <input
                type="text"
                name="_honey"
                style={{ display: "none" }}
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />

              <div className="grid grid-cols-1 gap-[20px] md:grid-cols-2">
                <div className="flex flex-col gap-[6px]">
                  <input
                    type="text"
                    name="name"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full rounded-[10px] border px-[16px] py-[14px] font-sans text-[16px] font-normal text-[#F5F3FF] placeholder:text-[#6B6088] transition-all duration-300 focus:border-[#8B5CF6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] ${
                      errors.name ? "border-[#EF4444]" : "border-[#1E0A35]"
                    } bg-[#130224]`}
                  />
                  {errors.name ? (
                    <span className="px-[4px] font-sans text-[13px] text-[#EF4444]">
                      {errors.name}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col gap-[6px]">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full rounded-[10px] border px-[16px] py-[14px] font-sans text-[16px] font-normal text-[#F5F3FF] placeholder:text-[#6B6088] transition-all duration-300 focus:border-[#8B5CF6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] ${
                      errors.email ? "border-[#EF4444]" : "border-[#1E0A35]"
                    } bg-[#130224]`}
                  />
                  {errors.email ? (
                    <span className="px-[4px] font-sans text-[13px] text-[#EF4444]">
                      {errors.email}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-[20px] md:grid-cols-2">
                <div className="flex flex-col gap-[6px]">
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full rounded-[10px] border px-[16px] py-[14px] font-sans text-[16px] font-normal text-[#F5F3FF] placeholder:text-[#6B6088] transition-all duration-300 focus:border-[#8B5CF6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] ${
                      errors.phone ? "border-[#EF4444]" : "border-[#1E0A35]"
                    } bg-[#130224]`}
                  />
                  {errors.phone ? (
                    <span className="px-[4px] font-sans text-[13px] text-[#EF4444]">
                      {errors.phone}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col gap-[6px]">
                  <input
                    type="text"
                    name="company"
                    placeholder="Company / Business Name"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full rounded-[10px] border border-[#1E0A35] bg-[#130224] px-[16px] py-[14px] font-sans text-[16px] font-normal text-[#F5F3FF] placeholder:text-[#6B6088] transition-all duration-300 focus:border-[#8B5CF6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-[6px]">
                <div className="relative">
                  <select
                    name="interest"
                    value={formData.interest}
                    onChange={handleInputChange}
                    className={`w-full cursor-pointer appearance-none rounded-[10px] border px-[16px] py-[14px] font-sans text-[16px] font-normal transition-all duration-300 focus:border-[#8B5CF6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] ${
                      errors.interest ? "border-[#EF4444]" : "border-[#1E0A35]"
                    } ${formData.interest ? "text-[#F5F3FF]" : "text-[#6B6088]"} bg-[#130224]`}
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
                  <div className="pointer-events-none absolute right-[16px] top-1/2 -translate-y-1/2 text-[#6B6088]">
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
                {errors.interest ? (
                  <span className="px-[4px] font-sans text-[13px] text-[#EF4444]">
                    {errors.interest}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-[6px]">
                <textarea
                  name="message"
                  placeholder="Message details..."
                  rows={4}
                  value={formData.message}
                  onChange={handleInputChange}
                  className={`w-full resize-none rounded-[10px] border px-[16px] py-[14px] font-sans text-[16px] font-normal text-[#F5F3FF] placeholder:text-[#6B6088] transition-all duration-300 focus:border-[#8B5CF6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] ${
                    errors.message ? "border-[#EF4444]" : "border-[#1E0A35]"
                  } bg-[#130224]`}
                />
                {errors.message ? (
                  <span className="px-[4px] font-sans text-[13px] text-[#EF4444]">
                    {errors.message}
                  </span>
                ) : null}
              </div>

              {submitStatus === "success" ? (
                <div className="flex items-center gap-[8px] rounded-[8px] border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.1)] px-[16px] py-[12px] text-[15px] font-medium text-[#10B981]">
                  <CheckCircle2 size={20} />
                  <span>Thank you! We&apos;ll get back to you within 24 hours.</span>
                </div>
              ) : null}

              {submitStatus === "error" ? (
                <div className="flex items-center gap-[8px] rounded-[8px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.1)] px-[16px] py-[12px] text-[15px] font-medium text-[#EF4444]">
                  <AlertCircle size={20} className="shrink-0" />
                  <span>
                    {companyEmail
                      ? `Something went wrong. Please try again or email us directly at ${companyEmail}`
                      : "Something went wrong. Please try again."}
                  </span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={buttonDisabled || isSubmitting}
                className="group mt-[12px] flex w-full items-center justify-center gap-[8px] rounded-[12px] bg-[#F59E0B] px-[32px] py-[15px] font-sans text-[16px] font-semibold text-[#080010] shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all duration-300 hover:-translate-y-[2px] hover:bg-[#D97706] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] disabled:cursor-not-allowed disabled:bg-[#A8A0C0] disabled:hover:translate-y-0 disabled:hover:bg-[#A8A0C0] disabled:hover:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      {"->"}
                    </span>
                  </>
                )}
              </button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex h-fit flex-col rounded-[16px] border border-[#1E0A35] bg-[#130224] p-[36px] shadow-[0_0_40px_rgba(139,92,246,0.05)]"
          >
            <h2 className="mb-[28px] font-display text-[20px] font-semibold text-[#F5F3FF]">
              Contact Information
            </h2>

            <div className="flex flex-col gap-[20px]">
              {hasConfiguredValue(companyEmail) ? (
                <div className="flex items-center gap-[16px]">
                  <Mail size={20} className="shrink-0 text-[#8B5CF6]" />
                  <a
                    href={`mailto:${companyEmail}`}
                    className="font-sans text-[15px] font-normal text-[#A8A0C0] transition-colors hover:text-[#F5F3FF]"
                  >
                    {companyEmail}
                  </a>
                </div>
              ) : null}

              {hasConfiguredValue(phone1) || hasConfiguredValue(phone2) ? (
                <div className="flex items-start gap-[16px]">
                  <Phone size={20} className="mt-[2px] shrink-0 text-[#8B5CF6]" />
                  <div className="flex flex-col gap-[10px]">
                    <span className="font-sans text-[15px] font-medium text-[#F5F3FF]">Call Us</span>
                    {hasConfiguredValue(phone1) ? (
                      <a
                        href={`tel:${phone1.replace(/\s+/g, "")}`}
                        className="font-sans text-[15px] font-normal text-[#A8A0C0] transition-colors hover:text-[#F5F3FF]"
                      >
                        {"\u{1F4DE}"} {phone1}
                      </a>
                    ) : null}
                    {hasConfiguredValue(phone2) ? (
                      <a
                        href={`tel:${phone2.replace(/\s+/g, "")}`}
                        className="font-sans text-[15px] font-normal text-[#A8A0C0] transition-colors hover:text-[#F5F3FF]"
                      >
                        {"\u{1F4DE}"} {phone2}
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="flex items-start gap-[16px]">
                <MapPin size={20} className="mt-[2px] shrink-0 text-[#8B5CF6]" />
                <span className="font-sans text-[15px] font-normal leading-[1.6] text-[#A8A0C0]">
                  India
                  <br />
                  (Remote-First Across Regions)
                </span>
              </div>
            </div>

            <div className="my-[28px] h-[1px] w-full bg-[#1E0A35]" />

            <h3 className="mb-[20px] font-display text-[16px] font-semibold text-[#F5F3FF]">
              Connect With Us
            </h3>
            <div className="flex items-center gap-[16px]">
              {linkedinUrl ? (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF]"
                >
                  <Linkedin size={18} />
                </a>
              ) : null}
              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF]"
                >
                  <Instagram size={18} />
                </a>
              ) : (
                <button
                  type="button"
                  aria-label="Instagram"
                  title="Coming Soon"
                  onClick={showComingSoonToast}
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] opacity-50 transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF]"
                >
                  <Instagram size={18} />
                </button>
              )}
              {twitterUrl ? (
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Twitter"
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF]"
                >
                  <Twitter size={18} />
                </a>
              ) : (
                <button
                  type="button"
                  aria-label="Twitter"
                  title="Coming Soon"
                  onClick={showComingSoonToast}
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] opacity-50 transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF]"
                >
                  <Twitter size={18} />
                </button>
              )}
              {facebookUrl ? (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF]"
                >
                  <FacebookIcon size={18} />
                </a>
              ) : (
                <button
                  type="button"
                  aria-label="Facebook"
                  title="Coming Soon"
                  onClick={showComingSoonToast}
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] opacity-50 transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF]"
                >
                  <FacebookIcon size={18} />
                </button>
              )}
              {redditUrl ? (
                <a
                  href={redditUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Reddit"
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF]"
                >
                  <RedditIcon size={18} />
                </a>
              ) : (
                <button
                  type="button"
                  aria-label="Reddit"
                  title="Coming Soon"
                  onClick={showComingSoonToast}
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-transparent text-[#6B6088] opacity-50 transition-colors duration-300 hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF]"
                >
                  <RedditIcon size={18} />
                </button>
              )}
            </div>

            <div className="my-[28px] h-[1px] w-full bg-[#1E0A35]" />

            <h3 className="mb-[12px] font-display text-[16px] font-semibold text-[#F5F3FF]">
              Get In Touch
            </h3>
            <p className="mb-[24px] font-sans text-[14px] font-normal leading-[1.6] text-[#A8A0C0]">
              Ready to talk through your requirements? Jump straight to the form and we&apos;ll
              respond quickly.
            </p>

            <button
              type="button"
              onClick={scrollToForm}
              className="group flex w-full items-center justify-center gap-[8px] rounded-[10px] border border-[#8B5CF6] bg-transparent px-[24px] py-[13px] font-sans text-[15px] font-medium text-[#A78BFA] shadow-[0_0_20px_rgba(139,92,246,0.1)] transition-all duration-300 hover:bg-[#8B5CF6] hover:text-[#080010] hover:shadow-[0_0_30px_rgba(139,92,246,0.25)]"
            >
              Get In Touch
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 flex w-full items-center justify-center font-sans text-[14px] font-medium text-[#6B6088] transition-colors hover:text-[#A8A0C0]"
            >
              Prefer a callback instead?
            </button>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen ? (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(8,0,16,0.8)] p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-[400px] rounded-[20px] border border-[#2D1255] bg-[#130224] p-[32px] shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 text-[#6B6088] transition-colors hover:text-[#F5F3FF]"
                title="Close"
              >
                <X size={20} />
              </button>

              <h3 className="mb-2 font-display text-[22px] font-semibold text-[#F5F3FF]">
                Schedule a Demo Call
              </h3>
              <p className="mb-6 font-sans text-[15px] leading-[1.6] text-[#A8A0C0]">
                Prefer to talk to a human later? Leave your number and our sales team will call
                you back within 2 hours.
              </p>

              <form onSubmit={handleCallbackSubmit} className="flex flex-col gap-4">
                <input
                  type="tel"
                  placeholder="Your phone number"
                  value={callbackPhone}
                  onChange={(event) => setCallbackPhone(event.target.value)}
                  className="w-full rounded-[10px] border border-[#2D1255] bg-[#0C0118] px-[16px] py-[14px] text-[#F5F3FF] placeholder:text-[#6B6088] outline-none transition-colors focus:border-[#8B5CF6]"
                  required
                />
                <button
                  type="submit"
                  disabled={isCallbackSubmitting}
                  className="flex w-full items-center justify-center rounded-[10px] bg-[#8B5CF6] py-[14px] font-semibold text-white shadow-lg transition-colors hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCallbackSubmitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    "Request Callback"
                  )}
                </button>
              </form>

              {callbackStatus === "success" ? (
                <p className="mt-4 flex items-center justify-center gap-2 text-center text-[14px] font-medium text-[#10B981]">
                  <CheckCircle2 size={16} /> Request Received
                </p>
              ) : null}

              {callbackStatus === "error" ? (
                <p className="mt-4 flex items-center justify-center gap-2 text-center text-[14px] font-medium text-[#EF4444]">
                  <AlertCircle size={16} /> System error occurred.
                </p>
              ) : null}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </Layout>
  );
}
