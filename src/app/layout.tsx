import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { cookies } from 'next/headers';
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'JJK.AI',
  description: 'Chat with Claude AI models',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider
            defaultOpen={defaultOpen}
            style={
              {
                '--sidebar-width': '16rem',
                '--sidebar-width-mobile': '18rem',
              } as React.CSSProperties
            }
          >
            {children}
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
