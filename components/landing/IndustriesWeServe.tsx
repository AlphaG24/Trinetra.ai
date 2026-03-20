"use client";

import { motion } from "framer-motion";

const industries = [
  {
    icon: "🏥",
    title: "Healthcare & Clinics",
    desc: "Patient calls, appointments, follow-ups"
  },
  {
    icon: "🍽️",
    title: "Restaurants & Cafes",
    desc: "Reservations, menu queries, orders"
  },
  {
    icon: "🏠",
    title: "Real Estate",
    desc: "Property inquiries, site visit scheduling"
  },
  {
    icon: "💇",
    title: "Salons & Spas",
    desc: "Booking, reminders, service info"
  },
  {
    icon: "🏋️",
    title: "Fitness & Gyms",
    desc: "Membership queries, class schedules"
  },
  {
    icon: "🏫",
    title: "Education & Coaching",
    desc: "Enrollment, doubts, fee inquiries"
  }
];

export function IndustriesWeServe() {
  return (
    <section className="w-full bg-[#080010] pt-[80px] pb-[100px] overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-[20px] md:px-[80px]">
        
        {/* HEADER */}
        <div className="flex flex-col items-center text-center mb-[56px]">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#A78BFA] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[20px]"
          >
            ✦ Industries
          </motion.div>

          {/* Heading */}
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-[32px] md:text-[42px] text-[#F5F3FF] tracking-[-0.02em] mb-[16px] leading-tight"
          >
            Pre-Trained for Your Industry.
          </motion.h2>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-sans font-normal text-[16px] md:text-[18px] text-[#A8A0C0] max-w-[600px] mx-auto leading-[1.6]"
          >
            One-click industry templates. Your AI agent understands your business from day one.
          </motion.p>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
          {industries.map((industry, idx) => (
            <motion.div
              key={industry.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * idx }}
              className="group bg-[#0C0118] border border-[#1E0A35] rounded-[14px] p-[28px] flex items-center gap-[16px] cursor-pointer transition-all duration-300 hover:bg-[#130224] hover:border-[#2D1255] hover:translate-x-[4px]"
            >
              {/* Emoji Icon */}
              <div className="text-[32px] leading-none shrink-0">
                {industry.icon}
              </div>

              {/* Text Content */}
              <div className="flex flex-col overflow-hidden">
                <h3 className="font-display font-semibold text-[17px] text-[#F5F3FF] mb-[2px] truncate">
                  {industry.title}
                </h3>
                <p className="font-sans text-[13px] text-[#6B6088] truncate">
                  {industry.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
