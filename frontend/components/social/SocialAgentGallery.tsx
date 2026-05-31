"use client";

import Image from "next/image";
import { Bookmark, Heart, MessageCircle, MoreVertical, Send } from "lucide-react";

import { getConfigString, hasConfiguredValue, useSiteConfig } from "@/lib/site-content";

type StickyNote = {
  color: string;
  rotation: string;
  title: string[];
};

const notes: StickyNote[] = [
  {
    color: "from-[#7DB6FF] to-[#5B8DFF]",
    rotation: "-rotate-[8deg]",
    title: ["AI", "AUTOMATIONS"],
  },
  {
    color: "from-[#FFF17E] to-[#FFE042]",
    rotation: "rotate-[8deg]",
    title: ["VIDEO", "EDITING"],
  },
  {
    color: "from-[#72F4D9] to-[#55D7E8]",
    rotation: "-rotate-[6deg]",
    title: ["AI VOICE", "AGENTS"],
  },
  {
    color: "from-[#FF72E8] to-[#F858D4]",
    rotation: "-rotate-[6deg]",
    title: ["TEST", "SERIES", "(GATE)"],
  },
  {
    color: "from-[#FFD27A] to-[#FFB14D]",
    rotation: "rotate-[3deg]",
    title: ["SEMESTER", "EXAMS", "PREPARATION"],
  },
  {
    color: "from-[#E1A7FF] to-[#C98BFF]",
    rotation: "-rotate-[7deg]",
    title: ["1:1", "MENTORSHIP"],
  },
];

export function SocialAgentGallery() {
  const { data: siteConfig } = useSiteConfig();
  const phone1 = getConfigString(siteConfig, "company_phone_1");
  const phone2 = getConfigString(siteConfig, "company_phone_2");
  const hasPhoneBlock = hasConfiguredValue(phone1) || hasConfiguredValue(phone2);

  return (
    <div className="mx-auto w-full max-w-[296px] overflow-hidden rounded-[18px] border border-[#E8E2F6]/30 bg-[#F7F4FF] shadow-[0_18px_56px_rgba(0,0,0,0.16)]">
      <div className="flex items-center justify-between bg-[#FBFAFF] px-[12px] py-[9px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full border border-[#D8D0EA] bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
            <Image
              src="/trident.png"
              alt="Trinetra logo"
              width={30}
              height={30}
              className="h-auto w-[30px] object-contain brightness-0 contrast-150 saturate-0"
            />
          </div>
          <div className="text-[13px] font-semibold text-[#1A1330]">trinetraedu.ai</div>
        </div>
        <MoreVertical size={15} className="text-[#2B2343]" />
      </div>

      <div className="bg-[#1B1B1B] px-[12px] pb-[14px] pt-[10px]">
        {hasPhoneBlock ? (
          <div className="mb-[10px] flex justify-end text-right text-[8px] font-semibold uppercase tracking-[0.08em] text-[#E5C84D]">
            <div>
              {hasConfiguredValue(phone1) ? `MOB NO- ${phone1}` : null}
              {hasConfiguredValue(phone1) && hasConfiguredValue(phone2) ? <br /> : null}
              {hasConfiguredValue(phone2) ? phone2 : null}
            </div>
          </div>
        ) : null}

        <div className="mb-[8px] flex justify-center">
          <Image
            src="/trident.png"
            alt="Trinetra emblem"
            width={80}
            height={80}
            className="h-auto w-[80px] object-contain brightness-0 invert"
          />
        </div>

        <div className="text-center">
          <div className="text-[10px] font-medium tracking-[0.02em] text-[#D1B84C]">
            Things to learn about
          </div>
          <div className="mt-[4px] font-display text-[31px] font-bold leading-[0.92] text-white">
            Trinetra
          </div>
          <div className="font-display text-[31px] font-bold leading-[0.92] text-[#FFD526]">
            edu.ai
          </div>
        </div>

        <div className="mx-auto mt-[10px] w-fit rounded-full border-[2px] border-white px-[12px] py-[5px] text-center text-[9px] font-medium text-[#F7F0DA] shadow-[0_10px_22px_rgba(0,0,0,0.2)]">
          One stop solution for every problem you had
        </div>

        <div className="mt-[14px] grid grid-cols-3 gap-[8px]">
          {notes.map((note) => (
            <div
              key={note.title.join("-")}
              className={`${note.rotation} flex h-[78px] items-center justify-center rounded-[4px] bg-gradient-to-br ${note.color} px-[6px] text-center shadow-[0_12px_18px_rgba(0,0,0,0.26)]`}
            >
              <div className="font-sans text-[7px] font-extrabold uppercase leading-[1.12] tracking-[0.02em] text-[#171717]">
                {note.title.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-[10px] text-center text-[9px] text-white/88">and many more........</div>
      </div>

      <div className="bg-[#FBFAFF] px-[12px] pb-[12px] pt-[9px]">
        <div className="mb-[8px] flex items-center justify-between">
          <div className="flex items-center gap-[12px] text-[#141023]">
            <Heart size={18} strokeWidth={2.2} />
            <MessageCircle size={18} strokeWidth={2.2} />
            <Send size={17} strokeWidth={2.2} />
          </div>
          <Bookmark size={17} className="text-[#141023]" strokeWidth={2.2} />
        </div>

        <div className="text-[11px] font-semibold text-[#151127]">View insights</div>

        <div className="mt-[10px] text-[10px] leading-[1.5] text-[#2E2545]">
          <span className="mr-[6px] font-semibold text-[#151127]">trinetraedu.ai</span>
          Tired of switching between 10 platforms? We fixed it. AI tools, test series,
          1:1 mentorship, and skills in one place.
        </div>
      </div>
    </div>
  );
}
