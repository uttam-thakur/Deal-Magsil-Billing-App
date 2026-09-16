import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Deal Magsil Billing',description:'GST and non-GST A4 billing for Deal Magsil'};
import type { ReactNode } from 'react';

export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><body suppressHydrationWarning>{children}</body></html>}
