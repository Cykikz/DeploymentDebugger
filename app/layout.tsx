import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DebugBOB - AI DevOps Debugging Agent',
  description: 'Autonomous multi-agent system for debugging deployment failures',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-gray-950 text-gray-100">
        {children}
      </body>
    </html>
  );
}

// Made with Bob

