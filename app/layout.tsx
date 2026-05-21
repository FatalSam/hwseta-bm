import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-buttons/styles/material.css";
import "@syncfusion/ej2-calendars/styles/material.css";
import "@syncfusion/ej2-dropdowns/styles/material.css";
import "@syncfusion/ej2-inputs/styles/material.css";
import "@syncfusion/ej2-lists/styles/material.css";
import "@syncfusion/ej2-popups/styles/material.css";
import "@syncfusion/ej2-navigations/styles/material.css";
import "@syncfusion/ej2-notifications/styles/material.css";

import Providers from "@/ultis/providers";
import SyncfusionLicense from "@/components/syncfusion-license";
import PortalChatbot from "@/components/chat/portal-chatbot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HWSETA Beneficiary Hub",
  description: "HWSETA beneficiary registration, sign-in, and dashboard.",
  icons: {
    icon: "/images/hwseta-logo.png",
    shortcut: "/images/hwseta-logo.png",
    apple: "/images/hwseta-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* SyncfusionLicense must be first to register license before any Syncfusion components render */}
        <SyncfusionLicense />
        <Providers>
          {children}
          <PortalChatbot />
        </Providers>
      </body>
    </html>
  );
}
