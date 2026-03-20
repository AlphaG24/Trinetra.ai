"use client";

import { Layout } from "@/components/layout/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, MapPin, Twitter, Facebook, Instagram, CheckCircle2, Loader2, AlertCircle, X, PhoneOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useVapi } from "@/hooks/use-vapi";

// Formspree Endpoint (User can inject their specific ID into their real env)
const FORMSPREE_ENDPOINT = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT || "https://formspree.io/f/placeholder";

export default function ContactPage() {
  const { toggleCall, isConnecting, isConnected } = useVapi();
  const [honeypot, setHoneypot] = useState("");
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    interest: "",
    message: ""
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState("");
  const [isCallbackSubmitting, setIsCallbackSubmitting] = useState(false);
  const [callbackStatus, setCallbackStatus] = useState<"idle" | "success" | "error">("idle");

  // Validation State
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [buttonDisabled, setButtonDisabled] = useState(false);

  // URL Auto-Select logic
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const plan = params.get('plan');
      
      if (plan === 'starter') setFormData(prev => ({ ...prev, interest: 'Starter Plan' }));
      if (plan === 'growth') setFormData(prev => ({ ...prev, interest: 'Growth Plan' }));
      if (plan === 'enterprise') setFormData(prev => ({ ...prev, interest: 'Enterprise Plan' }));
    }
  }, []);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    const digitCount = formData.phone.replace(/\D/g, '').length;
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; 

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setButtonDisabled(true);

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitStatus("success");
        setFormData({ name: "", email: "", phone: "", company: "", interest: "", message: "" });
      } else {
        setSubmitStatus("error");
      }
    } catch (err) {
      console.error(err);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setButtonDisabled(false);
        setSubmitStatus("idle");
      }, 5000);
    }
  };

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callbackPhone) return;
    
    setIsCallbackSubmitting(true);
    setCallbackStatus("idle");

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ formType: "Callback Request", phone: callbackPhone })
      });
      if (response.ok) {
        setCallbackStatus("success");
        setTimeout(() => {
          setIsModalOpen(false);
          setCallbackStatus("idle");
          setCallbackPhone("");
        }, 3000);
      } else {
        setCallbackStatus("error");
      }
    } catch (err) {
      setCallbackStatus("error");
    } finally {
      setIsCallbackSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col bg-[#080010] min-h-screen pt-[140px] pb-[100px] px-[20px] relative overflow-hidden">
        <div className="max-w-[1200px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[55%_40%] lg:justify-between gap-[60px] relative z-10">
          
          {/* LEFT COLUMN: CONTACT FORM */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col lg:-mt-[56px]"
          >
            <div className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#A78BFA] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px] self-start">
              ✦ Get in Touch
            </div>
            
            <h1 className="font-display font-bold text-[36px] md:text-[44px] text-[#F5F3FF] tracking-[-0.02em] leading-tight mb-[16px]">
              Let's Build Something Together.
            </h1>
            
            <p className="font-sans font-normal text-[16px] text-[#A8A0C0] mb-[36px]">
              Tell us about your business and we'll show you how AI can help.
            </p>

            <form className="flex flex-col gap-[20px]" onSubmit={handleSubmit} noValidate>
              <input 
                type="text" 
                name="_honey" 
                style={{ display: "none" }} 
                tabIndex={-1} 
                autoComplete="off" 
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
                <div className="flex flex-col gap-[6px]">
                  <input 
                    type="text" 
                    name="name"
                    placeholder="Full Name" 
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full bg-[#130224] border ${errors.name ? 'border-[#EF4444]' : 'border-[#1E0A35]'} rounded-[10px] px-[16px] py-[14px] font-sans font-normal text-[16px] text-[#F5F3FF] placeholder:text-[#6B6088] focus:border-[#8B5CF6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] transition-all duration-300`}
                  />
                  {errors.name && <span className="text-[#EF4444] text-[13px] font-sans px-[4px]">{errors.name}</span>}
                </div>
                
                <div className="flex flex-col gap-[6px]">
                  <input 
                    type="email"
                    name="email" 
                    placeholder="Email Address" 
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full bg-[#130224] border ${errors.email ? 'border-[#EF4444]' : 'border-[#1E0A35]'} rounded-[10px] px-[16px] py-[14px] font-sans font-normal text-[16px] text-[#F5F3FF] placeholder:text-[#6B6088] focus:border-[#8B5CF6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] transition-all duration-300`}
                  />
                  {errors.email && <span className="text-[#EF4444] text-[13px] font-sans px-[4px]">{errors.email}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
                <div className="flex flex-col gap-[6px]">
                  <input 
                    type="tel" 
                    name="phone"
                    placeholder="Phone Number" 
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full bg-[#130224] border ${errors.phone ? 'border-[#EF4444]' : 'border-[#1E0A35]'} rounded-[10px] px-[16px] py-[14px] font-sans font-normal text-[16px] text-[#F5F3FF] placeholder:text-[#6B6088] focus:border-[#8B5CF6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] transition-all duration-300`}
                  />
                  {errors.phone && <span className="text-[#EF4444] text-[13px] font-sans px-[4px]">{errors.phone}</span>}
                </div>
                
                <div className="flex flex-col gap-[6px]">
                  <input 
                    type="text" 
                    name="company"
                    placeholder="Company / Business Name" 
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full bg-[#130224] border border-[#1E0A35] rounded-[10px] px-[16px] py-[14px] font-sans font-normal text-[16px] text-[#F5F3FF] placeholder:text-[#6B6088] focus:border-[#8B5CF6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] transition-all duration-300"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-[6px]">
                <div className="relative">
                  <select 
                    name="interest"
                    value={formData.interest}
                    onChange={handleInputChange}
                    className={`w-full bg-[#130224] border ${errors.interest ? 'border-[#EF4444]' : 'border-[#1E0A35]'} rounded-[10px] px-[16px] py-[14px] font-sans font-normal text-[16px] ${formData.interest ? 'text-[#F5F3FF]' : 'text-[#6B6088]'} focus:border-[#8B5CF6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] transition-all duration-300 appearance-none cursor-pointer`}
                  >
                    <option value="" disabled>What are you interested in?</option>
                    <option value="Starter Plan">Starter Plan</option>
                    <option value="Growth Plan">Growth Plan</option>
                    <option value="Enterprise Plan">Enterprise Plan</option>
                    <option value="AI Voice Agent">AI Voice Agent</option>
                    <option value="AI Chat Agent">AI Chat Agent</option>
                    <option value="AI Social Media Agent">AI Social Media Agent</option>
                    <option value="Custom Solution">Custom Solution</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="absolute right-[16px] top-1/2 -translate-y-1/2 pointer-events-none text-[#6B6088]">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                {errors.interest && <span className="text-[#EF4444] text-[13px] font-sans px-[4px]">{errors.interest}</span>}
              </div>

              <div className="flex flex-col gap-[6px]">
                <textarea 
                  name="message"
                  placeholder="Message details..." 
                  rows={4}
                  value={formData.message}
                  onChange={handleInputChange}
                  className={`w-full bg-[#130224] border ${errors.message ? 'border-[#EF4444]' : 'border-[#1E0A35]'} rounded-[10px] px-[16px] py-[14px] font-sans font-normal text-[16px] text-[#F5F3FF] placeholder:text-[#6B6088] focus:border-[#8B5CF6] focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] transition-all duration-300 resize-none`}
                />
                {errors.message && <span className="text-[#EF4444] text-[13px] font-sans px-[4px]">{errors.message}</span>}
              </div>

              {/* Status Messages */}
              {submitStatus === "success" && (
                <div className="flex items-center gap-[8px] text-[#10B981] font-medium text-[15px] bg-[rgba(16,185,129,0.1)] px-[16px] py-[12px] rounded-[8px] border border-[rgba(16,185,129,0.2)]">
                  <CheckCircle2 size={20} />
                  <span>Thank you! We'll get back to you within 24 hours.</span>
                </div>
              )}

              {submitStatus === "error" && (
                <div className="flex items-center gap-[8px] text-[#EF4444] font-medium text-[15px] bg-[rgba(239,68,68,0.1)] px-[16px] py-[12px] rounded-[8px] border border-[rgba(239,68,68,0.2)]">
                  <AlertCircle size={20} className="shrink-0" />
                  <span>Something went wrong. Please try again or email us directly at trinetraedu.ai@gmail.com</span>
                </div>
              )}
              
              <button 
                type="submit"
                disabled={buttonDisabled || isSubmitting}
                className="w-full mt-[12px] group flex items-center justify-center gap-[8px] px-[32px] py-[15px] bg-[#F59E0B] disabled:bg-[#A8A0C0] text-[#080010] font-sans font-semibold text-[16px] rounded-[12px] transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:bg-[#D97706] disabled:hover:bg-[#A8A0C0] disabled:hover:shadow-none disabled:hover:-translate-y-0 disabled:cursor-not-allowed hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:-translate-y-[2px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message 
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* RIGHT COLUMN: CONTACT INFO */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[36px] flex flex-col h-fit shadow-[0_0_40px_rgba(139,92,246,0.05)]"
          >
            <h2 className="font-display font-semibold text-[20px] text-[#F5F3FF] mb-[28px]">
              Contact Information
            </h2>
            
            <div className="flex flex-col gap-[20px]">
              <div className="flex items-center gap-[16px]">
                <Mail size={20} className="text-[#8B5CF6] shrink-0" />
                <a href="mailto:trinetraedu.ai@gmail.com" className="font-sans font-normal text-[15px] text-[#A8A0C0] hover:text-[#F5F3FF] transition-colors">
                  trinetraedu.ai@gmail.com
                </a>
              </div>
              <div className="flex items-start gap-[16px]">
                <Phone size={20} className="text-[#8B5CF6] shrink-0 mt-[2px]" />
                <div className="flex flex-col gap-2">
                  <button onClick={toggleCall} className="flex items-center gap-2 font-sans font-medium text-[15px] text-[#A8A0C0] hover:text-[#F5F3FF] transition-colors text-left">
                    {isConnecting ? <><Loader2 size={14} className="animate-spin" /> Connecting Agent...</> : isConnected ? "Active Agent Call (Click to End)" : "Talk to our AI Agent Now"}
                  </button>
                </div>
              </div>
              <div className="flex items-start gap-[16px]">
                <MapPin size={20} className="text-[#8B5CF6] shrink-0 mt-[2px]" />
                <span className="font-sans font-normal text-[15px] text-[#A8A0C0] leading-[1.6]">
                  India <br/>
                  (Remote-First Across Regions)
                </span>
              </div>
            </div>

            <div className="w-full h-[1px] bg-[#1E0A35] my-[28px]" />

            <h3 className="font-display font-semibold text-[16px] text-[#F5F3FF] mb-[20px]">
              Follow Us
            </h3>
            <div className="flex items-center gap-[16px]">
              <a href="#" className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#6B6088] bg-transparent hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF] transition-colors duration-300"><Facebook size={18} /></a>
              <a href="#" className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#6B6088] bg-transparent hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF] transition-colors duration-300"><Twitter size={18} /></a>
              <a href="#" className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#6B6088] bg-transparent hover:bg-[rgba(139,92,246,0.1)] hover:text-[#F5F3FF] transition-colors duration-300"><Instagram size={18} /></a>
            </div>

            <div className="w-full h-[1px] bg-[#1E0A35] my-[28px]" />

            <h3 className="font-display font-semibold text-[16px] text-[#F5F3FF] mb-[12px]">
              Book a Demo Call
            </h3>
            <p className="font-sans font-normal text-[14px] text-[#A8A0C0] leading-[1.6] mb-[24px]">
              Prefer a face-to-face conversation? Schedule a 15-minute demo to perfectly assess your needs.
            </p>
            
            {/* MOBILE: DIRECT CALL TRIGGER */}
            <button onClick={toggleCall} className="md:hidden group w-full flex items-center justify-center px-[24px] py-[13px] bg-transparent border border-[#8B5CF6] text-[#A78BFA] font-sans font-medium text-[15px] rounded-[10px] transition-all duration-300 hover:bg-[#8B5CF6] hover:text-[#080010] shadow-[0_0_20px_rgba(139,92,246,0.1)] hover:shadow-[0_0_30px_rgba(139,92,246,0.25)] gap-2">
              {isConnecting ? <><Loader2 size={16} className="animate-spin" /> Connecting...</> : isConnected ? <><PhoneOff size={16} /> End Call</> : <>Talk to AI Direct <span className="ml-[4px] transition-transform duration-300 group-hover:translate-x-1">→</span></>}
            </button>

            {/* DESKTOP: MODAL BUTTON */}
            <button onClick={toggleCall} className="hidden md:flex group w-full items-center justify-center px-[24px] py-[13px] bg-transparent border border-[#8B5CF6] text-[#A78BFA] font-sans font-medium text-[15px] rounded-[10px] transition-all duration-300 hover:bg-[#8B5CF6] hover:text-[#080010] shadow-[0_0_20px_rgba(139,92,246,0.1)] hover:shadow-[0_0_30px_rgba(139,92,246,0.25)] gap-2">
              {isConnecting ? <><Loader2 size={16} className="animate-spin" /> Connecting...</> : isConnected ? <><PhoneOff size={16} /> End Call</> : <>Talk to AI Direct <span className="ml-[4px] transition-transform duration-300 group-hover:translate-x-1">→</span></>}
            </button>
            
            <button onClick={() => setIsModalOpen(true)} className="mt-4 w-full flex items-center justify-center font-sans font-medium text-[14px] text-[#6B6088] hover:text-[#A8A0C0] transition-colors">
              Prefer a callback instead?
            </button>
          </motion.div>
        </div>
      </div>

      {/* CALLBACK MODAL OVERLAY */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[rgba(8,0,16,0.8)] backdrop-blur-md">
            <motion.div 
              initial={{opacity: 0, scale: 0.95}} 
              animate={{opacity: 1, scale: 1}} 
              exit={{opacity: 0, scale: 0.95}} 
              className="bg-[#130224] border border-[#2D1255] rounded-[20px] p-[32px] max-w-[400px] w-full relative shadow-2xl"
            >
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-4 right-4 text-[#6B6088] hover:text-[#F5F3FF] transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
              
              <h3 className="font-display font-semibold text-[22px] text-[#F5F3FF] mb-2">
                Schedule a Demo Call
              </h3>
              <p className="font-sans text-[15px] text-[#A8A0C0] mb-6 leading-[1.6]">
                Prefer to talk to a human later? Leave your number and our sales team will call you back within 2 hours.
              </p>
              
              <form onSubmit={handleCallbackSubmit} className="flex flex-col gap-4">
                <input 
                  type="tel" 
                  placeholder="Your phone number" 
                  value={callbackPhone} 
                  onChange={e => setCallbackPhone(e.target.value)} 
                  className="w-full bg-[#0C0118] border border-[#2D1255] rounded-[10px] px-[16px] py-[14px] text-[#F5F3FF] placeholder:text-[#6B6088] focus:border-[#8B5CF6] outline-none transition-colors" 
                  required 
                />
                <button 
                  type="submit" 
                  disabled={isCallbackSubmitting} 
                  className="w-full py-[14px] bg-[#8B5CF6] text-white rounded-[10px] font-semibold hover:bg-[#7C3AED] transition-colors flex justify-center items-center shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isCallbackSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Request Callback"}
                </button>
              </form>

              {callbackStatus === "success" && (
                <p className="mt-4 text-[#10B981] font-medium text-[14px] text-center flex justify-center items-center gap-2">
                  <CheckCircle2 size={16} /> Request Received
                </p>
              )}
              {callbackStatus === "error" && (
                <p className="mt-4 text-[#EF4444] font-medium text-[14px] text-center flex justify-center items-center gap-2">
                  <AlertCircle size={16} /> System error occurred.
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
