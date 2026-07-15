'use client';

import { LandlordAuthProvider } from '@/context/LandlordAuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Toaster } from 'sonner';

export default function LandlordLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider>
            <LandlordAuthProvider>
                {children}
                <Toaster position="top-right" richColors closeButton />
            </LandlordAuthProvider>
        </ThemeProvider>
    );
}