import os
import json
import urllib.request
import urllib.parse
import asyncio
import sys
sys.path.append('.')
from dotenv import load_dotenv

load_dotenv('.env')
from app.services.ai.tts_router import TTSRouter

out_dir = r"c:\Users\Ketan singh\trinetra-workspace\trinetra-fresh\frontend\public\audio\greetings"
os.makedirs(out_dir, exist_ok=True)

greetings = [
    {
        'id': 'hi',
        'provider': 'sarvam',
        'lang': 'hi-IN',
        'speaker': 'shreya',
        'sentence': 'नमस्ते! मैं त्रिनेत्र एआई से आपकी वॉयस असिस्टेंट बोल रही हूँ, आज मैं आपकी क्या सहायता कर सकती हूँ?'
    },
    {
        'id': 'en',
        'provider': 'sarvam',
        'lang': 'en-IN',
        'speaker': 'shreya',
        'sentence': 'Hello! Welcome to Trinetra AI. How can our autonomous voice assistant empower your business today?'
    },
    {
        'id': 'mr',
        'provider': 'sarvam',
        'lang': 'mr-IN',
        'speaker': 'shreya',
        'sentence': 'नमस्कार! मी त्रिनेत्र एआय वॉयस असिस्टंट बोलतेय, आज मी तुम्हाला कशी मदत करू शकते?'
    },
    {
        'id': 'pa',
        'provider': 'sarvam',
        'lang': 'pa-IN',
        'speaker': 'shubh',
        'sentence': 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਮੈਂ ਤ੍ਰਿਨੇਤਰਾ ਏਆਈ ਤੋਂ ਬੋਲ ਰਹੀ ਹਾਂ, ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਸੇਵਾ ਕਰ ਸਕਦੀ ਹਾਂ?'
    },
    {
        'id': 'fr',
        'provider': 'google',
        'lang': 'fr',
        'sentence': "Bonjour! Bienvenue chez Trinetra AI. Comment puis-je vous aider aujourd'hui?"
    },
    {
        'id': 'ta',
        'provider': 'sarvam',
        'lang': 'ta-IN',
        'speaker': 'shreya',
        'sentence': 'வணக்கம்! நான் திரினேத்ரா ஏஐ குரல் உதவியாளர் பேசுகிறேன், இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?'
    },
    {
        'id': 'ur',
        'provider': 'sarvam',
        'lang': 'hi-IN',
        'speaker': 'shubh',
        'sentence': 'Assalam-o-Alaikum! Main Trinetra AI se aapki voice assistant bol rahi hoon, aaj aapki kya khidmat kar sakti hoon?'
    },
    {
        'id': 'es',
        'provider': 'google',
        'lang': 'es',
        'sentence': '¡Hola! Bienvenido a Trinetra AI. ¿En qué puedo ayudarte el día de hoy?'
    },
    {
        'id': 'ja',
        'provider': 'google',
        'lang': 'ja',
        'sentence': 'こんにちは！トリネトラAIへようこそ。本日はどのようなご用件でしょうか？'
    },
    {
        'id': 'ar',
        'provider': 'google',
        'lang': 'ar',
        'sentence': 'مرحباً بكم في ترينيترا للذكاء الاصطناعي، كيف يمكنني مساعدتكم اليوم؟'
    }
]

async def generate():
    router = TTSRouter()
    for g in greetings:
        file_path = os.path.join(out_dir, f"{g['id']}.wav" if g['provider'] == 'sarvam' else f"{g['id']}.mp3")
        if g['provider'] == 'sarvam':
            audio, ct = await router._synthesize_sarvam(g['sentence'], language=g['lang'], speaker=g['speaker'])
            with open(file_path, 'wb') as f:
                f.write(audio)
            print(f"Generated Sarvam {g['id']}: {len(audio)} bytes -> {file_path}")
        else:
            q = urllib.parse.quote(g['sentence'])
            url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={q}&tl={g['lang']}&client=tw-ob"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as resp:
                data = resp.read()
                with open(file_path, 'wb') as f:
                    f.write(data)
                print(f"Generated Google {g['id']}: {len(data)} bytes -> {file_path}")

if __name__ == '__main__':
    asyncio.run(generate())
