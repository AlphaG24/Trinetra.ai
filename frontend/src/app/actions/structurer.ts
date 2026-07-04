'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

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

  const file = formData.get('file') as File
  const schema = formData.get('schema') as string

  if (!file) {
    throw new Error("Bad Request: File payload is missing.")
  }

  // 2. Resolve FastAPI Endpoint
  const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                         process.env.NEXT_PUBLIC_FASTAPI_URL || 
                         process.env.NEXT_PUBLIC_API_URL || 
                         "http://localhost:8000"
  
  const processorUrl = process.env.NEXT_PUBLIC_PROCESSOR_API_URL || `${backendBaseUrl}/api/process-document`

  // 3. Forward payload to FastAPI
  const backendFormData = new FormData()
  backendFormData.append('file', file)
  backendFormData.append('schema', schema || 'lead')

  let response: Response
  try {
    response = await fetch(processorUrl, {
      method: 'POST',
      body: backendFormData,
      // Short timeout to avoid hanging server actions
      signal: AbortSignal.timeout(20000)
    })
  } catch (fetchError: any) {
    throw new Error(`FastAPI Connection Failed: Unable to contact backend processor at ${processorUrl}. Error: ${fetchError.message}`)
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown FastAPI backend error")
    throw new Error(`FastAPI Processing Failed (HTTP ${response.status}): ${errorText}`)
  }

  let extractedData: any
  try {
    extractedData = await response.json()
  } catch (jsonError) {
    throw new Error("FastAPI Parsing Failed: Expected JSON response but received invalid payload.")
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
  revalidatePath('/dashboard/marketplace')
  revalidatePath('/dashboard/tools/structurer')

  return extractedData
}
