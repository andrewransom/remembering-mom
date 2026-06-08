import type { Metadata } from "next";
import { Lora, Source_Sans_3 } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { getAuthenticatedUser } from "@/lib/auth";
import "./globals.css";

const headingFont = Lora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Remembering",
  description:
    "A gentle memorial site for sharing memories and condolences.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getAuthenticatedUser();

  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <SiteHeader
            isAuthenticated={Boolean(currentUser)}
            userEmail={currentUser?.email ?? null}
          />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
