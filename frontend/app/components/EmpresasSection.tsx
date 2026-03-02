"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { useThemeColors } from "@/context/ThemeContext";

interface Empresa {
    name: string;
    logo: string;
    website: string;
}

const empresas: Empresa[] = [
    { name: "SDOCA", logo: "/images/Gestão de Clientes.webp", website: "https://sdoca.it.ao/" },
    { name: "CONTAI-CONTABILIDADE & COMÉRCIO", logo: "/images/Pingodagua.jpeg", website: "https://technova.ao" },
];

const EmpresasSection = () => {
    const colors = useThemeColors();

    return (
        <section 
            id="empresas" 
            className="py-16 md:py-24 transition-colors duration-300"
            style={{ backgroundColor: colors.background }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 
                    className="text-3xl md:text-4xl font-extrabold text-center mb-10"
                    style={{ color: colors.text }}
                >
                    Empresas que Confiam no <span style={{ color: colors.secondary }}>FaturaJá</span>
                </h2>

                {/* Grid de logos */}
                <div className="flex flex-wrap justify-center gap-8">
                    {empresas.map((empresa, idx) => (
                        <motion.a
                            key={idx}
                            href={empresa.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative flex items-center justify-center min-w-[120px] md:min-w-[160px] group"
                            whileHover={{ scale: 1.2 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <Image
                                src={empresa.logo || "/images/no-logo.png"}
                                alt={empresa.name || "Logo da empresa"}
                                width={80}
                                height={80}
                                className="h-16 md:h-20 object-contain transition duration-300"
                                style={{ 
                                    filter: colors.background === '#171717' ? 'brightness(0.9) contrast(1.2)' : 'none'
                                }}
                            />
                            {/* Tooltip */}
                            <motion.span 
                                initial={{ opacity: 0, y: 10 }}
                                whileHover={{ opacity: 1, y: 0 }}
                                className="absolute -bottom-8 text-sm rounded px-2 py-1 shadow-lg transition-all duration-300 whitespace-nowrap"
                                style={{ 
                                    backgroundColor: colors.card,
                                    color: colors.text,
                                    border: `1px solid ${colors.border}`
                                }}
                            >
                                {empresa.name}
                            </motion.span>
                        </motion.a>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default EmpresasSection;