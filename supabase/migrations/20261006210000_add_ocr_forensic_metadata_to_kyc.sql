-- Migration: 20261006210000_add_ocr_forensic_metadata_to_kyc.sql
-- Description: Adds OCR Document Forensic Verification and Classification Columns to kyc_documents
-- Standard: Master Plan Section 18.6

-- Up Migration
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS ocr_status TEXT DEFAULT 'pending';
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS ocr_detected_title TEXT;
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS ocr_confidence_score NUMERIC(5,2);
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS ocr_metadata JSONB DEFAULT '{}'::jsonb;

-- Down Migration (for documentation)
-- ALTER TABLE public.kyc_documents DROP COLUMN IF EXISTS ocr_metadata;
-- ALTER TABLE public.kyc_documents DROP COLUMN IF EXISTS ocr_confidence_score;
-- ALTER TABLE public.kyc_documents DROP COLUMN IF EXISTS ocr_detected_title;
-- ALTER TABLE public.kyc_documents DROP COLUMN IF EXISTS ocr_status;
