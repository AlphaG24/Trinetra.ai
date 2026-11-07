import os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from supabase import create_client

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])
shubh = sb.table('agents').select('system_prompt').eq('id', 'dd4da4c1-9deb-4047-8927-5e12402e6b1f').maybe_single().execute().data
p = shubh.get('system_prompt', '')

# Replace logistics references
p = p.replace(
    '1. Pitch specific ROI for their exact domain (e.g. logistics tracking, patient bookings, lead automation, client follow-ups).',
    '1. Pitch specific ROI for their exact domain (e.g. AI voice assistants for 24/7 call answering, appointment bookings, lead capture, CRM follow-ups).'
)

lines = p.splitlines()
new_lines = []
for line in lines:
    if 'Transport & Logistics:' in line or 'fleet operations aur dispatch' in line:
        new_lines.append('- AI Voice Automation & Customer Support (Default Core Focus): "Sir, business operations mein regular incoming aur outgoing calls, appointment bookings, aur lead inquiries aati rehti hain. Hamara AI voice assistant 24/7 bina kisi delay ke har call attend karta hai, appointments book karta hai, aur details capture karta hai taaki aapki koi client call miss na ho."')
    elif 'Standard logistics consultation' in line:
        new_lines.append(line.replace('Standard logistics consultation', 'AI voice automation and consultation'))
    else:
        new_lines.append(line)

updated_prompt = '\n'.join(new_lines)
sb.table('agents').update({'system_prompt': updated_prompt}).eq('id', 'dd4da4c1-9deb-4047-8927-5e12402e6b1f').execute()
print('Cleaned Shubh system prompt. Remaining logistics occurrences:', updated_prompt.lower().count('logistic'))

