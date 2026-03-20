import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";

export const metadata = {
  title: "Privacy Policy | Trinetra AI",
  description: "Trinetra AI Privacy Policy",
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

        <div className="max-w-[800px] mx-auto w-full relative z-10 flex flex-col items-center">
            
            <div className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#A78BFA] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
              ✦ Legal
            </div>
            
            <h1 className="font-display font-bold text-[36px] md:text-[44px] text-[#F5F3FF] tracking-[-0.02em] leading-tight mb-[64px] text-center">
              Privacy Policy
            </h1>

            <div className="w-full bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] md:p-[64px] shadow-[0_0_40px_rgba(139,92,246,0.05)]">
                <div className="prose prose-invert max-w-none">
                    <p className="font-sans font-normal text-[16px] text-[#A8A0C0] leading-[1.8] mb-[24px]">
                        Last updated: March 2026
                    </p>
                    <p className="font-sans font-normal text-[16px] text-[#A8A0C0] leading-[1.8] mb-[24px]">
                        At Trinetra AI, we take your privacy seriously. This privacy policy describes how we collect, use, and share your personal information when you use our services.
                    </p>
                    <h2 className="font-sans font-semibold text-[20px] text-[#F5F3FF] mt-[32px] mb-[16px]">1. Information We Collect</h2>
                    <p className="font-sans font-normal text-[16px] text-[#A8A0C0] leading-[1.8] mb-[24px]">
                        We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us.
                    </p>
                    <h2 className="font-sans font-semibold text-[20px] text-[#F5F3FF] mt-[32px] mb-[16px]">2. How We Use Information</h2>
                    <p className="font-sans font-normal text-[16px] text-[#A8A0C0] leading-[1.8] mb-[24px]">
                        We use the information we collect to provide, maintain, and improve our services, such as to facilitate payments, send receipts, provide products and services you request, develop new features, and provide customer support.
                    </p>
                    <p className="font-sans font-normal text-[16px] text-[#A8A0C0] leading-[1.8] mt-[48px]">
                        For a complete overview or specific deletion requests, please contact our legal team at <strong>legal@trinetraai.com</strong>.
                    </p>
                </div>
            </div>

        </div>
      </div>
    </Layout>
  );
}
