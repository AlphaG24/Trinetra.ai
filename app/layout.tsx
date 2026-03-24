import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Trinetra | Autonomous Business OS",
  description: "High-performance AI infrastructure platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="antialiased">
        {children}
        <Toaster position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
