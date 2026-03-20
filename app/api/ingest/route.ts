import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
// @ts-ignore
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
// @ts-ignore
import pdf from 'pdf-parse';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const documentId = formData.get('document_id') as string;

        if (!file || !documentId) {
            return NextResponse.json({ error: 'File and Document ID are required.' }, { status: 400 });
        }

        // 1. Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Extract Text using pdf-parse
        let text = '';
        try {
            const data = await pdf(buffer);
            text = data.text;
        } catch (parseError) {
            console.error("PDF Parse Error:", parseError);
            return NextResponse.json({ error: 'Failed to parse PDF content.' }, { status: 500 });
        }

        if (!text || !text.trim()) {
            return NextResponse.json({ error: 'PDF content is empty or unreadable (may be scanned image).' }, { status: 400 });
        }

        // 3. Split Text into Chunks (1000 characters)
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200, // Small overlap for context continuity
        });

        const output = await splitter.createDocuments([text]);

        // Prepare data for insertion (map only what we need)
        const chunksToInsert = output.map((chunk: any) => ({
            document_id: documentId,
            content: chunk.pageContent,
            // metadata: chunk.metadata // Optional: add page numbers if needed later
        }));

        // 4. Save to Supabase (document_sections table)
        const supabase = await createClient();

        // Check user authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Insert chunks
        const { error } = await supabase
            .from('document_sections')
            .insert(chunksToInsert);

        if (error) {
            console.error("Supabase Insert Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully indexed ${chunksToInsert.length} sections.`
        });

    } catch (error: any) {
        console.error("Ingest API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
