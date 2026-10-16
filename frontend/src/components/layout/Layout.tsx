import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

interface LayoutProps {
    children: ReactNode;
    theme?: "dark" | "vaakriti";
}

export function Layout({ children, theme = "dark" }: LayoutProps) {
    const isDark = theme === "dark";
    return (
        <div
            className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? "bg-[#080010] text-[#E2E0FD] dark" : ""}`}
            style={!isDark ? { backgroundColor: "var(--theme-bg, #F4F7FC)", color: "var(--theme-text-primary, #080D18)" } : undefined}
        >
            <Navbar />
            <main className="flex-grow" style={{ paddingTop: isDark ? 72 : 0 }}>
                {children}
            </main>
            <Footer />
        </div>
    );
}