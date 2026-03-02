// src/app/(empresa)/estoque/utils/statusUtils.ts
import { Produto, isServico, estaSemEstoque, estaEstoqueBaixo } from "@/services/produtos";

export interface StatusEstoque {
    label: string;
    cor: string;
    icone: string;
}

export function getStatusEstoque(item: Produto): StatusEstoque {
    if (isServico(item)) {
        return {
            label: "Serviço",
            cor: "bg-gray-100 text-gray-600",
            icone: "Wrench",
        };
    }
    if (estaSemEstoque(item)) {
        return {
            label: "Sem Estoque",
            cor: "bg-[#F9941F]/10 text-[#F9941F]",
            icone: "XCircle",
        };
    }
    if (estaEstoqueBaixo(item)) {
        return {
            label: "Estoque Baixo",
            cor: "bg-[#F9941F]/10 text-[#F9941F]",
            icone: "AlertTriangle",
        };
    }
    return {
        label: "OK",
        cor: "bg-green-100 text-green-700",
        icone: "CheckCircle2",
    };
}