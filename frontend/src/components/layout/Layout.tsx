import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

interface LayoutProps {
    children: ReactNode;
    theme?: "dark" | "vaakriti";
}

export function Layout({ children, theme = "vaakriti" }: LayoutProps) {
    const isDark = theme === "dark";
    return (
        <div
            className={`min-h-screen flex flex-col transition-colors duration-300 ${
                isDark ? "bg-[#080010] text-[#E2E0FD] dark" : "bg-[#FAFAFA] text-[#0F172A]"
            }`}
            style={!isDark ? { backgroundColor: "var(--theme-bg, #FAFAFA)", color: "var(--theme-text-primary, #0F172A)" } : undefined}
        >
            <Navbar />
            <main className="flex-grow">
                {children}
            </main>
            <Footer />
        </div>
    );
}