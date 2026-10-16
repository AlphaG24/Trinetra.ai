"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Linkedin, Target, Eye, Sparkles } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

interface TeamMember {
  id: string;
  full_name: string;
  role_title: string;
  bio: string | null;
  profile_image_url: string | null;
  linkedin_url: string | null;
}

const GRADIENTS = [
  "linear-gradient(135deg, #2563EB, #1D4ED8)",
  "linear-gradient(135deg, #0284C7, #0369A1)",
  "linear-gradient(135deg, #4F46E5, #3730A3)",
];

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AboutPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("team_members")
          .select("*")
          .eq("is_visible", true)
          .order("display_order", { ascending: true });
        
        if (!error && data) {
          setTeamMembers(data);
        }
      } catch (err) {
        console.error("Failed to fetch team members:", err);
      } finally {
        setLoadingTeam(false);
      }
    }
    fetchTeam();
  }, []);

  return (
    <Layout theme="vaakriti">
      <div className="flex flex-col bg-[#FAFAFA] min-h-screen pb-24 text-[#0F172A] pt-24 sm:pt-28">
        {/* HERO SECTION */}
        <section className="w-full pt-10 pb-16 text-center px-5 relative overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 max-w-3xl mx-auto flex flex-col items-center"
          >
            <div className="inline-flex items-center gap-1.5 bg-[#2563EB]/10 border border-[#2563EB]/25 text-[#2563EB] font-sans font-semibold text-[12.5px] px-4 py-1.5 rounded-full mb-6">
              <span>✦</span> About Us
            </div>
            <h1 className="font-sans font-extrabold text-[36px] md:text-[50px] text-[#0F172A] tracking-tight leading-tight">
              Vision <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#0284C7]">Beyond</span> the Surface
            </h1>
            <p className="mt-4 text-[#475569] text-base md:text-lg max-w-xl">
              Sovereign voice intelligence and autonomous customer experience pipelines built for India and the world.
            </p>
          </motion.div>
        </section>

        {/* STORY SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-3xl mx-auto px-5"
        >
          <div className="font-sans text-[16px] text-[#334155] leading-relaxed flex flex-col gap-6">
            <h2 className="font-sans font-bold text-[22px] md:text-[26px] text-[#0F172A]">
              The Meaning Behind the Name
            </h2>
            <p>
              In ancient wisdom, Trinetra refers to the &apos;Third Eye&apos; — the divine vision that sees beyond physical reality. It is the ability to perceive patterns, truths, and futures that remain invisible to the naked eye.
            </p>
            <p>
              We chose this name deliberately. In a world drowning in data but starving for insight, Trinetra is the vision that cuts through the noise. We don&apos;t just build AI tools — we build the infrastructure of intelligence that helps businesses see what they&apos;ve been missing.
            </p>
            
            <blockquote className="border-l-[3px] border-[#2563EB] pl-5 py-3 my-2 italic text-[#0F172A] bg-blue-50/50 rounded-r-xl leading-relaxed">
              &quot;We didn&apos;t want to build another AI tool. We wanted to build the infrastructure of intelligence itself.&quot;
            </blockquote>
            
            <h2 className="font-sans font-bold text-[22px] md:text-[26px] text-[#0F172A] mt-6">
              From Experimentation to Infrastructure
            </h2>
            <p>
              Every meaningful venture has an origin story shaped by obsession with craft. Ours began when we started building specialized tools — extraction engines, data pipelines, automation scripts — and discovered a fundamental truth: individual AI tools solve individual problems, but fragmented solutions create fragmented businesses.
            </p>
            <p>
              That realization changed everything. We stopped building isolated point solutions and started building foundational voice infrastructure. An intelligent layer that sits beneath a business and makes everything — calls, conversations, decisions, operations — smarter, faster, and autonomous.
            </p>

            <h2 className="font-sans font-bold text-[22px] md:text-[26px] text-[#0F172A] mt-6">
              The Mission: World-Class AI, Indian Heart
            </h2>
            <p>
              The global AI landscape is dominated by solutions built for Silicon Valley budgets and Western workflows. A dental clinic in Jaipur, a hospital in Kochi, a regional distributor in Pune — they deserve the same caliber of voice intelligence that a global enterprise commands. But at a price point and in a language that makes sense for them.
            </p>
            <p>
              Trinetra AI was born to close this gap. We are building world-class autonomous AI agents — self-healing, multilingual, and deeply contextual — with transparent pricing and real-time sovereign telecom integrations.
            </p>

            <blockquote className="border-l-[3px] border-[#2563EB] pl-5 py-3 my-2 italic text-[#0F172A] bg-blue-50/50 rounded-r-xl leading-relaxed">
              &quot;While our ambition is global, our heart beats for the businesses and builders of India. We&apos;re not building the future of AI for India — we&apos;re building India&apos;s AI for the future.&quot;
            </blockquote>

            <h2 className="font-sans font-bold text-[22px] md:text-[26px] text-[#0F172A] mt-6">
              What We&apos;re Building Toward
            </h2>
            <p>
              Trinetra is an end-to-end intelligence ecosystem across three core dimensions:
            </p>

            <ul className="flex flex-col gap-4 my-2">
              <li className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs">
                <span className="shrink-0 text-xl">🔱</span>
                <span className="font-sans text-[15px] text-[#334155]">
                  <strong className="text-[#0F172A] font-semibold">Autonomous Business Agents</strong> — AI that handles calls, chats, social media, and operations with zero human friction.
                </span>
              </li>
              <li className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs">
                <span className="shrink-0 text-xl">🎯</span>
                <span className="font-sans text-[15px] text-[#334155]">
                  <strong className="text-[#0F172A] font-semibold">Adaptive Intelligence for Education</strong> — Scalable examination platforms through Trinetra Shiksha that understand each student&apos;s needs.
                </span>
              </li>
              <li className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs">
                <span className="shrink-0 text-xl">🤝</span>
                <span className="font-sans text-[15px] text-[#334155]">
                  <strong className="text-[#0F172A] font-semibold">Human Connection Platforms</strong> — Systems that bridge knowledge and enterprise scale, connecting insights with action.
                </span>
              </li>
            </ul>

            <div className="font-sans font-bold text-[18px] md:text-[20px] mt-10 text-center text-[#2563EB]">
              The third eye sees what others cannot. And we&apos;re just getting started.
            </div>
          </div>
        </motion.section>

        {/* MISSION & VISION CARDS */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-4xl mx-auto px-5 mt-16"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mission */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs hover:shadow-md hover:border-[#2563EB]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] mb-5">
                <Target size={24} />
              </div>
              <h3 className="font-sans font-bold text-[20px] text-[#0F172A] mb-3">Our Mission</h3>
              <p className="font-sans text-[14.5px] text-[#475569] leading-relaxed">
                To democratize voice AI for Indian businesses. We believe every enterprise — from regional clinics to nationwide retailers — deserves access to world-class conversational intelligence.
              </p>
            </div>
            
            {/* Vision */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs hover:shadow-md hover:border-[#2563EB]/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] mb-5">
                <Eye size={24} />
              </div>
              <h3 className="font-sans font-bold text-[20px] text-[#0F172A] mb-3">Our Vision</h3>
              <p className="font-sans text-[14.5px] text-[#475569] leading-relaxed">
                To become India&apos;s definitive voice infrastructure backbone. Powering millions of sovereign, multilingual telephone interactions daily with sub-500ms latency.
              </p>
            </div>
          </div>
        </motion.section>

        {/* TEAM SECTION */}
        {!loadingTeam && teamMembers.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-5xl mx-auto px-5 mt-20 flex flex-col items-center"
          >
            <h2 className="font-sans font-bold text-[28px] md:text-[36px] text-[#0F172A] tracking-tight text-center">
              The People Behind Trinetra
            </h2>
            <p className="font-sans text-[15px] text-[#64748B] mb-12 text-center mt-2">
              Engineers, researchers, and builders shaping conversational intelligence.
            </p>

            <div className="flex flex-col md:flex-row flex-wrap justify-center gap-6 w-full">
              {teamMembers.map((member, idx) => (
                <div key={member.id} className="w-full md:w-[320px] bg-white border border-[#E2E8F0] rounded-2xl p-7 flex flex-col items-center text-center shadow-xs hover:shadow-md transition-all">
                  {member.profile_image_url ? (
                    <img 
                      src={member.profile_image_url} 
                      alt={member.full_name} 
                      className="w-20 h-20 rounded-full object-cover border-2 border-[#E2E8F0]"
                    />
                  ) : (
                    <div 
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white"
                      style={{ background: GRADIENTS[idx % GRADIENTS.length] }}
                    >
                      <span className="font-sans font-bold text-[22px]">
                        {getInitials(member.full_name)}
                      </span>
                    </div>
                  )}
                  
                  <h3 className="font-sans font-bold text-[17px] text-[#0F172A] mt-4">
                    {member.full_name}
                  </h3>
                  <p className="font-sans text-[13.5px] text-[#2563EB] font-medium mt-1">
                    {member.role_title}
                  </p>
                  
                  {member.bio && (
                    <p className="font-sans text-[13px] text-[#64748B] leading-relaxed mt-3 line-clamp-3">
                      {member.bio}
                    </p>
                  )}
                  
                  {member.linkedin_url && (
                    <a 
                      href={member.linkedin_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-4 w-9 h-9 rounded-full flex items-center justify-center text-[#64748B] bg-[#F1F5F9] hover:bg-[#2563EB]/10 hover:text-[#2563EB] transition-colors"
                    >
                      <Linkedin size={16} />
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col items-center">
              <p className="font-sans text-[14.5px] text-[#64748B] text-center">
                Want to join us? We&apos;re looking for exceptional builders.
              </p>
              <Link href="/contact" className="mt-2 font-sans font-semibold text-[14.5px] text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                Get in Touch →
              </Link>
            </div>
          </motion.section>
        )}

        {/* BOTTOM CTA SECTION */}
        <section className="w-full px-5 pt-20 pb-8 text-center">
          <div className="mx-auto max-w-2xl bg-white border border-[#E2E8F0] rounded-3xl p-10 shadow-xs">
            <h2 className="font-sans font-bold text-[28px] md:text-[32px] text-[#0F172A] tracking-tight mb-4">
              Let&apos;s Build the Future Together
            </h2>
            <p className="text-[#64748B] text-sm md:text-base max-w-md mx-auto mb-7">
              Ready to deploy intelligent voice automation for your organization?
            </p>
            <Link 
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-[#2563EB] px-8 py-3.5 font-sans text-[14px] font-semibold text-white shadow-xs transition-all duration-200 hover:bg-[#1D4ED8]"
            >
              Get in Touch →
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}
