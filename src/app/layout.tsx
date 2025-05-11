
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/auth/auth-provider';
import { LocaleProvider } from '@/lib/i18n/index';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TabWise - Smart Tab Management',
  description: 'Organize your browser tabs intelligently with TabWise.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* AuthProvider needs to be outermost because ThemeProvider and LocaleProvider depend on it */}
        <AuthProvider> 
          {/* LocaleProvider is next, as AuthProvider no longer depends on it. ThemeProvider might depend on LocaleProvider if themes were locale-specific. */}
          <LocaleProvider> 
            {/* ThemeProvider (our custom one which uses next-themes internally and useAuth) is last among these three. */}
            <ThemeProvider 
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
