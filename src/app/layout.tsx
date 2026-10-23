import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Prep Pilot — AI Interview Prep & Resume Tailoring",
  description:
    "Practice the interview before it happens. Prep Pilot builds a private knowledge base from your resumes and target job descriptions, then runs realistic HR, technical, coding and culture-fit rounds — scoring every answer and tailoring your resume to the role.",
  keywords: [
    "interview prep",
    "resume tailoring",
    "AI coach",
    "RAG",
    "LangGraph",
    "ChromaDB",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
