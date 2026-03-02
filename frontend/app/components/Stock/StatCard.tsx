// src/app/(empresa)/estoque/components/StatCard.tsx
import React from "react";

interface ColorScheme {
    success: string;
    warning: string;
    primary: string;
    card: string;
    border: string;
    hover: string;
    text: string;
    textSecondary: string;
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    trend?: "up" | "down" | "neutral";
    colors: ColorScheme;
}

export function StatCard({ icon, label, value, trend = "neutral", colors }: StatCardProps) {
    const getTrendColor = () => {
        switch (trend) {
            case "up": return colors.success;
            case "down": return colors.warning;
            default: return colors.primary;
        }
    };

    const trendColor = getTrendColor();

    return (
        <div 
            className="rounded-xl border p-4 hover:shadow-md transition-shadow"
            style={{ 
                backgroundColor: colors.card, 
                borderColor: colors.border 
            }}
        >
            <div className="flex items-center justify-between">
                <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: colors.hover }}
                >
                    <div style={{ color: trendColor }}>{icon}</div>
                </div>
                <span className="text-2xl font-bold" style={{ color: colors.text }}>{value}</span>
            </div>
            <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>{label}</p>
        </div>
    );
}