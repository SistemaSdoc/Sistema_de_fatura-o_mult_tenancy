'use client';

import { LandlordAuthProvider } from '@/context/LandlordAuthContext';
import { useThemeColors } from '@/context/ThemeContext';
import DashboardHeader from './components/Header';

function LayoutShell({ children }: { children: React.ReactNode }) {
    const colors = useThemeColors();

    return (
        <div
            className="min-h-screen transition-colors duration-300"
            style={{ backgroundColor: colors.background }}
        >
            <DashboardHeader />
            <main className="max-w-7xl mx-auto w-full py-6 px-4 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <LandlordAuthProvider>
            <LayoutShell>{children}</LayoutShell>
        </LandlordAuthProvider>
    );
}