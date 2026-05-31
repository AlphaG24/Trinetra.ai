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

  return (
    <div className="partner-theme">
      {isLandingPage ? <Layout>{children}</Layout> : children}
    </div>
  );
}
