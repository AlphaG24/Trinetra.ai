"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Vapi from "@vapi-ai/web";

// Ensure this environment variable is set in .env.local
const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";
const VAPI_ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || "";

export function useVapi() {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const vapiRef = useRef<Vapi | null>(null);

    useEffect(() => {
        if (!VAPI_PUBLIC_KEY) {
            console.error("Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY");
            return;
        }

        try {
            const vapi = new Vapi(VAPI_PUBLIC_KEY);
            vapiRef.current = vapi;

            vapi.on("call-start", () => {
                setIsConnecting(false);
                setIsConnected(true);
            });

            vapi.on("call-end", () => {
                setIsConnecting(false);
                setIsConnected(false);
                setIsSpeaking(false);
                setVolumeLevel(0);
            });

            vapi.on("speech-start", () => setIsSpeaking(true));
            vapi.on("speech-end", () => setIsSpeaking(false));
            vapi.on("volume-level", (vol) => setVolumeLevel(vol));

            vapi.on("error", (err) => {
                console.error("Vapi Error:", err);
                setIsConnecting(false);
                setIsConnected(false);
                setError("Voice connection error.");
            });

            return () => {
                vapi.stop();
                vapi.removeAllListeners();
            };
        } catch (err) {
            console.error("Vapi Init Error:", err);
        }
    }, []);

    const toggleCall = useCallback(async () => {
        if (!vapiRef.current) return;

        if (isConnected) {
            vapiRef.current.stop();
        } else {
            setIsConnecting(true);
            try {
                console.log("Starting Vapi Call with Assistant ID:", VAPI_ASSISTANT_ID);

                if (!VAPI_ASSISTANT_ID) {
                    throw new Error("Missing Assistant ID in env vars");
                }

                await vapiRef.current.start(VAPI_ASSISTANT_ID);
            } catch (err: any) {
                console.error("Failed to start call:", err);
                setError(err.message || "Connection failed");
                setIsConnecting(false);
            }
        }
    }, [isConnected]);

    return {
        isConnecting,
        isConnected,
        isSpeaking,
        volumeLevel,
        toggleCall,
        error
    };
}
