import fs from 'fs'
import path from 'path'

interface LineItem {
  quantity: number
  description: string
  subtext?: string
  rate: number // in paisa
  amount: number // in paisa
}

interface Attachment {
  content: string // Base64 encoded file buffer string
  filename: string
}

interface SendEmailArgs {
  to: string
  subject: string
  templateName: 'welcome' | 'reset-password' | 'invoice' | 'usage-warning' | 'agent-paused' | 'data-export' | 'new-blog-post' | 'welcome-subscriber'
  variables: Record<string, string>
  lineItems?: LineItem[]
  attachments?: Attachment[]
}

/**
 * Loads an email HTML template, interpolates variables and line items, and sends via Resend API with optional attachments.
 */
export async function sendEmailTemplate({
  to,
  subject,
  templateName,
  variables,
  lineItems,
  attachments
}: SendEmailArgs): Promise<boolean> {
  try {
    const resendKey = process.env.RESEND_PRIVATE_KEY || process.env.RESEND_API_KEY
    if (!resendKey) {
      console.warn('[EMAIL] RESEND_PRIVATE_KEY / RESEND_API_KEY is missing. Skipping email sending.')
      return false
    }

    // Resolve template file path
    const possiblePaths = [
      path.join(process.cwd(), 'src/emails', `${templateName}.html`),
      path.join(process.cwd(), 'frontend/src/emails', `${templateName}.html`),
      path.join(process.cwd(), 'emails', `${templateName}.html`),
      path.join(process.cwd(), '../frontend/src/emails', `${templateName}.html`)
    ]

    let htmlContent = ''
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          htmlContent = fs.readFileSync(filePath, 'utf-8')
          console.log(`[EMAIL] Loaded template: ${templateName} from ${filePath}`)
          break
        }
      } catch (_) {}
    }

    if (!htmlContent) {
      console.error(`[EMAIL] Template ${templateName} not found.`)
      return false
    }

    // 1. Process repeating items for invoices
    let renderedHtml = htmlContent
    if (lineItems && lineItems.length > 0) {
      const itemsRegex = /<!-- ITEMS_START -->([\s\S]*?)<!-- ITEMS_END -->/
      const match = renderedHtml.match(itemsRegex)
      if (match) {
        const itemTemplate = match[1]
        let itemsHtml = ''
        lineItems.forEach(item => {
          let row = itemTemplate
            .replace(/\{\{item_quantity\}\}/g, String(item.quantity))
            .replace(/\{\{item_description\}\}/g, item.description)
            .replace(/\{\{item_subtext\}\}/g, item.subtext || '')
            .replace(/\{\{item_rate\}\}/g, (item.rate / 100).toFixed(2))
            .replace(/\{\{item_amount\}\}/g, (item.amount / 100).toFixed(2))
          itemsHtml += row
        })
        renderedHtml = renderedHtml.replace(itemsRegex, itemsHtml)
      }
    }

    // 2. Substitute all placeholder variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      renderedHtml = renderedHtml.replace(regex, value || '')
    })

    // Setup Resend Payload
    const fromAddress = 'Trinetra AI <onboarding@resend.dev>'
    const payload: Record<string, any> = {
      from: fromAddress,
      to: [to],
      subject: subject,
      html: renderedHtml
    }

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments
    }
    
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const responseData = await res.json()
    if (!res.ok) {
      console.error('[EMAIL] Resend Send Failure:', JSON.stringify(responseData))
      if (res.status === 403 || res.status === 400) {
        console.warn(
          '[EMAIL] TIP: If you are using a free Resend Sandbox account, you can only send emails to the email address that registered the Resend account. To send to other emails, you must verify your domain in the Resend dashboard.'
        )
      }
      return false
    }

    console.log(`[EMAIL] Email '${templateName}' successfully sent to ${to}. ID: ${responseData.id}`)
    return true
  } catch (error: any) {
    console.error('[EMAIL] Fatal send error:', error.message)
    return false
  }
}
