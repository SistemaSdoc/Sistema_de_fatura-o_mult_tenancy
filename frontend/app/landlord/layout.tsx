// app/landlord/layout.tsx
'use client';

import { LandlordAuthProvider } from '@/context/LandlordAuthContext';

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
    return <LandlordAuthProvider>{children}</LandlordAuthProvider>;
}