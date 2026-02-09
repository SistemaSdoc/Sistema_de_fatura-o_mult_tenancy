"use client";
import { motion } from "framer-motion";
import Image from "next/image";

const empresas = [
    { name: "SDOCA", logo: "/images/Gestão de Clientes.webp", website: "https://sdoca.it.ao/" },
    { name: "CONTAI-CONTABILIDADE & COMÉRCIO", logo: "/images/Pingodagua.jpeg", website: "https://technova.ao" },
];

const EmpresasSection = () => {
    return (
        <section id="empresas" className="py-16 md:py-24 bg-[#F2F2F2]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-10 text-[#123859]">
                    Empresas que Confiam no <span className="text-[#F9941F]">FaturaJá</span>
                </h2>

                {/* Grid de logos */}
                <div className="flex flex-wrap justify-center gap-8">
                    {empresas.map((empresa, idx) => (
                        <motion.a
                            key={idx}
                            href={empresa.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative flex items-center justify-center min-w-[120px] md:min-w-[160px]"
                            whileHover={{ scale: 1.2 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <Image
                                src={empresa.logo || "/images/no-logo.png"}
                                alt={empresa.name || "Logo da empresa"}
                                width={80}
                                height={80}
                                className="h-16 md:h-20 object-contain transition duration-300"
                            />
                            {/* Tooltip */}
                            <span className="absolute bottom-0 mb-10 opacity-0 group-hover:opacity-100 text-sm text-[#123859] bg-white rounded px-2 py-1 shadow-lg transition-opacity duration-300">
                                {empresa.name}
                            </span>
                        </motion.a>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default EmpresasSection;
