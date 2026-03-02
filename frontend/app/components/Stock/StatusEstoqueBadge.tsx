// src/app/(empresa)/estoque/components/StatusEstoqueBadge.tsx
import React from "react";
import { Wrench, XCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Produto } from "@/services/produtos";
import { getStatusEstoque } from "@/app/dashboard/Produtos_servicos/Stock/utils/statusUtils";

interface StatusEstoqueBadgeProps {
    item: Produto;
}

const icones = {
    Wrench: Wrench,
    XCircle: XCircle,
    AlertTriangle: AlertTriangle,
    CheckCircle2: CheckCircle2,
};

export function StatusEstoqueBadge({ item }: StatusEstoqueBadgeProps) {
    const status = getStatusEstoque(item);
    const IconComponent = icones[status.icone as keyof typeof icones];

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.cor}`}>
            {IconComponent && <IconComponent className="w-3 h-3" />}
            {status.label}
        </span>
    );
}