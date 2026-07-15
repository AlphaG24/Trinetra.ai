'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { getBackendUrl } from "@/src/utils/url"

export async function processDocument(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized: User not authenticated")
  }

  // 1. Check user quotas for 'structurer'
  const { data: quota, error: quotaError } = await supabase
    .from('user_service_quotas')
    .select('id, quota_allocated, quota_used')
    .eq('user_id', user.id)
    .eq('service_slug', 'structurer')
    .maybeSingle()

  if (quotaError) {
    throw new Error(`Database error: ${quotaError.message}`)
  }

  if (!quota) {
    throw new Error("Unauthorized: No quota allocated for the structurer tool.")
  }

  if (quota.quota_used >= quota.quota_allocated) {
    throw new Error("Quota Exceeded: Your service usage limits have been reached.")
  }

  const sourceFile = formData.get('sourceFile') as File | null
  const referenceFile = formData.get('referenceFile') as File | null
  const instructions = formData.get('instructions') as string | null

  if (!sourceFile) {
    throw new Error("Bad Request: Source file payload is missing.")
  }

  // 2. Resolve FastAPI Endpoint
  const backendBaseUrl = getBackendUrl()
  const processorUrl = `${backendBaseUrl}/api/process-document`

  // 3. Forward payload to FastAPI
  const backendFormData = new FormData()

  // FastAPI explicitly requires the key 'source_file'
  backendFormData.append('source_file', sourceFile)

  // If referenceFile exists and its size is greater than 0, append it as 'reference_file'
  if (referenceFile && referenceFile.size > 0) {
    backendFormData.append('reference_file', referenceFile)
  }

  // If instructions exists and is not an empty string, append it as 'instructions'
  if (instructions && instructions.trim() !== '') {
    backendFormData.append('instructions', instructions)
  }

  const response = await fetch(processorUrl, {
    method: 'POST',
    body: backendFormData,
    // Short timeout to avoid hanging server actions
    signal: AbortSignal.timeout(60000)
  })

  if (!response.ok) {
    let errorMessage = "An unknown backend error occurred."
    try {
      const errorData = await response.json()
      if (errorData && errorData.error) {
        errorMessage = `[${errorData.error.code}] ${errorData.error.message}`
      } else if (errorData && errorData.detail) {
        errorMessage = errorData.detail
      }
    } catch (e) {
      // Fallback on json parse failure
    }
    throw new Error(errorMessage)
  }

  let extractedData: any
  try {
    extractedData = await response.json()
  } catch (jsonError) {
    throw new Error("FastAPI Parsing Failed: Expected JSON response but received invalid payload.")
  }

  // Save successful extraction to public.extractions
  try {
    const { error: extractionError } = await supabase
      .from('extractions')
      .insert({
        user_id: user.id,
        document_path: sourceFile.name,
        extracted_json: extractedData,
        status: "success",
        target_schema: referenceFile ? referenceFile.name : "None"
      })

    if (extractionError) {
      console.error("Failed to save extraction to Supabase database:", extractionError.message)
    }
  } catch (dbError) {
    console.error("Unexpected error saving extraction to Supabase database:", dbError)
  }

  // 4. Crucial: Increment quota_used by 1 upon successful FastAPI execution
  const { error: updateError } = await supabase
    .from('user_service_quotas')
    .update({ quota_used: quota.quota_used + 1 })
    .eq('id', quota.id)

  if (updateError) {
    console.error("Quota consumption logging failed:", updateError)
    // We still return the data, but warn in the logs
  }

  // 5. Revalidate cache
  revalidatePath('/dashboard/agents')
  revalidatePath('/dashboard/tools/structurer')

  return extractedData && typeof extractedData === 'object' && 'extracted_data' in extractedData
    ? extractedData.extracted_data
    : extractedData
}

export async function getExtractionsHistory() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error("Unauthorized: User not authenticated")
  }

  const { data: extractions, error: fetchError } = await supabase
    .from('extractions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  if (fetchError) {
    throw new Error(`Database error: ${fetchError.message}`)
  }

  return extractions
}

export async function checkQuota() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized: User not authenticated")
  }

  const { data: quota, error: quotaError } = await supabase
    .from('user_service_quotas')
    .select('id, quota_allocated, quota_used')
    .eq('user_id', user.id)
    .eq('service_slug', 'structurer')
    .maybeSingle()

  if (quotaError) {
    throw new Error(`Database error: ${quotaError.message}`)
  }

  if (!quota) {
    throw new Error("Unauthorized: No quota allocated for the structurer tool.")
  }

  if (quota.quota_used >= quota.quota_allocated) {
    throw new Error("Quota Exceeded: Your service usage limits have been reached.")
  }

  return { ok: true, quota }
}

export async function saveExtraction({
  documentName,
  extractedData,
  targetSchema,
  quotaId,
  currentQuotaUsed
}: {
  documentName: string
  extractedData: any
  targetSchema: string
  quotaId: string
  currentQuotaUsed: number
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized: User not authenticated")
  }

  const { data: insertedData, error: extractionError } = await supabase
    .from('extractions')
    .insert({
      user_id: user.id,
      document_path: documentName,
      extracted_json: extractedData,
      status: "success",
      target_schema: targetSchema
    })
    .select('id')
    .single()

  if (extractionError) {
    console.error("Failed to save extraction to Supabase database:", extractionError.message)
    throw new Error(`Save error: ${extractionError.message}`)
  }

  const { error: updateError } = await supabase
    .from('user_service_quotas')
    .update({ quota_used: currentQuotaUsed + 1 })
    .eq('id', quotaId)

  if (updateError) {
    console.error("Quota consumption logging failed:", updateError)
  }

  revalidatePath('/dashboard/agents')
  revalidatePath('/dashboard/tools/structurer')
  return { ok: true, id: insertedData?.id }
}

export async function updateExtraction(id: number, extractedData: any) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized: User not authenticated")
  }

  const { error } = await supabase
    .from('extractions')
    .update({ extracted_json: extractedData })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Failed to update extraction: ${error.message}`)
  }

  revalidatePath('/dashboard/tools/structurer')
  return { ok: true }
}
