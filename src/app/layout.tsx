import type { Metadata } from 'next';
import './globals.css';
import './workflow.css';
import './account.css';
import './theme.css';

export const metadata: Metadata = { title: '에너지 인사이트', description: '에너지 운영 관리' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="ko"><body>{children}</body></html>;
}
