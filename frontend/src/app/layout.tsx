import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/src/components/providers/AuthProvider";

export const metadata: Metadata = {
  title: "Trinetra | Autonomous Business OS",
  description: "High-performance AI infrastructure platform.",
  icons: {
    icon: [
      // SVG favicon with dynamic theme support (modern browsers)
      { url: "/favicon.svg", type: "image/svg+xml" },
      // PNG fallbacks for older browsers
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body suppressHydrationWarning className="antialiased">
        <AuthProvider>
          {children}
          <Toaster position="bottom-right" theme="dark" />
        </AuthProvider>
      </body>
    </html>
  );
}
