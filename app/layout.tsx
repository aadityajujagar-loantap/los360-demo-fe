import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "iFlow Loan Application Portal",
  description:
    "Apply for personal, home, and business loans online. Fast approvals, competitive rates, and a seamless digital journey.",
  keywords: [
    "loan",
    "banking",
    "personal loan",
    "home loan",
    "apply online",
  ],
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

import { ReduxProvider } from "./_lib/redux/ReduxProvider";
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2e3192" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <ReduxProvider>
          {children}
          <Toaster position="top-left" />
        </ReduxProvider>
      </body>
    </html>
  );
}
