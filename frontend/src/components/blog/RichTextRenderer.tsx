"use client";

import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      parts.push(
        <a
          key={`${keyPrefix}-link-${index}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="text-[#D7C4F7] underline transition-colors hover:text-[#FAF7FF]"
        >
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      parts.push(
        <strong key={`${keyPrefix}-bold-${index}`} className="font-semibold text-[#FAF7FF]">
          {match[4]}
        </strong>
      );
    } else if (match[5]) {
      parts.push(
        <em key={`${keyPrefix}-italic-${index}`} className="italic">
          {match[5]}
        </em>
      );
    }

    lastIndex = pattern.lastIndex;
    index += 1;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function renderTextBlock(block: string, key: string) {
  const lines = block.split("\n").map((line) => line.trimEnd());
  const cleanLines = lines.filter((line) => line.trim() !== "");

  if (cleanLines.length === 0) {
    return null;
  }

  if (cleanLines.every((line) => /^[-*]\s+/.test(line))) {
    return (
      <ul key={key} className="list-disc space-y-[8px] pl-[22px]">
        {cleanLines.map((line, index) => (
          <li key={`${key}-li-${index}`}>{renderInline(line.replace(/^[-*]\s+/, ""), `${key}-${index}`)}</li>
        ))}
      </ul>
    );
  }

  if (cleanLines.every((line) => /^\d+\.\s+/.test(line))) {
    return (
      <ol key={key} className="list-decimal space-y-[8px] pl-[22px]">
        {cleanLines.map((line, index) => (
          <li key={`${key}-li-${index}`}>{renderInline(line.replace(/^\d+\.\s+/, ""), `${key}-${index}`)}</li>
        ))}
      </ol>
    );
  }

  if (cleanLines.length === 1 && /^###\s+/.test(cleanLines[0])) {
    return (
      <h3 key={key} className="font-display text-[24px] font-semibold text-[#FAF7FF]">
        {renderInline(cleanLines[0].replace(/^###\s+/, ""), key)}
      </h3>
    );
  }

  if (cleanLines.length === 1 && /^##\s+/.test(cleanLines[0])) {
    return (
      <h2 key={key} className="font-display text-[28px] font-semibold text-[#FAF7FF]">
        {renderInline(cleanLines[0].replace(/^##\s+/, ""), key)}
      </h2>
    );
  }

  if (cleanLines.length === 1 && /^#\s+/.test(cleanLines[0])) {
    return (
      <h1 key={key} className="font-display text-[32px] font-bold text-[#FAF7FF]">
        {renderInline(cleanLines[0].replace(/^#\s+/, ""), key)}
      </h1>
    );
  }

  return (
    <p key={key} className="font-sans text-[16px] leading-[1.8] text-[#B8B0D1]">
      {renderInline(cleanLines.join(" "), key)}
    </p>
  );
}

export function RichTextRenderer({ content }: { content: string }) {
  const sections = content.split(/```/g);

  return (
    <div className="space-y-[24px]">
      {sections.map((section, index) => {
        if (index % 2 === 1) {
          return (
            <pre
              key={`code-${index}`}
              className="overflow-x-auto rounded-[16px] border border-[#1E0A35] bg-[#0C0118] p-[20px] font-mono text-[14px] leading-[1.7] text-[#D6CCF5]"
            >
              <code>{section.trim()}</code>
            </pre>
          );
        }

        return section
          .split(/\n\s*\n/g)
          .map((block, blockIndex) => renderTextBlock(block.trim(), `block-${index}-${blockIndex}`));
      })}
    </div>
  );
}
