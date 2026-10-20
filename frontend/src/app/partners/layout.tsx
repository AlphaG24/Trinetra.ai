"use client";

import "./partners.css";
import { Layout } from "@/components/layout/Layout";
import { usePathname } from "next/navigation";

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/partners";

  if (isLandingPage) {
    return <>{children}</>;
  }

  return (
    <div className="partner-theme">
      {children}
    </div>
  );
}
