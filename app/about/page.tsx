"use client";

import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Twitter, Linkedin, Lightbulb, Globe, Shield, Activity } from "lucide-react";

export default function AboutPage() {
  return (
    <Layout>
      <div className="flex flex-col bg-[#080010] min-h-screen pb-[120px]">
        
        {/* HERO SECTION */}
        <section className="w-full pt-[140px] pb-[80px] text-center px-[20px] relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div 
            className="absolute inset-0 z-0 pointer-events-none" 
            style={{ 
              background: 'radial-gradient(ellipse 800px 400px at top center, rgba(139,92,246,0.08) 0%, transparent 70%)' 
            }} 
          />
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 max-w-[800px] mx-auto flex flex-col items-center"
          >
            <div className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#A78BFA] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
              ✦ Our Story
            </div>
            <h1 className="font-display font-bold text-[36px] md:text-[48px] text-[#F5F3FF] tracking-[-0.02em] leading-tight mb-[16px]">
              Vision <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #FBBF24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Beyond</span> the Surface
            </h1>
          </motion.div>
        </section>

        {/* STORY SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-[720px] mx-auto px-[20px]"
        >
          <div className="font-sans font-normal text-[17px] text-[#A8A0C0] leading-[1.8] flex flex-col gap-[24px]">
            <h2 className="font-display font-semibold text-[28px] text-[#F5F3FF] mt-[48px] mb-[20px]">
              The Meaning Behind the Name
            </h2>
            <p>
              In ancient wisdom, Trinetra refers to the 'Third Eye' — the divine vision that sees beyond physical reality. It is the ability to perceive patterns, truths, and futures that remain invisible to the naked eye.
            </p>
            <p>
              We chose this name deliberately. In a world drowning in data but starving for insight, Trinetra is the vision that cuts through the noise. We don't just build AI tools — we build the eyes that help businesses see what they've been missing.
            </p>
            
            <blockquote className="border-l-[3px] border-[#8B5CF6] pl-[24px] py-[4px] my-[16px] italic text-[#C4B5FD] text-[19px] leading-[1.6]">
              "We didn't want to build another AI tool. We wanted to build the infrastructure of intelligence itself."
            </blockquote>
            
            <h2 className="font-display font-semibold text-[28px] text-[#F5F3FF] mt-[48px] mb-[20px]">
              From Experimentation to Infrastructure
            </h2>
            <p>
              Every meaningful venture has an origin story shaped by failure and obsession. Ours began when we started building specialized tools — extraction engines, data pipelines, automation scripts — and discovered a fundamental truth: individual AI tools solve individual problems, but fragmented solutions create fragmented businesses.
            </p>
            <p>
              That realization changed everything. We stopped building tools and started building infrastructure. An intelligent layer that sits beneath a business and makes everything — calls, conversations, decisions, operations — smarter, faster, and autonomous.
            </p>

            <h2 className="font-display font-semibold text-[28px] text-[#F5F3FF] mt-[48px] mb-[20px]">
              The Mission: World-Class AI, Indian Heart
            </h2>
            <p>
              The global AI landscape is dominated by solutions built for Silicon Valley budgets and Western workflows. A dental clinic in Jaipur, a restaurant in Kochi, a salon in Pune — they deserve the same caliber of AI that a Manhattan startup gets. But at a price point and in a language that makes sense for them.
            </p>
            <p>
              Trinetra AI was born to close this gap. We are building world-class autonomous AI agents — self-healing, multilingual, and deeply intelligent — with pricing that starts at the cost of a daily chai. Our architecture is designed for what we call 'Silent Intelligence': systems that work in the background, learn continuously, and never need supervision.
            </p>

            <blockquote className="border-l-[3px] border-[#8B5CF6] pl-[24px] py-[4px] my-[16px] italic text-[#C4B5FD] text-[19px] leading-[1.6]">
              "While our ambition is global, our heart beats for the businesses and builders of India. We're not building the future of AI for India — we're building India's AI for the future."
            </blockquote>

            <h2 className="font-display font-semibold text-[28px] text-[#F5F3FF] mt-[48px] mb-[20px]">
              What We're Building Toward
            </h2>
            <p>
              Trinetra is more than an AI automation company. We are building an ecosystem across three dimensions:
            </p>

            <div className="flex flex-col gap-[16px] my-[8px]">
              <div className="flex items-start gap-[12px]">
                <span className="shrink-0 text-[18px]">🔱</span>
                <span className="font-sans font-normal text-[17px] text-[#A8A0C0]">
                  <strong className="text-[#F5F3FF] font-medium">Autonomous Business Agents</strong> — AI that handles calls, chats, social media, and operations with zero human intervention
                </span>
              </div>
              <div className="flex items-start gap-[12px]">
                <span className="shrink-0 text-[18px]">🎯</span>
                <span className="font-sans font-normal text-[17px] text-[#A8A0C0]">
                  <strong className="text-[#F5F3FF] font-medium">Adaptive Intelligence for Education</strong> — Exam platforms that understand each student's mind and personalize every question
                </span>
              </div>
              <div className="flex items-start gap-[12px]">
                <span className="shrink-0 text-[18px]">🤝</span>
                <span className="font-sans font-normal text-[17px] text-[#A8A0C0]">
                  <strong className="text-[#F5F3FF] font-medium">Human Connection Platforms</strong> — Systems that bridge wisdom and need — connecting retired professionals with those who seek their experience
                </span>
              </div>
            </div>

            <p>
              We're in the early chapters of this story. Every line of code we write, every agent we deploy, every business we serve brings us closer to a vision where AI doesn't replace humans — it amplifies them. Where technology serves everyone, not just those who can afford it. Where the third eye is open for all.
            </p>

            <div className="font-display font-semibold text-[22px] mt-[48px] text-center text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #FBBF24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              The third eye sees what others cannot. And we're just getting started.
            </div>
          </div>

          {/* MISSION & VISION */}
          <div className="mt-[80px] grid grid-cols-1 sm:grid-cols-2 gap-[24px]">
            {/* Mission Component */}
            <div className="relative bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] pt-[36px] transition-transform hover:-translate-y-[4px] duration-300">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[16px] bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA]" />
              <h3 className="font-display font-semibold text-[22px] text-[#F5F3FF] mb-[12px]">Our Mission</h3>
              <p className="font-sans font-normal text-[15px] text-[#A8A0C0] leading-[1.7]">
                To make AI automation accessible to every business in India, regardless of size, budget, or technical expertise.
              </p>
            </div>
            
            {/* Vision Component */}
            <div className="relative bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] pt-[36px] transition-transform hover:-translate-y-[4px] duration-300">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[16px] bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]" />
              <h3 className="font-display font-semibold text-[22px] text-[#F5F3FF] mb-[12px]">Our Vision</h3>
              <p className="font-sans font-normal text-[15px] text-[#A8A0C0] leading-[1.7]">
                A world where AI handles the mundane so humans can focus on the meaningful. Where experience is valued and technology serves everyone.
              </p>
            </div>
          </div>
        </motion.section>

        {/* TEAM SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-[1280px] mx-auto px-[20px] md:px-[80px] mt-[100px] flex flex-col items-center"
        >
          <div className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#A78BFA] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
            ✦ Team
          </div>
          <h2 className="font-display font-bold text-[32px] md:text-[40px] text-[#F5F3FF] tracking-[-0.02em] leading-tight mb-[56px] text-center">
            The People Behind the Vision
          </h2>

          <div className="w-full max-w-[340px] bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] flex flex-col items-center text-center hover:border-[#2D1255] hover:shadow-[0_0_40px_rgba(139,92,246,0.05)] transition-all duration-300 group">
            <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#FBBF24] p-[2px] mb-[24px] group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-[#080010] rounded-full flex items-center justify-center font-display font-bold text-[32px] text-[#F5F3FF]">
                KS
              </div>
            </div>
            <h3 className="font-display font-semibold text-[20px] text-[#F5F3FF] mb-[4px]">
              Ketan Singh
            </h3>
            <p className="font-sans font-normal text-[15px] text-[#A78BFA] mb-[16px]">
              Founder & CEO
            </p>
            <p className="font-sans font-normal text-[14px] text-[#A8A0C0] leading-[1.6] mb-[24px]">
              Building the infrastructure for autonomous businesses. Previously scaled high-growth engineering teams across sectors.
            </p>
            <div className="flex gap-[16px]">
              <a href="#" className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#6B6088] bg-[rgba(139,92,246,0.05)] hover:bg-[rgba(139,92,246,0.15)] hover:text-[#F5F3FF] transition-colors"><Twitter size={18} /></a>
              <a href="#" className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#6B6088] bg-[rgba(139,92,246,0.05)] hover:bg-[rgba(139,92,246,0.15)] hover:text-[#F5F3FF] transition-colors"><Linkedin size={18} /></a>
            </div>
          </div>
        </motion.section>

        {/* VALUES SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-[1280px] mx-auto px-[20px] md:px-[80px] mt-[100px]"
        >
          <div className="flex flex-col items-center text-center mb-[56px]">
             <h2 className="font-display font-bold text-[32px] text-[#F5F3FF] tracking-[-0.02em] leading-tight">
               Our Core Values
             </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] max-w-[900px] mx-auto">
            {/* Value 1 */}
            <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] flex flex-col sm:flex-row gap-[20px] sm:items-start group transition-all duration-300 hover:border-[#2D1255]">
              <div className="w-[48px] h-[48px] rounded-[12px] bg-[rgba(139,92,246,0.08)] flex items-center justify-center text-[#8B5CF6] shrink-0 group-hover:scale-110 transition-transform">
                <Lightbulb size={24} />
              </div>
              <div className="flex flex-col">
                <h4 className="font-display font-semibold text-[18px] text-[#F5F3FF] mb-[8px]">Innovation</h4>
                <p className="font-sans font-normal text-[14px] text-[#A8A0C0] leading-[1.6]">Constantly pushing the boundaries of what autonomous local AI agents can technically achieve.</p>
              </div>
            </div>
            
            {/* Value 2 */}
            <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] flex flex-col sm:flex-row gap-[20px] sm:items-start group transition-all duration-300 hover:border-[#2D1255]">
              <div className="w-[48px] h-[48px] rounded-[12px] bg-[rgba(245,158,11,0.08)] flex items-center justify-center text-[#F59E0B] shrink-0 group-hover:scale-110 transition-transform">
                <Globe size={24} />
              </div>
              <div className="flex flex-col">
                <h4 className="font-display font-semibold text-[18px] text-[#F5F3FF] mb-[8px]">Accessibility</h4>
                <p className="font-sans font-normal text-[14px] text-[#A8A0C0] leading-[1.6]">Democratizing incredibly advanced enterprise-grade automation for businesses of all sizes.</p>
              </div>
            </div>
            
            {/* Value 3 */}
            <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] flex flex-col sm:flex-row gap-[20px] sm:items-start group transition-all duration-300 hover:border-[#2D1255]">
              <div className="w-[48px] h-[48px] rounded-[12px] bg-[rgba(34,211,238,0.08)] flex items-center justify-center text-[#22D3EE] shrink-0 group-hover:scale-110 transition-transform">
                <Shield size={24} />
              </div>
              <div className="flex flex-col">
                <h4 className="font-display font-semibold text-[18px] text-[#F5F3FF] mb-[8px]">Integrity</h4>
                <p className="font-sans font-normal text-[14px] text-[#A8A0C0] leading-[1.6]">Building secure, transparent, and resilient algorithmic systems that respect data sovereignty.</p>
              </div>
            </div>
            
            {/* Value 4 */}
            <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] flex flex-col sm:flex-row gap-[20px] sm:items-start group transition-all duration-300 hover:border-[#2D1255]">
              <div className="w-[48px] h-[48px] rounded-[12px] bg-[rgba(139,92,246,0.08)] flex items-center justify-center text-[#8B5CF6] shrink-0 group-hover:scale-110 transition-transform">
                <Activity size={24} />
              </div>
              <div className="flex flex-col">
                <h4 className="font-display font-semibold text-[18px] text-[#F5F3FF] mb-[8px]">Impact</h4>
                <p className="font-sans font-normal text-[14px] text-[#A8A0C0] leading-[1.6]">Measuring our success purely by the actual time, money, and workload we save our partners.</p>
              </div>
            </div>
          </div>
        </motion.section>

      </div>
    </Layout>
  );
}
