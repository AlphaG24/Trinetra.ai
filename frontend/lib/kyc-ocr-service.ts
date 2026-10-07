export interface OCRVerificationInput {
  fileBase64: string
  mimeType: string
  documentType: string
  rawIdNumber?: string
  expectedEntityName?: string
}

export interface OCRVerificationResult {
  isAuthenticCategory: boolean
  detectedDocumentType: string
  detectedTitle: string
  extractedIdNumber: string | null
  idNumberMatches: boolean
  extractedEntityName: string | null
  entityNameMatches: boolean
  confidenceScore: number
  verificationStatus: 'passed' | 'failed' | 'flagged_for_human_review'
  summaryReason: string
  rawExtractedSnippet?: string
}

const DOCUMENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  gstin_certificate: 'Government of India Form GST REG-06 GST Registration Certificate',
  authorized_signatory_id: 'Government of India Masked e-Aadhaar or Passport',
  company_pan: 'Income Tax Department Permanent Account Number (PAN) Card',
  incorporation_cert: 'Ministry of Corporate Affairs (MCA) Certificate of Incorporation',
  utility_bill: 'Commercial Electricity, Water, or Landline Telephone Utility Bill',
}

/**
 * Performs automated Multimodal OCR & Document Authenticity Verification
 * using Gemini 2.5 Flash with fallback heuristics.
 */
export async function verifyDocumentWithOCR({
  fileBase64,
  mimeType,
  documentType,
  rawIdNumber,
  expectedEntityName,
}: OCRVerificationInput): Promise<OCRVerificationResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  if (!apiKey) {
    console.warn('[KYC OCR] GEMINI_API_KEY / GOOGLE_API_KEY missing. Flagging for manual review.')
    return {
      isAuthenticCategory: true,
      detectedDocumentType: 'unverified_ocr_offline',
      detectedTitle: 'Document Awaiting Manual Inspection',
      extractedIdNumber: null,
      idNumberMatches: true,
      extractedEntityName: null,
      entityNameMatches: true,
      confidenceScore: 0.5,
      verificationStatus: 'flagged_for_human_review',
      summaryReason: 'Automated OCR service key not configured; document routed to manual officer review queue.',
    }
  }

  const expectedTypeDesc = DOCUMENT_TYPE_DESCRIPTIONS[documentType] || documentType

  const systemPrompt = `You are an expert Document Authentication & KYC Forensic Compliance Specialist for Indian statutory regulatory documents.
You are inspecting an uploaded document to authenticate whether it is genuine, matches the claimed statutory category, and matches the user's provided identifiers.

User Claimed Document Category: "${documentType}" (${expectedTypeDesc})
User-Provided ID Number: "${rawIdNumber || 'None provided'}"
Expected Organization / Signatory Name: "${expectedEntityName || 'Not specified'}"

CRITICAL INSTRUCTIONS:
1. Examine the document text, logos, emblem, headers, and structure.
2. Determine what this document ACTUALLY is:
   - If the user claimed "gstin_certificate", is this truly a "Form GST REG-06" (Government of India GST Registration Certificate)?
   - If the document is an educational marksheet (e.g. CBSE / State Board / University / 10th or 12th marksheet), college diploma, electricity bill, driving license, resume, or blank image, IMMEDIATELY flag "is_authentic_category": false and "verification_status": "failed".
3. Extract identifiers:
   - For GST: Extract the 15-character GSTIN (e.g. 27AABCU9603R1ZM).
   - For PAN: Extract the 10-character PAN (e.g. ABCDE1234F).
   - For Aadhaar: Extract the 12-digit or masked Aadhaar number.
4. Compare extracted values against User-Provided ID Number:
   - If user provided an ID number, does it match the printed identifier?
   - If the document does not contain the claimed ID number (e.g. user provided a real GST number but uploaded a marksheet that has no GST number), "id_number_matches" MUST be false.
5. If the document is completely fake, invalid, or belongs to a different category, "verification_status" MUST be "failed".

Return ONLY raw JSON with no markdown formatting:
{
  "is_authentic_category": boolean,
  "detected_document_type": string,
  "detected_title": string,
  "extracted_id_number": string | null,
  "id_number_matches": boolean,
  "extracted_entity_name": string | null,
  "entity_name_matches": boolean,
  "confidence_score": number,
  "verification_status": "passed" | "failed" | "flagged_for_human_review",
  "summary_reason": string
}`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    // Format clean base64 payload
    let cleanBase64 = fileBase64
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1]
    }

    const payload = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            {
              inline_data: {
                mime_type: mimeType || 'application/pdf',
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.warn(`[KYC OCR] Gemini Vision error (${response.status}):`, errText)
      return {
        isAuthenticCategory: true,
        detectedDocumentType: 'manual_verification_required',
        detectedTitle: 'Document Pending Verification',
        extractedIdNumber: null,
        idNumberMatches: true,
        extractedEntityName: null,
        entityNameMatches: true,
        confidenceScore: 0.6,
        verificationStatus: 'flagged_for_human_review',
        summaryReason: 'Automated OCR service encountered rate limit; routed to compliance officer queue.',
      }
    }

    const resJson = await response.json()
    const rawContent = resJson?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawContent) {
      throw new Error('Empty response from Gemini OCR')
    }

    const cleanContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(cleanContent)

    return {
      isAuthenticCategory: Boolean(parsed.is_authentic_category),
      detectedDocumentType: parsed.detected_document_type || 'unknown',
      detectedTitle: parsed.detected_title || 'Unknown Document',
      extractedIdNumber: parsed.extracted_id_number || null,
      idNumberMatches: Boolean(parsed.id_number_matches),
      extractedEntityName: parsed.extracted_entity_name || null,
      entityNameMatches: Boolean(parsed.entity_name_matches),
      confidenceScore: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.85,
      verificationStatus: parsed.verification_status || (parsed.is_authentic_category ? 'passed' : 'failed'),
      summaryReason: parsed.summary_reason || (parsed.is_authentic_category ? 'Document authenticated successfully.' : 'Document validation failed.'),
    }
  } catch (error: any) {
    console.error('[KYC OCR] Exception during OCR document analysis:', error)

    return {
      isAuthenticCategory: false,
      detectedDocumentType: 'unrecognized',
      detectedTitle: 'Unrecognized Document Format',
      extractedIdNumber: null,
      idNumberMatches: false,
      extractedEntityName: null,
      entityNameMatches: false,
      confidenceScore: 0.4,
      verificationStatus: 'flagged_for_human_review',
      summaryReason: `OCR verification failed during scan: ${error.message || 'Inspection error'}. Routed for human compliance review.`,
    }
  }
}
