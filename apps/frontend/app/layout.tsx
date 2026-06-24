import type { Metadata } from "next";
import { Newsreader, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TooltipProvider } from "@/components/ui/tooltip";

// Font CSS-var names are intentionally *different* from the Tailwind theme
// tokens (--font-sans/-serif/-mono). globals.css maps theme -> these via
// `var(--font-*-src)`. Using the same name would create a self-reference in
// the @theme block and collapse to the browser default.

// Hanken Grotesk — UI sans (body, labels)
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-sans-src",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Newsreader — display serif (brand, headings)
const newsreader = Newsreader({
  variable: "--font-serif-src",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

// JetBrains Mono — code
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-src",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Marginalia",
  description: "A conversational AI built like a well-made reading & writing tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${hankenGrotesk.variable} ${newsreader.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
