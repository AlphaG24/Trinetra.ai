"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Vapi from "@vapi-ai/web";

// Ensure this environment variable is set in .env.local
const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";
const VAPI_ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || "";
const VAPI_IS_CONFIGURED = Boolean(VAPI_PUBLIC_KEY && VAPI_ASSISTANT_ID);

function collectErrorStrings(error: unknown, depth = 0, values: string[] = []) {
    if (depth > 4 || error === null || error === undefined) {
        return values;
    }

    if (typeof error === "string") {
        values.push(error);
        return values;
    }

    if (error instanceof Error) {
        values.push(error.message);
    }

    if (typeof error === "object") {
        for (const value of Object.values(error)) {
            if (typeof value === "string") {
                values.push(value);
                continue;
            }

            if (typeof value === "object" && value !== null) {
                collectErrorStrings(value, depth + 1, values);
            }
        }
    }

    return values;
}

function getVapiErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    if (typeof error === "object" && error !== null) {
        const record = error as Record<string, unknown>;
        const directMessage = record.message;
        if (typeof directMessage === "string") {
            return directMessage;
        }

        const nestedError = record.error;
        if (typeof nestedError === "string") {
            return nestedError;
        }

        if (typeof nestedError === "object" && nestedError !== null) {
            const nestedMessage = (nestedError as Record<string, unknown>).message;
            if (typeof nestedMessage === "string") {
                return nestedMessage;
            }
        }

        const reason = record.reason;
        if (typeof reason === "string") {
            return reason;
        }

        const errorMessage = record.errorMsg;
        if (typeof errorMessage === "string") {
            return errorMessage;
        }

        const errorDetail = record.errorDetail;
        if (typeof errorDetail === "string") {
            return errorDetail;
        }

        const collected = collectErrorStrings(error);
        if (collected.length > 0) {
            return collected.join(" | ");
        }
    }

    return "Voice connection error.";
}

function isBenignMeetingEndedError(error: unknown) {
    const normalized = collectErrorStrings(error)
        .join(" | ")
        .toLowerCase();

    return (
        normalized.includes("meeting has ended") ||
        normalized.includes("meeting ended") ||
        normalized.includes("due to ejection") ||
        normalized.includes("left-meeting")
    );
}

export function useVapi() {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const vapiRef = useRef<Vapi | null>(null);

    useEffect(() => {
        if (!VAPI_PUBLIC_KEY) {
            console.warn("[Vapi] Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY – voice agent disabled.");
            return;
        }

        let vapi: Vapi | null = null;

        try {
            vapi = new Vapi(VAPI_PUBLIC_KEY);
        } catch (err) {
            console.warn("[Vapi] Failed to create instance:", err);
            return;
        }

        vapiRef.current = vapi;

        const onCallStart = () => {
            setError(null);
            setIsConnecting(false);
            setIsConnected(true);
        };

        const onCallEnd = () => {
            setError(null);
            setIsConnecting(false);
            setIsConnected(false);
            setIsSpeaking(false);
            setVolumeLevel(0);
        };

        const onSpeechStart = () => setIsSpeaking(true);
        const onSpeechEnd = () => setIsSpeaking(false);
        const onVolume = (vol: number) => setVolumeLevel(vol);

        const onError = (err: unknown) => {
            const message = getVapiErrorMessage(err);

            setIsConnecting(false);
            setIsConnected(false);
            setIsSpeaking(false);
            setVolumeLevel(0);

            // Ignore benign "meeting ended" events that fire on normal call-end
            if (isBenignMeetingEndedError(err) || isBenignMeetingEndedError(message)) {
                setError(null);
                return;
            }

            console.error("[Vapi] Error:", err);
            setError(message || "Voice connection error.");
        };

        vapi.on("call-start", onCallStart);
        vapi.on("call-end", onCallEnd);
        vapi.on("speech-start", onSpeechStart);
        vapi.on("speech-end", onSpeechEnd);
        vapi.on("volume-level", onVolume);
        vapi.on("error", onError);

        return () => {
            try {
                vapi?.stop();
            } catch {
                // Suppress errors during cleanup (e.g. if call already ended)
            }
            vapi?.removeAllListeners();
            vapiRef.current = null;
        };
    }, []);

    const toggleCall = useCallback(async () => {
        if (!vapiRef.current) return;

        if (isConnected) {
            vapiRef.current.stop();
        } else {
            setError(null);
            setIsConnecting(true);
            try {
                console.log("[Vapi] Starting call with Assistant ID:", VAPI_ASSISTANT_ID);

                if (!VAPI_ASSISTANT_ID) {
                    throw new Error("Missing Assistant ID in env vars");
                }

                // Retrieve user auth info from Supabase if available
                let metadata: any = {};
                let variableValues: any = {};
                let assistantOverrides: any = {
                    variableValues: {}
                };

                try {
                    const { createClient } = await import("@/utils/supabase/client");
                    const supabase = createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user?.id) {
                        metadata.userId = user.id;
                        metadata.userEmail = user.email;
                        variableValues.user_id = user.id;
                        variableValues.user_email = user.email;
                        assistantOverrides.variableValues.user_id = user.id;
                        assistantOverrides.variableValues.user_email = user.email;
                    }
                } catch (authErr) {
                    console.warn("[Vapi Hook] Could not fetch authenticated user:", authErr);
                }

                await vapiRef.current.start(VAPI_ASSISTANT_ID, {
                    metadata,
                    variableValues,
                    assistantOverrides
                } as any);
            } catch (err: unknown) {
                console.error("[Vapi] Failed to start call:", err);
                setError(err instanceof Error ? err.message : "Connection failed");
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
        error,
        isConfigured: VAPI_IS_CONFIGURED,
    };
}
