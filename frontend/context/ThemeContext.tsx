// contexts/ThemeContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Cores do Modo Claro
export const LIGHT_COLORS = {
    primary: '#123859',
    secondary: '#F9941F',
    background: '#F2F2F2',
    card: '#FFFFFF',
    text: '#171717',
    textSecondary: '#4B5563',
    border: '#E5E7EB',
    danger: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    hover: '#F3F4F6'
};

// Cores do Modo Escuro
export const DARK_COLORS = {
    primary: '#123859',
    secondary: '#D9961A',
    background: '#171717',
    card: '#2A2A2A',
    text: '#F2F2F2',
    textSecondary: '#B3B3B3',
    border: '#404040',
    danger: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    hover: '#333333'
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<Theme>('dark'); // Começa com dark por padrão

    useEffect(() => {
        // Recuperar tema salvo no localStorage
        const savedTheme = localStorage.getItem('theme') as Theme | null;

        if (savedTheme) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTheme(savedTheme);
        } else {
            // Verificar preferência do sistema
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(systemPrefersDark ? 'dark' : 'light');
        }
    }, []);

    useEffect(() => {
        // Salvar tema no localStorage quando mudar
        localStorage.setItem('theme', theme);

        // Aplicar classe no html para CSS global se necessário
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const colors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

    return (
        <ThemeContext.Provider value={{
            theme,
            toggleTheme,
            setTheme,
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// Hook personalizado para pegar as cores do tema atual
export const useThemeColors = () => {
    const { theme } = useTheme();
    return theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
};