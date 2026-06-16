// app/landlord/layout.tsx

'use client';

import { LandlordAuthProvider } from '@/context/LandlordAuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';

// Rotas que NÃO devem mostrar o header (páginas públicas)
const PUBLIC_ROUTES = ['/landlord/login', '/landlord/register', '/landlord/forgot-password'];

export default function LandlordLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname || '');
    
    return (
        <ThemeProvider>
            <LandlordAuthProvider>
                <div className="min-h-screen flex flex-col">
                    
                    {/* Conteúdo principal */}
                    <main className={`flex-1 ${!isPublicRoute ? 'pt-16' : ''}`}>
                        <div className="container mx-auto px-4 py-6">
                            {children}
                        </div>
                    </main>
                    
                    {/* Footer opcional */}
                    {!isPublicRoute && (
                        <footer className="border-t py-4 text-center text-sm text-gray-500">
                            <div className="container mx-auto">
                                © {new Date().getFullYear()} FacturaJá - Sbbbbbbbbbbbbbbbbbbbbistema de Gestão de Empresas
                            </div>
                        </footer>
                    )}
                    
                    {/* Toast notifications */}
                    <Toaster position="top-right" richColors />
                </div>
            </LandlordAuthProvider>
        </ThemeProvider>
    );
}