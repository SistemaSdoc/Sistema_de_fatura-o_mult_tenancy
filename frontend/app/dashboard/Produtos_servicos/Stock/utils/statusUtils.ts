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
            cor: "bg-[#E5E7EB] text-[#4B5563]",
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
       cor: "bg-[#28A745]/10 text-[#28A745]",
        icone: "CheckCircle2",
    };
}