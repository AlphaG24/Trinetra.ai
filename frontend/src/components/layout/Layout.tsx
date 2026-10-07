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
        <div className={`min-h-screen flex flex-col ${isDark ? "bg-[#080010] text-[#E2E0FD] dark" : "bg-[#FAF7F2] text-[#1C1714]"}`}>
            <Navbar />
            <main className="flex-grow" style={{ paddingTop: 72 }}>
                {children}
            </main>
            <Footer />
        </div>
    );
}