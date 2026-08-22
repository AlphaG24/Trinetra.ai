import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendEmailTemplate } from '@/lib/email'

// Pure JS uncompressed ZIP generator helper
function createSimpleZip(files: { name: string, content: string | Buffer }[]): Buffer {
  const buffers: Buffer[] = []
  let offset = 0
  const localHeaders: { name: string, offset: number, size: number, crc: number }[] = []

  // CRC32 implementation
  const makeCrcTable = () => {
    const table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      }
      table[n] = c
    }
    return table
  }
  
  const crcTable = makeCrcTable()
  const calculateCrc32 = (buf: Buffer): number => {
    let crc = 0 ^ (-1)
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF]
    }
    return (crc ^ (-1)) >>> 0
  }

  // 1. Local headers and file data
  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8')
    const fileData = typeof file.content === 'string' ? Buffer.from(file.content, 'utf8') : file.content
    const size = fileData.length
    const crc = calculateCrc32(fileData)

    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0) // Local file header signature
    header.writeUInt16LE(10, 4)         // Version needed to extract
    header.writeUInt16LE(0, 6)          // General purpose bit flag
    header.writeUInt16LE(0, 8)          // Compression method (0 = store/uncompressed)
    header.writeUInt16LE(0, 10)         // Last mod file time
    header.writeUInt16LE(0x2100, 12)    // Last mod file date (1980-01-01)
    header.writeUInt32LE(crc, 14)       // CRC-32
    header.writeUInt32LE(size, 18)      // Compressed size
    header.writeUInt32LE(size, 22)      // Uncompressed size
    header.writeUInt16LE(nameBuf.length, 26) // File name length
    header.writeUInt16LE(0, 28)         // Extra field length

    localHeaders.push({ name: file.name, offset, size, crc })

    buffers.push(header)
    buffers.push(nameBuf)
    buffers.push(fileData)

    offset += header.length + nameBuf.length + fileData.length
  }

  const centralDirectoryOffset = offset
  let centralDirectoryLength = 0

  // 2. Central Directory
  for (const lh of localHeaders) {
    const nameBuf = Buffer.from(lh.name, 'utf8')
    const header = Buffer.alloc(46)
    header.writeUInt32LE(0x02014b50, 0) // Central directory file header signature
    header.writeUInt16LE(20, 4)         // Version made by
    header.writeUInt16LE(10, 6)         // Version needed to extract
    header.writeUInt16LE(0, 8)          // General purpose bit flag
    header.writeUInt16LE(0, 10)         // Compression method (0 = store)
    header.writeUInt16LE(0, 12)         // Last mod file time
    header.writeUInt16LE(0x2100, 14)    // Last mod file date
    header.writeUInt32LE(lh.crc, 16)    // CRC-32
    header.writeUInt32LE(lh.size, 20)   // Compressed size
    header.writeUInt32LE(lh.size, 24)   // Uncompressed size
    header.writeUInt16LE(nameBuf.length, 28) // File name length
    header.writeUInt16LE(0, 30)         // Extra field length
    header.writeUInt16LE(0, 32)         // File comment length
    header.writeUInt16LE(0, 34)         // Disk number start
    header.writeUInt16LE(0, 36)         // Internal file attributes
    header.writeUInt32LE(0, 38)         // External file attributes
    header.writeUInt32LE(lh.offset, 42) // Relative offset of local header

    buffers.push(header)
    buffers.push(nameBuf)

    centralDirectoryLength += header.length + nameBuf.length
  }

  // 3. End of Central Directory Record (EOCD)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)   // End of central directory signature
  eocd.writeUInt16LE(0, 4)            // Number of this disk
  eocd.writeUInt16LE(0, 6)            // Disk where central directory starts
  eocd.writeUInt16LE(localHeaders.length, 8) // Number of central directory records on this disk
  eocd.writeUInt16LE(localHeaders.length, 10) // Total number of central directory records
  eocd.writeUInt32LE(centralDirectoryLength, 12) // Size of central directory
  eocd.writeUInt32LE(centralDirectoryOffset, 16) // Offset of start of central directory
  eocd.writeUInt16LE(0, 20)            // Comment length

  buffers.push(eocd)

  return Buffer.concat(buffers)
}

// Generate formatted styled HTML tables for human viewing
function generateHtmlExport(data: any): string {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>trinetraedu-ai Data Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; color: #1f2937; padding: 40px; margin: 0; }
    .container { max-width: 900px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1 { color: #080010; font-size: 24px; margin-top: 0; margin-bottom: 8px; border-bottom: 2px solid #f3f4f6; padding-bottom: 16px; }
    h2 { font-size: 14px; font-weight: 800; color: #8b5cf6; margin-top: 28px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    p { font-size: 13px; line-height: 1.5; color: #4b5563; margin-top: 0; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; text-align: left; }
    th { background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; padding: 10px 12px; font-weight: bold; color: #374151; }
    td { border-bottom: 1px solid #f3f4f6; padding: 10px 12px; color: #4b5563; vertical-align: top; word-break: break-all; }
    .meta-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 12px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>trinetraedu-ai Data Export</h1>
    <p>This document contains a human-readable export of all your data associated with trinetraedu-ai. Under Article 20 of GDPR and the DPDP Act 2023, you have a right to data portability.</p>
    
    <div class="meta-box">
      <strong>Export Information</strong>
      <div class="meta-grid" style="margin-top: 8px;">
        <div><strong>User ID:</strong> ${data.export_metadata.user_id}</div>
        <div><strong>User Email:</strong> ${data.export_metadata.user_email}</div>
        <div><strong>Generated At:</strong> ${data.export_metadata.generated_at}</div>
        <div><strong>Regulation Basis:</strong> ${data.export_metadata.regulation}</div>
      </div>
    </div>
  `;

  // Profile Table
  html += `<h2>Profile Information</h2>
  <table>
    <thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>`;
  Object.entries(data.profile || {}).forEach(([key, val]) => {
    html += `<tr><td><strong>${key}</strong></td><td>${typeof val === 'object' ? JSON.stringify(val) : val}</td></tr>`;
  });
  html += `</tbody></table>`;

  const addTableSection = (title: string, items: any[]) => {
    html += `<h2>${title} (${items.length} records)</h2>`;
    if (items.length === 0) {
      html += `<p>No records found in this category.</p>`;
      return;
    }
    const headers = Array.from(new Set(items.flatMap(item => Object.keys(item))));
    html += `<table><thead><tr>`;
    headers.forEach(h => { html += `<th>${h}</th>`; });
    html += `</tr></thead><tbody>`;
    items.forEach(item => {
      html += `<tr>`;
      headers.forEach(h => {
        const val = item[h];
        html += `<td>${val !== undefined && val !== null ? (typeof val === 'object' ? JSON.stringify(val) : String(val)) : ''}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table>`;
  };

  addTableSection('Agents', data.agents);
  addTableSection('Call Logs', data.call_logs);
  addTableSection('Voice Calls', data.voice_calls);
  addTableSection('Callbacks', data.callbacks);
  addTableSection('Billing History', data.billing_history);
  addTableSection('Integrations', data.integrations);

  html += `
  </div>
</body>
</html>`;
  return html;
}

export async function POST() {
  try {
    const supabase = await createClient()

    // 1. Authenticate user (SEC-003: use getUser, not getSession)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Gather all user-owned data in parallel
    const [
      { data: profile },
      { data: agents },
      { data: callLogs },
      { data: consentRecords },
      { data: integrations },
      { data: voiceCalls },
      { data: callbacks },
      { data: voiceLibrary },
      { data: telegramConnections },
      { data: agentCallLogs },
      { data: agentDeployments },
      { data: billingHistory },
      { data: apiKeys },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('agents').select('*').eq('user_id', user.id),
      supabase.from('voice_calls').select('*').eq('user_id', user.id),
      supabase.from('consent_records').select('*').eq('user_id', user.id),
      supabase.from('integrations').select('id, integration_type, status, created_at, updated_at').eq('user_id', user.id),
      supabase.from('voice_calls').select('*').eq('user_id', user.id),
      supabase.from('callbacks').select('*').eq('user_id', user.id),
      supabase.from('voice_library').select('*').eq('user_id', user.id),
      supabase.from('telegram_connections').select('*').eq('user_id', user.id),
      supabase.from('agent_call_logs').select('*').eq('user_id', user.id),
      supabase.from('agent_deployments').select('*').eq('user_id', user.id),
      supabase.from('billing_history').select('*').eq('user_id', user.id),
      supabase.from('api_keys').select('*').eq('user_id', user.id),
    ])

    // 3. Build the exportable data bundle
    const exportPayload = {
      export_metadata: {
        generated_at: new Date().toLocaleString('en-US', { timeZoneName: 'short' }),
        user_id: user.id,
        user_email: user.email,
        format_version: '1.0',
        regulation: 'DPDP Act 2023 / GDPR Article 20',
      },
      profile: profile ?? {},
      agents: agents ?? [],
      call_logs: callLogs ?? [],
      consent_records: consentRecords ?? [],
      voice_calls: voiceCalls ?? [],
      callbacks: callbacks ?? [],
      voice_library: voiceLibrary ?? [],
      telegram_connections: telegramConnections ?? [],
      agent_call_logs: agentCallLogs ?? [],
      agent_deployments: agentDeployments ?? [],
      billing_history: billingHistory ?? [],
      api_keys: apiKeys ?? [],
      integrations: (integrations ?? []).map((i) => ({
        id: i.id,
        integration_type: i.integration_type,
        status: i.status,
        created_at: i.created_at,
        updated_at: i.updated_at,
      })),
    }

    // 4. Log security audit event (server-side only)
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: profile?.role || 'client',
        action: 'gdpr.data_export_requested',
        resource_type: 'profile',
        resource_id: user.id,
        new_values: { exported_tables: ['profiles', 'agents', 'voice_calls', 'consent_records', 'integrations', 'callbacks', 'voice_library', 'telegram_connections', 'agent_call_logs', 'agent_deployments', 'billing_history', 'api_keys'] },
      })
    } catch (auditErr) {
      console.warn('[audit] Failed to write audit log for data export:', auditErr)
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let downloadUrl = ''

    try {
      // 5. Ensure data-exports bucket exists safely
      const { data: buckets, error: listErr } = await adminClient.storage.listBuckets()
      if (listErr) console.warn('[gdpr] listBuckets error:', listErr)
      
      const hasBucket = buckets?.some(b => b.id === 'data-exports')
      if (!hasBucket) {
        await adminClient.storage.createBucket('data-exports', { public: false })
      }

      // Generate HTML & JSON files and pack them in ZIP
      const dateStr = new Date().toISOString().split('T')[0]
      const zipFileName = `${user.id}/trinetra-data-export-${dateStr}.zip`
      const jsonContent = JSON.stringify(exportPayload, null, 2)
      const htmlContent = generateHtmlExport(exportPayload)

      const zipBuffer = createSimpleZip([
        { name: `trinetra-data-export-${dateStr}.json`, content: jsonContent },
        { name: `trinetra-data-export-${dateStr}.html`, content: htmlContent }
      ])

      const { error: uploadErr } = await adminClient.storage
        .from('data-exports')
        .upload(zipFileName, zipBuffer, { contentType: 'application/zip', upsert: true })

      if (uploadErr) throw uploadErr

      // Generate a signed URL valid for 24 hours (86400 seconds)
      const { data: signedData, error: signedUrlErr } = await adminClient.storage
        .from('data-exports')
        .createSignedUrl(zipFileName, 86400)

      if (signedUrlErr) throw signedUrlErr
      downloadUrl = signedData?.signedUrl || ''

      // 6. Trigger data-export email notification
      await sendEmailTemplate({
        to: user.email!,
        subject: 'Your trinetraedu-ai data export package is ready',
        templateName: 'data-export',
        variables: {
          recipient_name: profile?.full_name || 'there',
          export_url: downloadUrl
        }
      })
      console.info(`[gdpr] Data export successfully sent to ${user.email}`)
    } catch (exportErr: any) {
      console.error('[gdpr] Failed to upload or email data export:', exportErr.message)
    }

    return NextResponse.json({ success: true, message: 'Data export package has been processed and emailed.' })
  } catch (error: any) {
    // SEC-007: Generic error message to client
    console.error('[export-data] Unhandled error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
