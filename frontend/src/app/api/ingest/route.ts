import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

import { createClient } from "@/utils/supabase/server";

function splitTextIntoChunks(text: string, chunkSize = 1000, chunkOverlap = 200) {
  const normalizedText = text.replace(/\r\n/g, "\n").trim();

  if (!normalizedText) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalizedText.length) {
    let end = Math.min(start + chunkSize, normalizedText.length);

    if (end < normalizedText.length) {
      const lastParagraphBreak = normalizedText.lastIndexOf("\n\n", end);
      const lastLineBreak = normalizedText.lastIndexOf("\n", end);
      const lastSentenceBreak = Math.max(
        normalizedText.lastIndexOf(". ", end),
        normalizedText.lastIndexOf("? ", end),
        normalizedText.lastIndexOf("! ", end)
      );
      const splitPoint = [lastParagraphBreak, lastLineBreak, lastSentenceBreak]
        .filter((point) => point > start + Math.floor(chunkSize * 0.5))
        .sort((a, b) => b - a)[0];

      if (splitPoint) {
        end = splitPoint + 1;
      }
    }

    const chunk = normalizedText.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalizedText.length) {
      break;
    }

    start = Math.max(end - chunkOverlap, start + 1);
  }

  return chunks;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const documentId = formData.get("document_id") as string;

    if (!file || !documentId) {
      return NextResponse.json({ error: "File and Document ID are required." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = "";
    const parser = new PDFParse({ data: buffer });

    try {
      const data = await parser.getText();
      text = data.text;
    } catch (parseError) {
      console.error("PDF Parse Error:", parseError);
      return NextResponse.json({ error: "Failed to parse PDF content." }, { status: 500 });
    } finally {
      await parser.destroy().catch(() => undefined);
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "PDF content is empty or unreadable (may be scanned image)." },
        { status: 400 }
      );
    }

    const chunksToInsert = splitTextIntoChunks(text, 1000, 200).map((content) => ({
      document_id: documentId,
      content,
    }));

    if (chunksToInsert.length === 0) {
      return NextResponse.json({ error: "No text chunks could be created from the PDF." }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.from("document_sections").insert(chunksToInsert);

    if (error) {
      console.error("Supabase Insert Error:", error);
      // SECURITY: Never expose internal error details
      return NextResponse.json({ error: "Ingestion failed." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully indexed ${chunksToInsert.length} sections.`,
    });
  } catch (error: unknown) {
    console.error("Ingest API Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
