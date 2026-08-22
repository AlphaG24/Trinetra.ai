-- Add VOICELINK_WEBHOOK_SECRET to system_config if it doesn't exist
INSERT INTO system_config (config_key, config_value, description)
VALUES (
    'VOICELINK_WEBHOOK_SECRET', 
    '', 
    'Webhook secret for verifying incoming VoiceLink requests'
)
ON CONFLICT (config_key) DO NOTHING;
