import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "blueprint1 — SQL to ERD",
    template: "%s · blueprint1",
  },
  description:
    "Turn PostgreSQL DDL into interactive, shareable entity-relationship blueprints.",
  openGraph: {
    type: "website",
    siteName: "blueprint1",
    title: "blueprint1 — SQL to ERD",
    description:
      "Turn PostgreSQL DDL into interactive, shareable entity-relationship blueprints.",
  },
  twitter: {
    card: "summary_large_image",
    title: "blueprint1 — SQL to ERD",
    description:
      "Turn PostgreSQL DDL into interactive, shareable entity-relationship blueprints.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col bg-background font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
