-- Add settings_schema column to integration_types and seed default templates/triggers
ALTER TABLE public.integration_types ADD COLUMN IF NOT EXISTS settings_schema JSONB DEFAULT '{}'::jsonb;

-- Seed settings_schema for Telegram
UPDATE public.integration_types 
SET settings_schema = '{
  "event_triggers": [
    {"event": "lead_captured", "label": "Lead Captured", "enabled": true},
    {"event": "call_completed", "label": "Call Completed", "enabled": true},
    {"event": "callback_scheduled", "label": "Callback Scheduled", "enabled": true}
  ],
  "message_template": "🔔 *New Lead Captured!*\n👤 *Name:* {{contact_name}}\n📞 *Phone:* {{contact_phone}}\n✉️ *Email:* {{contact_email}}\n🏢 *Company:* {{company_name}}\n🔥 *Interest:* {{interest_level}}\n💬 *Summary:* {{call_summary}}",
  "additional_fields": []
}'::jsonb
WHERE slug = 'telegram';

-- Seed settings_schema for WhatsApp
UPDATE public.integration_types 
SET settings_schema = '{
  "event_triggers": [
    {"event": "lead_captured", "label": "Lead Captured", "enabled": true},
    {"event": "call_completed", "label": "Call Completed", "enabled": false},
    {"event": "callback_scheduled", "label": "Callback Scheduled", "enabled": true}
  ],
  "message_template": "Trinetra AI Alert: New lead captured! Name: {{contact_name}}, Phone: {{contact_phone}}, Interest: {{interest_level}}. Summary: {{call_summary}}",
  "additional_fields": []
}'::jsonb
WHERE slug = 'whatsapp';

-- Seed settings_schema for Google Calendar
UPDATE public.integration_types 
SET settings_schema = '{
  "event_triggers": [
    {"event": "callback_scheduled", "label": "Callback Scheduled", "enabled": true}
  ],
  "message_template": "Trinetra Callback: {{prospect_name}} ({{prospect_phone}}) - {{notes}}",
  "additional_fields": []
}'::jsonb
WHERE slug = 'google-calendar';

-- Seed settings_schema for Zoho CRM
UPDATE public.integration_types 
SET settings_schema = '{
  "event_triggers": [
    {"event": "lead_captured", "label": "Lead Captured", "enabled": true}
  ],
  "message_template": "Lead Source: Trinetra AI. Summary: {{call_summary}}",
  "additional_fields": []
}'::jsonb
WHERE slug = 'zoho-crm';

-- Seed settings_schema for Salesforce
UPDATE public.integration_types 
SET settings_schema = '{
  "event_triggers": [
    {"event": "lead_captured", "label": "Lead Captured", "enabled": true}
  ],
  "message_template": "Lead Source: Trinetra AI. Summary: {{call_summary}}",
  "additional_fields": []
}'::jsonb
WHERE slug = 'salesforce';

-- Seed settings_schema for Webhook
UPDATE public.integration_types 
SET settings_schema = '{
  "event_triggers": [
    {"event": "lead_captured", "label": "Lead Captured", "enabled": true},
    {"event": "call_completed", "label": "Call Completed", "enabled": true},
    {"event": "callback_scheduled", "label": "Callback Scheduled", "enabled": true}
  ],
  "message_template": "{\n  \"event\": \"{{event_type}}\",\n  \"agent_id\": \"{{agent_id}}\",\n  \"timestamp\": \"{{timestamp}}\"\n}",
  "additional_fields": []
}'::jsonb
WHERE slug = 'webhook';

-- Seed settings_schema for SMTP Email
UPDATE public.integration_types 
SET settings_schema = '{
  "event_triggers": [
    {"event": "lead_captured", "label": "Lead Captured", "enabled": true},
    {"event": "call_completed", "label": "Call Completed", "enabled": true},
    {"event": "callback_scheduled", "label": "Callback Scheduled", "enabled": true}
  ],
  "message_template": "<!DOCTYPE html>\n<html>\n<head><style>body { font-family: sans-serif; line-height: 1.5; color: #333; }</style></head>\n<body>\n  <h2>Trinetra AI Event Notification</h2>\n  <p>A new event has occurred for your agent.</p>\n  <table border=\"0\" cellpadding=\"5\" cellspacing=\"0\">\n    <tr><td><strong>Event:</strong></td><td>{{event_type}}</td></tr>\n    <tr><td><strong>Prospect:</strong></td><td>{{contact_name}} ({{contact_phone}})</td></tr>\n    <tr><td><strong>Summary:</strong></td><td>{{call_summary}}</td></tr>\n  </table>\n</body>\n</html>",
  "additional_fields": [
    {"name": "sender_display_name", "label": "Sender Display Name", "type": "text", "default": "Trinetra AI Alerts"},
    {"name": "reply_to", "label": "Reply-To Email Address", "type": "text", "default": ""}
  ]
}'::jsonb
WHERE slug = 'smtp-email';
