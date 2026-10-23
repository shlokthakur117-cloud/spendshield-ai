import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SpendShield AI — Intelligent Invoice Risk Detection & Financial Audit Agent',
  description:
    'AI-powered invoice auditing platform for small businesses. Detects duplicate invoices, abnormal charges, and billing inconsistencies with evidence-backed Gemini AI explanations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
