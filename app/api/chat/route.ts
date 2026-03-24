import { NextResponse } from "next/server";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

const FALLBACK_REPLY =
  "I'm having trouble thinking right now. You can reach our team directly at +91 95806 19562. We'd love to help!";

const SYSTEM_INSTRUCTION = `You are Netra, the AI assistant on the Trinetra AI website (trinetraai.com). Trinetra AI builds autonomous AI agents for businesses in India.

ABOUT TRINETRA AI:
- Trinetra means 'Third Eye' - divine vision
- We build AI agents that handle business operations autonomously
- Founded in India, for Indian businesses

OUR PRODUCTS:
1. AI Voice Agent (LIVE): Handles phone calls 24/7, books appointments, answers questions. Supports Hindi and English naturally. Callers cannot tell it is AI. Setup in under 24 hours.
2. AI Chat Agent (COMING SOON): Website chatbot that answers visitor questions and captures leads automatically.
3. AI Social Media Agent (COMING SOON): Generates and schedules social media content for Instagram.
4. AI Workflow Agent (COMING SOON): Automates multi-step business processes.
5. ExamAI - GATE Platform (COMING SOON): Adaptive exam preparation for GATE engineering exam.

PRICING:
- Starter Plan: Rs 5,999 per month - 1 AI agent, 150 voice minutes or 500 chat conversations, Hindi + English, email support
- Growth Plan: Rs 12,999 per month - 3 AI agents, 400 voice minutes, 1500 chats, ROI dashboard, priority support (MOST POPULAR)
- Scale Plan: Rs 25,999 per month - 7 AI agents, 1200 voice minutes, 5000 chats, custom voice, API access, dedicated manager
- Annual billing: 20% discount on all plans
- All plans: no setup fee, cancel anytime, 7-day money-back guarantee

CONTACT:
- Phone: +91 95806 19562 or +91 94520 45499
- LinkedIn: https://www.linkedin.com/in/trinetraedu-ai-7402143b8
- Website: https://trinetraai.com

KEY SELLING POINTS:
- Setup in under 24 hours
- Hindi and English support (natural, not translated)
- Starts from Rs 2 per interaction
- Real-time ROI dashboard shows exactly how much money you save
- 24/7 availability - your AI never sleeps, never takes leave

YOUR BEHAVIOR RULES:
1. Be helpful, friendly, and concise. Keep responses to 2-3 sentences unless the user asks for detail.
2. If the user asks about something you do not know, say: I am not sure about that, but our team can help! You can reach us at +91 95806 19562.
3. Never make up features or pricing that is not listed above.
4. If the user seems interested in buying or trying an agent, naturally guide them toward sharing their details by saying something like: I can have our team reach out to you! Can I get your name and phone number?
5. If the user types in Hindi, respond in Hindi.
6. Use the current page context when it helps.
7. Do not use markdown formatting. Keep your responses as plain text.
8. If the user shares their name and phone number, confirm the details and say the team will call within 2 hours.
9. You are Netra, not ChatGPT or any other AI. Never say you are made by Google or OpenAI. You are made by Trinetra AI.`;

interface IncomingMessage {
  role: "assistant" | "user";
  content: string;
}

interface GroqCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export const runtime = "nodejs";

function containsHindi(text: string) {
  return /[\u0900-\u097f]/.test(text);
}

function extractLeadName(text: string) {
  const explicitMatch = text.match(
    /(?:my name is|i am|i'm|this is)\s+([a-z]+(?:\s+[a-z]+){0,3})(?=\s+(?:and\b|my\b|phone\b|number\b)|[,.!?]|$)/i
  );

  if (explicitMatch?.[1]) {
    return explicitMatch[1].trim().replace(/\s+/g, " ");
  }

  return null;
}

function extractLeadPhone(text: string) {
  const match = text.match(/(?:\+91[\s-]*)?(?:\d[\s-]*){10,12}/);
  if (!match) {
    return null;
  }

  const raw = match[0].trim();
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  return raw.startsWith("+91") ? raw : null;
}

function extractInterest(text: string) {
  const normalized = text.toLowerCase();

  if (normalized.includes("voice")) return "voice";
  if (normalized.includes("chat")) return "chat";
  if (normalized.includes("social")) return "social";
  if (normalized.includes("workflow")) return "workflow";
  if (normalized.includes("agent")) return "general";

  return null;
}

function askedForContact(history: IncomingMessage[]) {
  const lastAssistantMessage = [...history].reverse().find((item) => item.role === "assistant");
  if (!lastAssistantMessage) {
    return false;
  }

  return /(name and phone number|your name|phone number|contact details|reach out)/i.test(
    lastAssistantMessage.content
  );
}

function extractStandaloneName(message: string) {
  const normalized = message
    .trim()
    .replace(/^(it'?s|its|this is)\s+/i, "")
    .trim();

  if (!normalized || /\d/.test(normalized) || normalized.includes("?")) {
    return null;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length >= 1 && words.length <= 4) {
    return normalized;
  }

  return null;
}

function labelInterest(interest: string) {
  if (interest === "voice") return "AI Voice Agent";
  if (interest === "chat") return "AI Chat Agent";
  if (interest === "social") return "AI Social Media Agent";
  if (interest === "workflow") return "AI Workflow Agent";
  return "the right AI setup for your business";
}

function buildFallbackReply(message: string, page: string, history: IncomingMessage[]) {
  const text = message.toLowerCase();
  const isHindi = containsHindi(message);
  const currentPhone = extractLeadPhone(message);
  const allUserText = [...history, { role: "user", content: message }]
    .filter((item) => item.role === "user")
    .map((item) => item.content)
    .join(" ");
  const leadName =
    extractLeadName(message) ||
    (askedForContact(history) ? extractStandaloneName(message) : null) ||
    extractLeadName(allUserText);
  const leadPhone = currentPhone || extractLeadPhone(allUserText);
  const interest = extractInterest(message) || extractInterest(allUserText) || "general";

  if (currentPhone && leadName && leadPhone) {
    const interestLabel = labelInterest(interest);
    return isHindi
      ? `Thanks ${leadName}. Maine aapka number ${leadPhone} note kar liya hai, aur interest ${interestLabel} ke liye mark kar diya hai. Hamari team 2 ghante ke andar aapse contact karegi.`
      : `Thanks ${leadName}. I've noted your number as ${leadPhone} and marked your interest in ${interestLabel}. Our team will call you within 2 hours.`;
  }

  if (
    /(what do you provide|what do you do|what can you do|what do you offer|tell me what you provide|services)/.test(
      text
    )
  ) {
    return isHindi
      ? "Hum businesses ke liye AI agents banate hain. Abhi AI Voice Agent live hai, aur Chat, Social Media, aur Workflow Agents coming soon hain. Main aapko products, pricing, ya getting started mein help kar sakti hoon."
      : "We build AI agents for businesses. Our AI Voice Agent is live, and our Chat, Social Media, and Workflow Agents are coming soon. I can help you with products, pricing, or the best place to start.";
  }

  if (
    /(automation|automate|business automation|operations|workflow|process)/.test(text) &&
    !/(price|pricing|cost|plan)/.test(text)
  ) {
    return isHindi
      ? "Hum business automation mein calls, follow-ups, lead handling, aur repeat workflows ko automate karne mein help karte hain. Abhi Voice Agent live hai, aur workflow-focused automation rollout mein hai. Aap apna exact use case batayein, main best starting point suggest karungi."
      : "We help automate business operations like calls, lead handling, follow-ups, and repeat workflows. The Voice Agent is live today, and broader workflow automation is in rollout. Tell me your exact use case and I can suggest the best starting point.";
  }

  if (
    /(designer|assistant|scheduler|schedule|manage tasks|organize work|personal assistant)/.test(
      text
    )
  ) {
    return isHindi
      ? "Aapke use case ke liye workflow-style automation sabse relevant rahega, aur call handling ke liye Voice Agent useful ho sakta hai. Workflow Agent abhi coming soon hai, lekin hamari team aapke process ke hisaab se right setup recommend kar sakti hai. Kya aap apna naam aur phone number share karenge?"
      : "For that use case, workflow-style automation would be the closest fit, and the Voice Agent can help with call handling. Our Workflow Agent is still coming soon, but our team can recommend the right setup for your process. If you want, share your name and phone number and we'll reach out.";
  }

  if (
    /(buy|pricing|price|cost|plan|starter|growth|scale|annual|monthly)/.test(text) ||
    (page.includes("/pricing") && /(which|what|help|recommend|suggest)/.test(text))
  ) {
    return isHindi
      ? "Hamare plans Starter Rs 5,999, Growth Rs 12,999 aur Scale Rs 25,999 per month se start hote hain. Agar aap chahen to main aapke use case ke hisab se sahi plan suggest kar sakti hoon."
      : "Our plans start at Rs 5,999 for Starter, Rs 12,999 for Growth, and Rs 25,999 for Scale per month. If you want, I can help you choose the right plan based on your expected call or chat volume.";
  }

  if (/(voice|call)/.test(text)) {
    return isHindi
      ? "AI Voice Agent live hai aur 24/7 calls handle karta hai, appointments book karta hai, aur Hindi-English mein naturally baat karta hai. Setup 24 hours ke andar ho jata hai."
      : "Our AI Voice Agent is live and handles calls 24/7, books appointments, and speaks naturally in Hindi and English. Setup is typically done in under 24 hours.";
  }

  if (/(chat|chatbot|website)/.test(text)) {
    return isHindi
      ? "AI Chat Agent abhi coming soon hai. Yeh website visitors ke sawaal handle karega aur leads capture karega."
      : "Our AI Chat Agent is coming soon. It is being built to answer website visitor questions and capture leads automatically.";
  }

  if (/(social|instagram|content)/.test(text)) {
    return isHindi
      ? "AI Social Media Agent abhi coming soon hai. Yeh Instagram ke liye content generate aur schedule karega."
      : "Our AI Social Media Agent is coming soon. It is designed to generate and schedule Instagram content for businesses.";
  }

  if (/(contact|phone number|call me|reach|linkedin)/.test(text)) {
    return isHindi
      ? "Aap humse +91 95806 19562 ya +91 94520 45499 par contact kar sakte hain. LinkedIn par bhi hum available hain: https://www.linkedin.com/in/trinetraedu-ai-7402143b8."
      : "You can reach our team at +91 95806 19562 or +91 94520 45499. You can also connect with us on LinkedIn at https://www.linkedin.com/in/trinetraedu-ai-7402143b8.";
  }

  if (
    /(start|get started|demo|trial|interested|book|deploy|setup|want)/.test(text) ||
    page.includes("/contact")
  ) {
    return isHindi
      ? "Main aapki help kar sakti hoon shuru karne mein. Kya aap apna naam aur phone number share karenge? Hamari team 2 ghante ke andar call karegi."
      : "I can help you get started. If you share your name and phone number, our team can call you within 2 hours and guide you further.";
  }

  if (/(about|story|company|trinetra|who are you)/.test(text) || page.includes("/about")) {
    return isHindi
      ? "Trinetra ka matlab Third Eye hai. Hum India ke businesses ke liye AI agents banate hain jo calls, chats aur workflows ko autonomously handle karte hain."
      : "Trinetra means Third Eye. We build autonomous AI agents for Indian businesses to handle calls, chats, and workflows with fast setup and measurable ROI.";
  }

  return isHindi
    ? "Hum Indian businesses ke liye AI agents banate hain jo calls, chats aur operations ko automate karte hain. Aap pricing, products ya getting started ke baare mein pooch sakte hain."
    : "We build AI agents for Indian businesses to automate calls, chats, and operations. You can ask me about our agents, pricing, or how to get started.";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as
      | {
          message?: unknown;
          history?: unknown;
          page?: unknown;
        }
      | null;

    const message = typeof payload?.message === "string" ? payload.message.trim() : "";
    const page = typeof payload?.page === "string" ? payload.page.trim() || "/" : "/";
    const history = Array.isArray(payload?.history)
      ? payload.history.filter(
          (item): item is IncomingMessage =>
            !!item &&
            typeof item === "object" &&
            ((item as IncomingMessage).role === "assistant" ||
              (item as IncomingMessage).role === "user") &&
            typeof (item as IncomingMessage).content === "string"
        )
      : [];

    if (!message) {
      return NextResponse.json({ reply: FALLBACK_REPLY });
    }

    const fallbackReply = buildFallbackReply(message, page, history);
    const groqApiKey = process.env.GROQ_API_KEY?.trim();
    if (!groqApiKey) {
      console.error("GROQ_API_KEY is missing.");
      return NextResponse.json({ reply: fallbackReply });
    }

    const conversation: IncomingMessage[] = [...history.slice(-12), { role: "user", content: message }];
    const firstUserIndex = conversation.findIndex((item) => item.role === "user");

    const messages = [
      { role: "system", content: SYSTEM_INSTRUCTION },
      ...conversation.map((item, index) => ({
        role: item.role,
        content:
          index === firstUserIndex
            ? `${item.content} (User is currently on the ${page} page)`
            : item.content,
      })),
    ];

    const groqResponse = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 350,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error", groqResponse.status, errorText);
      return NextResponse.json({ reply: fallbackReply });
    }

    const groqPayload = (await groqResponse.json()) as GroqCompletionResponse;
    const reply = groqPayload.choices?.[0]?.message?.content?.trim() || fallbackReply;

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Netra chat route error", error);
    return NextResponse.json({ reply: FALLBACK_REPLY });
  }
}
