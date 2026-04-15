import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import KeyringProvider from "../components/KeyringProvider";

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "ODS Shop",
  description: "Private shop demo con chat cifrata end-to-end"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${sans.variable} ${mono.variable} bg-grid`}>
        <KeyringProvider>{children}</KeyringProvider>
      </body>
    </html>
  );
}
