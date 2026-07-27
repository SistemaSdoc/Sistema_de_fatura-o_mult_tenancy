import { Produto, estaSemEstoque, estaEstoqueBaixo } from "@/services/produtos";

export interface StatusEstoque {
    label: string;
    cor: string;
    icone: string;
}

export function getStatusEstoque(item: Produto): StatusEstoque {

    if (estaSemEstoque(item)) {
        return {
            label: "Sem stock",
            cor: "bg-[#F9941F] text-[#FFFFFF]",
            icone: "XCircle",
        };
    }
    if (estaEstoqueBaixo(item)) {
        return {
            label: "Stock Baixo",
            cor: "bg-[#F9941F]/10 text-[#F9941F]",
            icone: "AlertTriangle",
        };
    }
    return {
        label: "OK",
       cor: "bg-[#F9941F] text-[#FFFFFF]",
        icone: "CheckCircle2",
    };
}