"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Linkedin, Target, Eye } from "lucide-react";
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
  "linear-gradient(135deg, #8B5CF6, #6D28D9)",
  "linear-gradient(135deg, #F59E0B, #D97706)",
  "linear-gradient(135deg, #06B6D4, #0891B2)",
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
    <Layout>
      <div className="flex flex-col bg-[#080010] min-h-screen pb-[120px]">
        {/* HERO SECTION */}
        <section className="w-full pt-[140px] pb-[80px] text-center px-[20px] relative overflow-hidden">
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
              ✦ About Us
            </div>
            <h1 className="font-display font-bold text-[36px] md:text-[48px] text-[#F5F3FF] tracking-[-0.02em] leading-tight">
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
          className="w-full max-w-[750px] mx-auto px-[20px]"
        >
          <div className="font-sans font-normal text-[17px] text-[#A8A0C0] leading-[1.8] flex flex-col gap-[24px]">
            <h2 className="font-display font-bold text-[22px] md:text-[24px] text-[#F5F3FF]">
              The Meaning Behind the Name
            </h2>
            <p>
              In ancient wisdom, Trinetra refers to the 'Third Eye' — the divine vision that sees beyond physical reality. It is the ability to perceive patterns, truths, and futures that remain invisible to the naked eye.
            </p>
            <p>
              We chose this name deliberately. In a world drowning in data but starving for insight, Trinetra is the vision that cuts through the noise. We don't just build AI tools — we build the eyes that help businesses see what they've been missing.
            </p>
            
            <blockquote className="border-l-[3px] border-[#8B5CF6] pl-[20px] py-[2px] my-[8px] italic text-[#C4B5FD] leading-[1.6]">
              "We didn't want to build another AI tool. We wanted to build the infrastructure of intelligence itself."
            </blockquote>
            
            <h2 className="font-display font-bold text-[22px] md:text-[24px] text-[#F5F3FF] mt-[24px]">
              From Experimentation to Infrastructure
            </h2>
            <p>
              Every meaningful venture has an origin story shaped by failure and obsession. Ours began when we started building specialized tools — extraction engines, data pipelines, automation scripts — and discovered a fundamental truth: individual AI tools solve individual problems, but fragmented solutions create fragmented businesses.
            </p>
            <p>
              That realization changed everything. We stopped building tools and started building infrastructure. An intelligent layer that sits beneath a business and makes everything — calls, conversations, decisions, operations — smarter, faster, and autonomous.
            </p>

            <h2 className="font-display font-bold text-[22px] md:text-[24px] text-[#F5F3FF] mt-[24px]">
              The Mission: World-Class AI, Indian Heart
            </h2>
            <p>
              The global AI landscape is dominated by solutions built for Silicon Valley budgets and Western workflows. A dental clinic in Jaipur, a restaurant in Kochi, a salon in Pune — they deserve the same caliber of AI that a Manhattan startup gets. But at a price point and in a language that makes sense for them.
            </p>
            <p>
              Trinetra AI was born to close this gap. We are building world-class autonomous AI agents — self-healing, multilingual, and deeply intelligent — with pricing that works for Indian businesses. Our architecture is designed for what we call 'Silent Intelligence': systems that work in the background, learn continuously, and never need supervision.
            </p>

            <blockquote className="border-l-[3px] border-[#8B5CF6] pl-[20px] py-[2px] my-[8px] italic text-[#C4B5FD] leading-[1.6]">
              "While our ambition is global, our heart beats for the businesses and builders of India. We're not building the future of AI for India — we're building India's AI for the future."
            </blockquote>

            <h2 className="font-display font-bold text-[22px] md:text-[24px] text-[#F5F3FF] mt-[24px]">
              What We're Building Toward
            </h2>
            <p>
              Trinetra is more than an AI automation company. We are building an ecosystem across three dimensions:
            </p>

            <ul className="flex flex-col gap-[16px] my-[8px]">
              <li className="flex items-start gap-[12px]">
                <span className="shrink-0 text-[18px]">🔱</span>
                <span className="font-sans font-normal text-[17px] text-[#A8A0C0]">
                  <strong className="text-[#F5F3FF] font-medium">Autonomous Business Agents</strong> — AI that handles calls, chats, social media, and operations with zero human intervention
                </span>
              </li>
              <li className="flex items-start gap-[12px]">
                <span className="shrink-0 text-[18px]">🎯</span>
                <span className="font-sans font-normal text-[17px] text-[#A8A0C0]">
                  <strong className="text-[#F5F3FF] font-medium">Adaptive Intelligence for Education</strong> — Exam platforms that understand each student's mind and personalize every question
                </span>
              </li>
              <li className="flex items-start gap-[12px]">
                <span className="shrink-0 text-[18px]">🤝</span>
                <span className="font-sans font-normal text-[17px] text-[#A8A0C0]">
                  <strong className="text-[#F5F3FF] font-medium">Human Connection Platforms</strong> — Systems that bridge wisdom and need — connecting knowledge with those who seek it
                </span>
              </li>
            </ul>

            <p>
              We're in the early chapters of this story. Every line of code we write, every agent we deploy, every business we serve brings us closer to a vision where AI doesn't replace humans — it amplifies them. Where technology serves everyone, not just those who can afford it.
            </p>

            <div className="font-display font-semibold text-[20px] md:text-[22px] mt-[48px] text-center text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #FBBF24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              The third eye sees what others cannot. And we're just getting started.
            </div>
          </div>
        </motion.section>

        {/* MISSION & VISION CARDS */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-[800px] mx-auto px-[20px] mt-[80px]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
            {/* Mission Component */}
            <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] transition-transform hover:-translate-y-[4px] duration-300">
              <div className="w-[48px] h-[48px] rounded-[12px] bg-[rgba(139,92,246,0.08)] flex items-center justify-center text-[#8B5CF6] mb-[20px]">
                <Target size={24} />
              </div>
              <h3 className="font-display font-semibold text-[22px] text-[#F5F3FF] mb-[12px]">Our Mission</h3>
              <p className="font-sans font-normal text-[15px] text-[#A8A0C0] leading-[1.7]">
                To democratize AI for Indian businesses. We believe every business — from a clinic in Jaipur to a salon in Pune — deserves access to world-class AI at prices that make sense.
              </p>
            </div>
            
            {/* Vision Component */}
            <div className="bg-[#130224] border border-[#1E0A35] rounded-[16px] p-[32px] transition-transform hover:-translate-y-[4px] duration-300">
              <div className="w-[48px] h-[48px] rounded-[12px] bg-[rgba(139,92,246,0.08)] flex items-center justify-center text-[#8B5CF6] mb-[20px]">
                <Eye size={24} />
              </div>
              <h3 className="font-display font-semibold text-[22px] text-[#F5F3FF] mb-[12px]">Our Vision</h3>
              <p className="font-sans font-normal text-[15px] text-[#A8A0C0] leading-[1.7]">
                To become India's leading AI infrastructure company. Building the invisible intelligence layer that powers the next generation of autonomous businesses.
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
            transition={{ duration: 0.8 }}
            className="w-full max-w-[1280px] mx-auto px-[20px] mt-[100px] flex flex-col items-center"
          >
            <h2 className="font-display font-bold text-[32px] md:text-[40px] text-[#F5F3FF] tracking-[-0.02em] leading-tight text-center">
              The People Behind Trinetra
            </h2>
            <p className="font-sans font-normal text-[16px] text-[#A8A0C0] mb-[56px] text-center mt-[12px]">
              A small team with a big vision.
            </p>

            <div className="flex flex-col md:flex-row flex-wrap justify-center gap-[24px]">
              {teamMembers.map((member, idx) => (
                <div key={member.id} className="w-full md:w-[320px] bg-[#130224] border border-[#1E0A35] rounded-[20px] p-[32px] flex flex-col items-center text-center transition-all duration-300">
                  {member.profile_image_url ? (
                    <img 
                      src={member.profile_image_url} 
                      alt={member.full_name} 
                      className="w-[80px] h-[80px] rounded-full object-cover border-2 border-[#3A1C68]"
                    />
                  ) : (
                    <div 
                      className="w-[80px] h-[80px] rounded-full flex items-center justify-center"
                      style={{ background: GRADIENTS[idx % GRADIENTS.length] }}
                    >
                      <span className="font-display font-bold text-[24px] text-white">
                        {getInitials(member.full_name)}
                      </span>
                    </div>
                  )}
                  
                  <h3 className="font-display font-bold text-[18px] text-[#F5F3FF] mt-[16px]">
                    {member.full_name}
                  </h3>
                  <p className="font-sans font-normal text-[14px] text-[#A8A0C0] mt-[4px]">
                    {member.role_title}
                  </p>
                  
                  {member.bio && (
                    <p className="font-sans font-normal text-[13px] text-[#8D86A8] leading-[1.6] mt-[12px] line-clamp-3">
                      {member.bio}
                    </p>
                  )}
                  
                  {member.linkedin_url && (
                    <a 
                      href={member.linkedin_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-[16px] w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#6B6088] bg-[rgba(139,92,246,0.05)] hover:bg-[rgba(139,92,246,0.15)] hover:text-[#F5F3FF] transition-colors"
                    >
                      <Linkedin size={18} />
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-[60px] flex flex-col items-center">
              <p className="font-sans font-normal text-[15px] text-[#A8A0C0] text-center">
                Want to join us? We're looking for builders.
              </p>
              <Link href="/contact" className="mt-[8px] font-sans font-medium text-[15px] text-[#8B5CF6] hover:text-[#A78BFA] transition-colors">
                Get in Touch →
              </Link>
            </div>
          </motion.section>
        )}

        {/* BOTTOM CTA SECTION */}
        <section className="w-full px-[20px] pt-[100px] pb-[40px] text-center">
          <div className="mx-auto max-w-[760px]">
            <h2 className="font-display font-bold text-[32px] md:text-[36px] text-[#F5F3FF] tracking-[-0.02em] leading-tight mb-[32px]">
              Let's Build the Future Together
            </h2>
            <Link 
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-[#F59E0B] px-[32px] py-[16px] font-sans text-[16px] font-semibold text-[#080010] transition-all duration-300 hover:-translate-y-[2px] hover:bg-[#D97706]"
            >
              Get in Touch →
            </Link>
          </div>
        </section>

      </div>
    </Layout>
  );
}
