import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HelpMan — AI-Powered Placement Prep Platform",
  description: "Gamified AI placement preparation platform with daily coding tasks via WhatsApp. Track your progress with XP, streaks, and leaderboards.",
  keywords: ["placement preparation", "competitive programming", "AI", "LeetCode", "Codeforces", "gamification"],
  authors: [{ name: "Divyanshu Singh" }],
  openGraph: {
    title: "HelpMan — AI-Powered Placement Prep Platform",
    description: "Daily AI-curated coding problems delivered via WhatsApp. Level up with XP, streaks, and ranks.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#06060b" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
