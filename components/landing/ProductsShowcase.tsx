"use client";

import { motion } from "framer-motion";
import { Check, Bot, Send, MoreHorizontal, Sparkles, Heart, MessageCircle, Mic, Workflow, Database, Zap, GitCommit, Mail } from "lucide-react";
import Link from "next/link";
import React from "react";

// ─── VISUAL MOCKUP COMPONENTS ───

const VoiceVisual = () => (
  <div className="w-full max-w-[420px] mx-auto bg-[#130224] border border-[#1E0A35] rounded-[20px] p-[32px] shadow-[0_20px_60px_rgba(139,92,246,0.1)] flex flex-col items-center">
    <div className="text-[13px] text-[#6B6088] mb-[8px] uppercase tracking-wider font-semibold">Incoming Call</div>
    <div className="text-[32px] font-display font-medium text-[#F5F3FF] mb-[4px]">Rahul Sharma</div>
    <div className="text-[16px] font-mono text-[#A78BFA] mb-[32px]">02:34</div>
    
    {/* Chat Bubble Simulation */}
    <div className="w-full bg-[#1A0530] rounded-[16px] rounded-tl-sm p-[20px] text-[#A8A0C0] text-[15px] leading-relaxed relative shadow-md">
      "Good afternoon! I'd be happy to book an appointment for you. Dr. Patel is available tomorrow at 3 PM. Shall I confirm?"
    </div>
    
    <div className="mt-[40px] flex items-center gap-[10px] text-[14px] text-[#10B981] font-medium bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] px-[20px] py-[8px] rounded-full">
      <span className="w-[10px] h-[10px] rounded-full bg-[#10B981] animate-pulse"></span>
      AI Handling
    </div>
  </div>
);

const ChatVisual = () => (
  <div className="w-full max-w-[420px] mx-auto bg-[#130224] border border-[#1E0A35] rounded-[20px] shadow-[0_20px_60px_rgba(139,92,246,0.1)] overflow-hidden flex flex-col">
    {/* Header */}
    <div className="bg-[#1A0530] p-[20px] border-b border-[#1E0A35] flex items-center gap-[14px]">
      <div className="w-[44px] h-[44px] rounded-full bg-[rgba(139,92,246,0.15)] flex items-center justify-center text-[#8B5CF6]">
        <Bot size={24} />
      </div>
      <div>
        <div className="text-[#F5F3FF] font-medium text-[16px]">Trinetra Support</div>
        <div className="text-[#10B981] text-[13px] flex items-center gap-[6px]">
          <span className="w-[8px] h-[8px] rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
          Online actively
        </div>
      </div>
    </div>
    {/* Chat Body */}
    <div className="p-[24px] flex flex-col gap-[20px] min-h-[300px]">
      <div className="self-end bg-[rgba(139,92,246,0.15)] border border-[rgba(139,92,246,0.2)] text-[#E5E7EB] text-[15px] py-[12px] px-[16px] rounded-[14px] rounded-tr-sm max-w-[85%]">
        Do you integrate with my existing CRM out of the box?
      </div>
      <div className="self-start bg-[#1E0A35] border border-[#2D1255] text-[#A8A0C0] text-[15px] py-[12px] px-[16px] rounded-[14px] rounded-tl-sm max-w-[85%] leading-relaxed">
        Yes! We natively integrate with Salesforce, HubSpot, and 50+ other CRMs instantly. We also support custom generic webhooks if needed!
      </div>
    </div>
    {/* Input Box */}
    <div className="p-[16px] border-t border-[#1E0A35] bg-[#10021E]">
      <div className="w-full bg-[#080010] rounded-full py-[12px] px-[20px] text-[#6B6088] text-[14px] flex items-center justify-between border border-[#2D1255]">
        Type a message...
        <Send size={16} className="text-[#A78BFA]" />
      </div>
    </div>
  </div>
);

const SocialVisual = () => (
  <div className="w-full max-w-[400px] mx-auto bg-[#130224] border border-[#1E0A35] rounded-[20px] shadow-[0_20px_60px_rgba(245,158,11,0.08)] overflow-hidden">
    {/* Profile Header */}
    <div className="p-[16px] flex items-center justify-between">
      <div className="flex items-center gap-[12px]">
        <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-tr from-[#F59E0B] to-[#FBBF24] p-[2px]">
          <div className="w-full h-full bg-[#130224] rounded-full border-2 border-[#130224]" />
        </div>
        <div className="text-[#F5F3FF] font-medium text-[14px]">trinetra.ai</div>
      </div>
      <MoreHorizontal size={20} className="text-[#6B6088]" />
    </div>
    {/* Feed Image Map */}
    <div className="w-full aspect-square bg-[#1A0530] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 pointer-events-none" />
      <Sparkles size={64} className="text-[#F59E0B] opacity-40 animate-pulse" />
      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5 flex items-center gap-2 border border-white/10">
         <Bot size={14} className="text-[#F59E0B]"/>
         <span className="text-[12px] font-medium text-white">AI Generated</span>
      </div>
    </div>
    {/* Interactions */}
    <div className="p-[16px]">
      <div className="flex gap-[16px] mb-[12px]">
        <Heart size={24} className="text-[#F5F3FF]" />
        <MessageCircle size={24} className="text-[#F5F3FF]" />
        <Send size={24} className="text-[#F5F3FF]" />
      </div>
      <div className="text-[14px] font-semibold text-[#F5F3FF] mb-[8px]">1,204 likes</div>
      <div className="text-[14px] text-[#A8A0C0] leading-[1.6]">
        <span className="font-semibold text-[#F5F3FF] mr-2">trinetra.ai</span>
        Supercharge your workflows with autonomous agents. Our updated cognitive framework allows deep reasoning without human oversight.
      </div>
      <div className="text-[14px] text-[#8B5CF6] mt-[6px]">#AI #Automation #FutureOfWork</div>
    </div>
  </div>
);

const WorkflowVisual = () => (
  <div className="w-full max-w-[400px] mx-auto bg-[#130224] border border-[#1E0A35] rounded-[20px] shadow-[0_20px_60px_rgba(139,92,246,0.1)] overflow-hidden flex flex-col relative p-[24px]">
    {/* Header */}
    <div className="flex items-center justify-between border-b border-[#2D1255] pb-[16px] mb-[20px]">
      <div className="flex items-center gap-[10px]">
        <div className="w-[36px] h-[36px] rounded-[10px] bg-[#8B5CF6]/20 flex items-center justify-center text-[#A78BFA]">
          <Workflow size={20} />
        </div>
        <div>
          <div className="text-[#F5F3FF] font-medium text-[15px]">Lead Processing</div>
          <div className="text-[#10B981] text-[12px] flex items-center gap-[4px] mt-[2px]">
            <div className="w-[6px] h-[6px] rounded-full bg-[#10B981] animate-pulse" /> Active
          </div>
        </div>
      </div>
      <button className="bg-[#2D1255] text-[#A8A0C0] px-[12px] py-[6px] rounded-[6px] text-[12px] flex items-center gap-[6px] font-sans">
        <Zap size={14} className="text-[#F59E0B]" /> Run Now
      </button>
    </div>

    {/* Workflow Steps Node Map */}
    <div className="flex flex-col gap-[16px] relative z-10 w-full pl-[8px]">
      {/* Step 1 */}
      <div className="flex items-center gap-[16px] bg-[#1A0530] p-[14px] rounded-[12px] border border-[#2D1255] relative overflow-hidden shadow-sm">
        <div className="w-[4px] h-full bg-[#8B5CF6] absolute left-0 top-0" />
        <Mail size={22} className="text-[#A78BFA] shrink-0 ml-[4px]" />
        <div className="flex-1 truncate">
          <div className="text-[#F5F3FF] font-medium text-[14px] truncate">1. Incoming Email</div>
          <div className="text-[#6B6088] text-[13px] truncate">Trigger on new lead@...</div>
        </div>
      </div>

      <div className="w-[2px] h-[16px] bg-[#2D1255] ml-[36px] relative opacity-50" />

      {/* Step 2 (AI Processing) */}
      <div className="flex items-center gap-[16px] bg-[#1A0530] p-[14px] rounded-[12px] border border-[#8B5CF6]/40 relative overflow-hidden shadow-[0_0_15px_rgba(139,92,246,0.1)]">
        <div className="w-[4px] h-full bg-gradient-to-b from-[#8B5CF6] to-[#FBBF24] absolute left-0 top-0" />
        <Bot size={22} className="text-[#FBBF24] shrink-0 ml-[4px]" />
        <div className="flex-1 truncate">
          <div className="text-[#F5F3FF] font-medium text-[14px] truncate">2. AI Extraction</div>
          <div className="text-[#A8A0C0] text-[13px] truncate">Extract Intent & Budget</div>
        </div>
        <Sparkles size={16} className="text-[#FBBF24] shrink-0 animate-pulse mr-[4px]" />
      </div>

      <div className="w-[2px] h-[16px] bg-[#2D1255] ml-[36px] relative opacity-50">
        <GitCommit size={14} className="text-[#A8A0C0] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#130224] rounded-full p-[1px]" />
      </div>

      {/* Step 3 (Action) */}
      <div className="flex items-center gap-[16px] bg-[#1A0530] p-[14px] rounded-[12px] border border-[#2D1255] relative overflow-hidden shadow-sm">
        <div className="w-[4px] h-full bg-[#10B981] absolute left-0 top-0" />
        <Database size={22} className="text-[#10B981] shrink-0 ml-[4px]" />
        <div className="flex-1 truncate">
          <div className="text-[#F5F3FF] font-medium text-[14px] truncate">3. Add to CRM</div>
          <div className="text-[#6B6088] text-[13px] truncate">Insert row into Database</div>
        </div>
      </div>
    </div>
  </div>
);

// ─── MAIN COMPONENT ───

const products = [
  {
    id: "voice",
    badgeLabel: "● Live",
    badgeStyles: "text-[#10B981] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.15)]",
    title: "AI Voice Agent",
    description: "Your AI receptionist that answers calls, books appointments, handles FAQs, and transfers to humans when needed. Speaks Hindi and English. Works 24/7/365.",
    features: [
      "Handles 100+ simultaneous calls",
      "Hindi & English with natural voice",
      "Books appointments to Google Calendar",
      "Intelligent escalation to humans"
    ],
    buttonText: "Explore Voice Agent →",
    buttonLink: "/products/voice-agent",
    alignment: "left",
    VisualComponent: VoiceVisual
  },
  {
    id: "chat",
    badgeLabel: "● Live",
    badgeStyles: "text-[#10B981] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.15)]",
    title: "AI Chat Agent",
    description: "Embed an intelligent chatbot on your website that understands your business, answers questions, captures leads, and never sleeps.",
    features: [
      "Learns from your docs and FAQs",
      "Captures leads automatically",
      "Escalates complex queries",
      "Embeds in 2 minutes"
    ],
    buttonText: "Explore Chat Agent →",
    buttonLink: "/products/chat-agent",
    alignment: "right",
    VisualComponent: ChatVisual
  },
  {
    id: "social",
    badgeLabel: "● Beta",
    badgeStyles: "text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.15)]",
    title: "AI Social Media Agent",
    description: "Generate, schedule, and post content across Instagram and social platforms. AI creates captions, suggests hashtags, and maintains your brand voice.",
    features: [
      "Auto-generates captions & hashtags",
      "Maintains brand voice consistency",
      "Schedules posts automatically",
      "Performance analytics"
    ],
    buttonText: "Explore Social Agent →",
    buttonLink: "/products/social-agent",
    alignment: "left",
    VisualComponent: SocialVisual
  },
  {
    id: "workflow",
    badgeLabel: "◐ Coming Soon",
    badgeStyles: "text-[#6B6088] bg-[rgba(107,96,136,0.1)] border border-[rgba(107,96,136,0.15)]",
    title: "AI Workflow Agent",
    description: "Connect multiple tools together to automate multi-step business processes natively. Data extraction, intelligent routing, and pipeline reporting done autonomously.",
    features: [
      "Connects multiple tools instantly",
      "Automates multi-step processes",
      "Data extraction and reporting",
      "Advanced branching logic"
    ],
    buttonText: "Explore Workflow Agent →",
    buttonLink: "/products/workflow-agent",
    alignment: "right",
    VisualComponent: WorkflowVisual
  }
];

export function ProductsShowcase() {
  return (
    <section id="products" className="w-full bg-[#080010] pt-[100px] pb-[60px] overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-[20px] md:px-[80px]">
        
        {/* HEADER */}
        <div className="flex flex-col items-center text-center mb-[80px]">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#A78BFA] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[20px]"
          >
            ✦ Our Products
          </motion.div>

          {/* Heading */}
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-[34px] md:text-[42px] text-[#F5F3FF] tracking-[-0.02em] mb-[16px] leading-tight"
          >
            AI Agents That <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #FBBF24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Actually</span> Work.
          </motion.h2>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-sans font-normal text-[16px] md:text-[18px] text-[#A8A0C0] max-w-[580px] mx-auto leading-[1.6]"
          >
            Not demos. Not concepts. Production-ready AI agents deployed in real businesses.
          </motion.p>
        </div>

        {/* PRODUCTS LIST */}
        <div className="flex flex-col gap-[80px]">
          {products.map((product, idx) => {
            const isReversed = product.alignment === "right";
            
            return (
              <React.Fragment key={product.id}>
                <div className={`flex flex-col md:flex-row items-center gap-[60px] ${isReversed ? 'md:flex-row-reverse' : ''}`}>
                  
                  {/* TEXT COLUMN */}
                  <motion.div 
                    initial={{ opacity: 0, x: isReversed ? 50 : -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="w-full md:w-1/2 flex flex-col items-start text-left"
                  >
                    {/* Badge */}
                    <div className={`font-sans font-medium text-[12px] px-[12px] py-[4px] rounded-full inline-block ${product.badgeStyles}`}>
                      {product.badgeLabel}
                    </div>

                    {/* Title */}
                    <h3 className="mt-[16px] font-display font-bold text-[32px] text-[#F5F3FF] leading-tight">
                      {product.title}
                    </h3>

                    {/* Description */}
                    <p className="mt-[16px] font-sans font-normal text-[16px] text-[#A8A0C0] leading-[1.7]">
                      {product.description}
                    </p>

                    {/* Feature List */}
                    <div className="mt-[24px] flex flex-col gap-[12px] w-full">
                      {product.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-[10px]">
                          <Check size={18} className="text-[#10B981] shrink-0 mt-[2px]" />
                          <span className="font-sans font-normal text-[15px] text-[#A8A0C0]">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <Link 
                      href={product.buttonLink}
                      className="mt-[28px] px-[24px] py-[12px] rounded-[10px] border border-[#2D1255] text-[#A78BFA] font-sans font-medium text-[15px] hover:border-[#8B5CF6] hover:bg-[rgba(139,92,246,0.05)] transition-all duration-300 inline-block"
                    >
                      {product.buttonText}
                    </Link>
                  </motion.div>

                  {/* VISUAL COLUMN */}
                  <motion.div 
                    initial={{ opacity: 0, x: isReversed ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                    className="w-full md:w-1/2"
                  >
                    <product.VisualComponent />
                  </motion.div>

                </div>

                {/* Separator Line (except after last item) */}
                {idx < products.length - 1 && (
                  <div className="w-2/5 mx-auto h-[1px] bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent opacity-30" />
                )}
              </React.Fragment>
            );
          })}
        </div>

      </div>
    </section>
  );
}
