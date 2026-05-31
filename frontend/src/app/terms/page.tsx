import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";

export const metadata = {
  title: "Terms of Service | Trinetra AI",
  description: "Trinetra AI Terms of Service",
};

export default function TermsOfServicePage() {
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
            
            <div className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#D7C4F7] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
              ✦ Legal
            </div>
            
            <h1 className="font-display font-bold text-[36px] md:text-[44px] text-[#FAF7FF] tracking-[-0.02em] leading-tight mb-[64px] text-center">
              Terms of Service
            </h1>

            <div className="w-full bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] md:p-[64px] shadow-[0_0_40px_rgba(139,92,246,0.05)]">
                <div className="prose prose-invert max-w-none">
                    <p className="font-sans font-normal text-[16px] text-[#B8B0D1] leading-[1.8] mb-[24px]">
                        Last updated: March 2026
                    </p>
                    <p className="font-sans font-normal text-[16px] text-[#B8B0D1] leading-[1.8] mb-[24px]">
                        Welcome to Trinetra AI. By accessing or using our websites, services, APIs, and applications (collectively, the "Services"), you agree to be bound by these Terms of Service.
                    </p>
                    <h2 className="font-sans font-semibold text-[20px] text-[#FAF7FF] mt-[32px] mb-[16px]">1. Use of Services</h2>
                    <p className="font-sans font-normal text-[16px] text-[#B8B0D1] leading-[1.8] mb-[24px]">
                        You may use our Services only as permitted by law, including applicable export and re-export control laws and regulations. Don't misuse our Services. For example, don't interfere with our Services or try to access them using a method other than the interface and the instructions that we provide.
                    </p>
                    <h2 className="font-sans font-semibold text-[20px] text-[#FAF7FF] mt-[32px] mb-[16px]">2. Your Accounts</h2>
                    <p className="font-sans font-normal text-[16px] text-[#B8B0D1] leading-[1.8] mb-[24px]">
                        You may need a Trinetra AI account in order to use some of our Services. You are responsible for safeguarding your account, so use a strong password and limit its use to this account. We cannot and will not be liable for any loss or damage arising from your failure to comply with the above.
                    </p>
                    <p className="font-sans font-normal text-[16px] text-[#B8B0D1] leading-[1.8] mt-[48px]">
                        If you have any questions regarding these Terms, please contact us at <strong>legal@trinetraai.com</strong>.
                    </p>
                </div>
            </div>

        </div>
      </div>
    </Layout>
  );
}
