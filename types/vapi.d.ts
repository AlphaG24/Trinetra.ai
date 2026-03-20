declare module '@vapi-ai/web' {
    export default class Vapi {
        constructor(publicKey: string);
        start(assistantId?: string): Promise<any>;
        stop(): void;
        on(event: string, callback: (...args: any[]) => void): void;
        off(event: string, callback: (...args: any[]) => void): void;
        removeAllListeners(): void;
        send(message: any): void;
        muted: boolean;
        setMuted(muted: boolean): void;
        // Add other Vapi methods as needed
    }
}
