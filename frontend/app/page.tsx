"use client";
import Link from 'next/link';
import React, { useState, useRef, useEffect } from 'react';
import { Facebook, Instagram, Linkedin, Sun, Moon } from "lucide-react";

import EmpresasSection from "./components/EmpresasSection";
import {
  HelpCircle,
  Headset,
  FileText,
  ShieldCheck,
  BookOpenCheck
} from "lucide-react";
import { useThemeColors, useTheme } from "@/context/ThemeContext";

// Tipos para os componentes
interface ThemeColors {
  background: string;
  card: string;
  border: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  hover: string;
}

interface AnimatedSectionProps {
  children: React.ReactNode;
  animation?: 'fade-up' | 'fade-in' | 'slide-right' | 'slide-left';
  delay?: number;
  threshold?: number;
}

interface FeatureCardProps {
  Icon?: React.FC<{ color: string }>;
  title: string;
  description: string;
  delay?: number;
  colors: ThemeColors;
}

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  delay?: number;
  colors: ThemeColors;
}

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
  colors: ThemeColors;
}

interface PricingCardProps {
  plan: {
    name: string;
    price: string;
    interval: string;
    isPopular: boolean;
    features: string[];
  };
  index: number;
  colors: ThemeColors;
}

// Botão de Toggle do Tema
const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 rounded-full transition-transform hover:scale-110 active:scale-95 relative group"
      style={{
        backgroundColor: 'transparent',
        color: theme === 'dark' ? '#D9961A' : '#123859'
      }}
      aria-label="Alternar tema"
      title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      <div key={theme} className="transition-all duration-200">
        {theme === 'dark' ? (
          <Sun size={20} />
        ) : (
          <Moon size={20} />
        )}
      </div>
    </button>
  );
  
};

// Componente de Animação - MODIFICADO para animar apenas UMA VEZ
const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  animation = 'fade-up',
  delay = 0,
  threshold = 0.1
}) => {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Se já animou, não faz mais nada
        if (hasAnimated) return;
        
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true); // Marca como já animado para nunca mais voltar
        }
      },
      { threshold: threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, hasAnimated]);

  const baseClasses = 'transition-all duration-700 ease-out';
  let animationClasses = '';

  if (animation === 'fade-up') {
    animationClasses = isVisible
      ? 'opacity-100 translate-y-0'
      : 'opacity-0 translate-y-10';
  } else if (animation === 'fade-in') {
    animationClasses = isVisible
      ? 'opacity-100'
      : 'opacity-0';
  } else if (animation === 'slide-right') {
    animationClasses = isVisible
      ? 'opacity-100 translate-x-0'
      : 'opacity-0 -translate-x-10';
  } else if (animation === 'slide-left') {
    animationClasses = isVisible
      ? 'opacity-100 translate-x-0'
      : 'opacity-0 translate-x-10';
  }

  // Se já animou, força a classe final para manter visível
  const finalClasses = hasAnimated && !isVisible 
    ? animation === 'fade-up' ? 'opacity-100 translate-y-0'
    : animation === 'fade-in' ? 'opacity-100'
    : animation === 'slide-right' || animation === 'slide-left' ? 'opacity-100 translate-x-0'
    : ''
    : animationClasses;

  const style = delay > 0 ? { transitionDelay: `${delay}ms` } : {};

  return (
    <div ref={ref} className={`${baseClasses} ${hasAnimated ? 'opacity-100 translate-y-0 translate-x-0' : finalClasses}`} style={style}>
      {children}
    </div>
  );
};

// Ícone de Visto
const CheckIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5 mr-2 shrink-0"
    style={{ color }}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// Ícone de Factura
const InvoiceIcon: React.FC<{ sizeClass?: string }> = ({ sizeClass = 'w-12 h-12' }) => (
  <img src="/images/3.png" alt="Invoice Icon" className={sizeClass} />
);

// Ícone de Menu
const MenuIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
  </svg>
);

// Componente Cartão de Funcionalidade
const FeatureCard: React.FC<FeatureCardProps> = ({
  Icon = () => <CheckIcon color="#F9941F" />,
  title,
  description,
  delay = 0,
  colors
}) => (
  <AnimatedSection animation="fade-up" delay={delay}>
    <div className="p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 transform hover:scale-[1.02] border h-full" style={{
      backgroundColor: colors.card,
      borderColor: colors.border
    }}>
      <div className="flex items-center mb-3">
        <Icon color={colors.primary} />
        <h3 className="text-xl font-bold" style={{ color: colors.text }}>{title}</h3>
      </div>
      <p className="text-sm" style={{ color: colors.textSecondary }}>{description}</p>
    </div>
  </AnimatedSection>
);

// Componente Cartão de Passo do Processo
const StepCard: React.FC<StepCardProps> = ({ number, title, description, delay = 0, colors }) => (
  <AnimatedSection animation="fade-up" delay={delay}>
    <div className="p-6 rounded-xl shadow-lg border-t-4 h-full" style={{
      backgroundColor: colors.card,
      borderColor: colors.secondary
    }}>
      <span className="text-4xl font-extrabold mb-3 block" style={{ color: colors.secondary }}>{number}</span>
      <h3 className="text-xl font-bold mb-2" style={{ color: colors.text }}>{title}</h3>
      <p className="text-sm" style={{ color: colors.textSecondary }}>{description}</p>
    </div>
  </AnimatedSection>
);

// Componente Visual Grande para a Secção Hero
const HeroVisual: React.FC<{ colors: ThemeColors }> = ({ colors }) => (
  <AnimatedSection animation="slide-left" delay={500} threshold={0.1}>
    <div
      className="hidden lg:flex justify-center items-center p-12 rounded-3xl h-full shadow-2xl"
      style={{ backgroundColor: colors.hover }}
    >
      <InvoiceIcon sizeClass="w-48 h-48" />
    </div>
  </AnimatedSection>
);

// Componente Acordeão FAQ
const FAQItem: React.FC<FAQItemProps> = ({ question, answer, index, colors }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AnimatedSection animation="fade-up" delay={index * 100}>
      <div className="border-b" style={{ borderColor: colors.border }}>
        <button
          className="flex justify-between items-center w-full py-4 text-left font-semibold transition-colors duration-200 hover:opacity-80"
          style={{ color: colors.text }}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          {question}
          <span className="text-2xl">{isOpen ? '−' : '+'}</span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 py-3' : 'max-h-0 opacity-0'}`}
        >
          <p style={{ color: colors.textSecondary }}>{answer}</p>
        </div>
      </div>
    </AnimatedSection>
  );
};

// Componente Cartão do Plano de Preços
const PricingCard: React.FC<PricingCardProps> = ({ plan, index, colors }) => {
  const buttonStyle = {
    backgroundColor: 'white',
    color: colors.primary,
    borderRadius: '30px',
    border: `1px solid ${colors.primary}`,
    transition: 'all 0.3s ease',
  };

  const buttonHoverStyle = {
    backgroundColor: colors.primary,
    color: 'white',
    transform: 'scale(1.05)'
  };

  return (
    <AnimatedSection animation="fade-up" delay={index * 100} threshold={0.2}>
      <div className="flex flex-col p-6 mx-auto max-w-lg text-center rounded-xl border-2 h-full transition duration-300 ease-in-out hover:shadow-2xl hover:scale-[1.03]" style={{
        backgroundColor: colors.card,
        borderColor: colors.border
      }}>
        <h3 className="mb-4 text-2xl font-semibold" style={{ color: colors.text }}>
          {plan.name}
        </h3>

        <div className="flex justify-center items-baseline my-4">
          <span className="text-5xl font-extrabold" style={{ color: colors.text }}>{plan.price}</span>
          <span className="text-xl font-medium" style={{ color: colors.textSecondary }}>{plan.interval}</span>
        </div>

        <ul className="space-y-3 text-left mb-8 grow">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start">
              <CheckIcon color={colors.secondary} />
              <span className="text-sm" style={{ color: colors.textSecondary }}>{feature}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/register"
          className="mt-auto cursor-pointer inline-block text-center px-8 py-3 rounded-full font-semibold transition duration-300 ease-in-out transform hover:scale-[1.05]"
          style={buttonStyle}
          onMouseOver={e => Object.assign(e.currentTarget.style, buttonHoverStyle)}
          onMouseOut={e => Object.assign(e.currentTarget.style, buttonStyle)}
        >
          {plan.name === "Grátis" ? "Experimente Agora" : "Assinar"}
        </Link>
      </div>
    </AnimatedSection>
  );
};

// DADOS
const allFeaturesData = [
  { title: "Emissão de Facturas", description: "Crie facturas, notas de crédito e recibos rapidamente, associe clientes, produtos e impostos, e envie por email." },
  { title: "Gestão de Clientes", description: "Cadastre e administre os seus clientes, consulte o histórico de facturas e contactos de forma organizada e segura." },
  { title: "Controle de Produtos", description: "Gerencie produtos e serviços, preços e stock em tempo real, directamente ligados às facturas." },
  { title: "Relatórios Financeiros", description: "Visualize relatórios detalhados sobre vendas, facturamento e desempenho financeiro da sua empresa." },
  { title: "Gestão de Utilizadores", description: "Adicione membros da equipa com permissões diferentes, garantindo controlo e colaboração eficiente." },
];

const processSteps = [
  { number: 1, title: "Registo Rápido", description: "Comece em minutos! Crie sua conta sem papelada e esteja pronto para facturar hoje mesmo." },
  { number: 2, title: "Produtividade Garantida", description: "Otimize processos internos e dedique mais tempo ao crescimento do negócio." },
  { number: 3, title: "Facture Já", description: "Facture em um clique! Crie e envie sua primeira factura sem complicações." },
];

const faqData = [
  { q: "O que torna o Factura Já diferente de outras plataformas?", a: "O FaturaJá foca-se na simplicidade e rapidez. Pode criar uma factura profissional em menos de 60 segundos, com ênfase na conformidade legal angolana e num design limpo e moderno." },
  { q: "Posso cancelar o meu plano a qualquer momento?", a: "Sim, todos os planos podem ser cancelados a qualquer momento, sem taxas de rescisão. Caso cancele, mantém o acesso até ao final do ciclo de facturação." },
  { q: "Como é que a segurança dos meus dados é garantida?", a: "Utilizamos encriptação SSL de 256 bits para todas as comunicações, e os seus dados são armazenados em servidores seguros, cumprindo a legislação angolana de protecção de dados pessoais. A privacidade é a nossa prioridade." },
  { q: "O Factura Já é compatível com telemóveis?", a: "Absolutamente! A plataforma é 100% responsiva, funcionando perfeitamente em dispositivos móveis, tablets e desktops." },
  { q: "Posso adicionar vários utilizadores à minha conta?", a: "Sim, dependendo do plano, pode adicionar vários utilizadores com diferentes permissões para gerir clientes, produtos e facturas de forma colaborativa." },
  { q: "Quais métodos de pagamento estão disponíveis para os clientes finais?", a: "Pode aceitar pagamentos por transferência bancária, Multicaixa ou cartões de débito/crédito, e acompanhar o estado das facturas (pendente, pago, cancelado)." },
  { q: "Posso gerar relatórios das minhas vendas e facturamento?", a: "Sim, os planos Essencial, Pro, Premium e Empresa permitem gerar relatórios detalhados de facturamento e vendas, ajudando a monitorizar o desempenho financeiro da sua empresa." },
  { q: "As facturas cumprem a legislação fiscal angolana?", a: "Sim, todas as facturas emitidas pelo FaturaJá cumprem as normas da Autoridade Tributária Angolana, garantindo conformidade legal." },
];

const pricingPlans = [
  {
    name: "Grátis",
    price: "0 KZ",
    interval: "/mês",
    isPopular: false,
    features: ["Até 5 facturas/mês", "1 utilizador", "Suporte comunitário", "Armazenamento de 100MB", "Design padrão", "Sem relatórios"]
  },
  {
    name: "Essencial",
    price: "19.000 KZ",
    interval: "/mês",
    isPopular: true,
    features: ["Facturação ilimitada", "Até 3 utilizadores", "Suporte prioritário", "Armazenamento ilimitado", "Gestão de clientes avançada", "Relatórios detalhados (trimestrais)"]
  },
  {
    name: "Pro",
    price: "39.000 KZ",
    interval: "/mês",
    isPopular: false,
    features: ["Tudo no Essencial", "Até 5 utilizadores", "API de integração", "Automação simples de pagamentos", "Monitorização de pagamentos", "Relatórios avançados (personalizáveis)"]
  },
  {
    name: "Premium",
    price: "79.000 KZ",
    interval: "/mês",
    isPopular: false,
    features: ["Tudo no Pro", "Até 10 utilizadores", "Gestão multi-moeda", "Gestão de stocks", "Consultor dedicado", "Suporte 24/7"]
  },
  {
    name: "Empresa",
    price: "149.000 KZ",
    interval: "/mês",
    isPopular: false,
    features: ["Tudo no Premium", "Utilizadores ilimitados", "Servidor dedicado", "Formação personalizada", "Onboarding VIP", "Conformidade internacional"]
  }
];

const navLinks = [
  { name: 'Funcionalidades', id: 'funcionalidades' },
  { name: 'Processo', id: 'processo' },
  { name: 'Planos', id: 'planos' },
  { name: 'FAQ', id: 'faq' },
];

export default function App() {
  const colors = useThemeColors();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({ top: element.offsetTop - 64, behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  const FOOTER_GRADIENT_START = "#0F2D44";
  const FOOTER_GRADIENT_END = "#1A476F";
  const FOOTER_GRADIENT_MID = "#0A1F30";

  return (
    <div className="min-h-screen font-inter transition-colors duration-300" style={{ backgroundColor: colors.background }}>

      <style jsx global>{`
        body {
          font-family: 'Inter', sans-serif;
        }
        .animated-gradient-section {
          background: linear-gradient(
            -30deg,
            ${FOOTER_GRADIENT_START},
            ${FOOTER_GRADIENT_END},
            ${FOOTER_GRADIENT_MID},
            ${FOOTER_GRADIENT_START}
          );
          background-size: 400% 400%;
          animation: gradientShift 25s ease infinite;
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 shadow-lg" style={{ backgroundColor: colors.card }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => scrollToSection('topo')}>
            <InvoiceIcon />
            <h1 className="text-2xl font-extrabold" style={{ color: colors.primary }}>
              Fatura<span style={{ color: colors.secondary }}>Já</span>
            </h1>
          </div>

          <nav className="hidden lg:flex items-center space-x-4">
            {navLinks.map(link => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className="cursor-pointer text-sm font-medium transition duration-150 hover:opacity-80"
                style={{ color: colors.textSecondary }}
              >
                {link.name}
              </button>
            ))}
            <ThemeToggleButton />
            <Link
              href="/login"
              className="px-4 py-2 rounded-full font-semibold text-sm transition duration-300 ease-in-out transform hover:scale-[1.05]"
              style={{ backgroundColor: colors.primary, color: 'white' }}
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-full font-semibold text-sm transition duration-300 ease-in-out transform hover:scale-[1.05]"
              style={{ backgroundColor: colors.secondary, color: 'white' }}
            >
              Cadastro
            </Link>
          </nav>

          <div className="lg:hidden flex items-center gap-2">
            <ThemeToggleButton />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ color: colors.primary }}
              aria-expanded={isMenuOpen}
            >
              <MenuIcon />
            </button>
          </div>
        </div>

        <div id="mobile-menu"
          className={`lg:hidden transition-all duration-300 ease-in-out overflow-hidden ${isMenuOpen ? 'max-h-96 opacity-100 py-2' : 'max-h-0 opacity-0'}`}
          style={{ backgroundColor: colors.card }}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium cursor-pointer transition hover:opacity-80"
                style={{ color: colors.text }}
              >
                {link.name}
              </button>
            ))}
            <Link
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="w-full text-center py-2 px-4 text-sm cursor-pointer mt-2 block rounded-full font-semibold"
              style={{ backgroundColor: colors.primary, color: 'white' }}
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main>
        {/* Hero Section */}
        <section id="topo" className="pt-20 pb-16 md:py-32" style={{ backgroundColor: colors.background }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <AnimatedSection animation="fade-up" delay={0}>
                  <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4" style={{ color: colors.primary }}>
                    Facturação Simples, <br className="sm:hidden" />
                    <span style={{ color: colors.secondary }}>Poderosa</span> e Rápida.
                  </h2>
                </AnimatedSection>
                <AnimatedSection animation="fade-up" delay={200}>
                  <p className="text-xl md:text-2xl mb-8 max-w-lg mx-auto lg:mx-0" style={{ color: colors.textSecondary }}>
                    Gere facturas profissionais em segundos, sem complicações.
                    A ferramenta ideal para pequenos negócios e freelancers.
                  </p>
                </AnimatedSection>
                <AnimatedSection animation="fade-up" delay={400}>
                  <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                    <Link
                      href="/register"
                      className="group relative px-8 py-3.5 rounded-full font-bold text-white transition-all duration-300 transform hover:scale-105 hover:shadow-xl overflow-hidden"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <span className="relative z-10 flex items-center gap-2">Comece Grátis</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Link>
                    <button
                      onClick={() => scrollToSection('planos')}
                      className="px-8 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 border-2"
                      style={{ color: colors.text, borderColor: colors.border, backgroundColor: 'transparent' }}
                    >
                      Ver Planos
                    </button>
                  </div>
                </AnimatedSection>
              </div>
              <HeroVisual colors={colors} />
            </div>
          </div>
        </section>

        {/* Funcionalidades */}
        <section id="funcionalidades" className="py-16 md:py-24" style={{ backgroundColor: colors.card }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection animation="fade-up">
              <h1 className="text-4xl font-extrabold text-center mb-12" style={{ color: colors.text }}>
                Ferramentas Essenciais para o seu Negócio
              </h1>
              <p className="text-center mb-12 text-lg" style={{ color: colors.textSecondary }}>
                Tudo o que precisa para começar a facturar de forma simples, segura e eficiente.
              </p>
            </AnimatedSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {allFeaturesData.map((feature, index) => (
                <FeatureCard
                  key={index}
                  Icon={() => <CheckIcon color={colors.secondary} />}
                  title={feature.title}
                  description={feature.description}
                  delay={index * 100}
                  colors={colors}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Processo */}
        <section id="processo" className="py-16 md:py-24" style={{ backgroundColor: colors.hover }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection animation="fade-up">
              <h2 className="text-3xl font-extrabold text-center mb-12" style={{ color: colors.text }}>
                Fácil de Usar, Resultados Rápidos
              </h2>
            </AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-9">
              {processSteps.map((step, index) => (
                <StepCard
                  key={index}
                  number={step.number}
                  title={step.title}
                  description={step.description}
                  delay={index * 200}
                  colors={colors}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="py-16 md:py-24" style={{ backgroundColor: colors.card }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection animation="fade-up">
              <h2 className="text-3xl font-extrabold text-center mb-12" style={{ color: colors.text }}>
                Escolha o Plano Certo para Si
              </h2>
            </AnimatedSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
              {pricingPlans.map((plan, index) => (
                <PricingCard key={index} plan={plan} index={index} colors={colors} />
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-16 md:py-24" style={{ backgroundColor: colors.background }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection animation="fade-up">
              <h2 className="text-3xl font-extrabold text-center mb-10" style={{ color: colors.text }}>
                Perguntas Frequentes
              </h2>
            </AnimatedSection>
            <div className="space-y-4">
              {faqData.map((item, index) => (
                <FAQItem key={index} question={item.q} answer={item.a} index={index} colors={colors} />
              ))}
            </div>
          </div>
        </section>

        <EmpresasSection />
      </main>

      {/* Footer */}
      <AnimatedSection animation="fade-in" delay={200}>
        <footer className="py-10 shadow-inner transition-colors duration-1000 animated-gradient-section text-white [&_p]:text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-b border-opacity-30 pb-8 mb-8" style={{ borderColor: colors.secondary }}>
              <div className="col-span-2 md:col-span-1">
                <h4 className="text-2xl font-extrabold mb-4 text-white">
                  Fatura<span style={{ color: colors.secondary }}>Já</span>
                </h4>
                <p className="mb-4 text-white">A sua solução definitiva para gestão e facturação simplificada. Rápido, seguro e compatível com as normas fiscais.</p>
                <p className="space-y-1">
                  <span className="block text-white">Luanda, Angola</span>
                  <a href="mailto:geral@sdoca.it.ao" className="block font-semibold hover:underline" style={{ color: colors.secondary }}>geral@sdoca.it.ao</a>
                  <span className="block font-semibold" style={{ color: colors.secondary }}>+244 923678529 <br /> +244 927800505</span>
                </p>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4" style={{ color: colors.secondary }}>Navegação</h4>
                <ul className="space-y-2 text-sm">
                  {navLinks.map(link => (
                    <li key={link.id}>
                      <button onClick={() => scrollToSection(link.id)} className="cursor-pointer transition hover:text-white text-white">{link.name}</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4" style={{ color: colors.secondary }}>Apoio e Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><button onClick={() => scrollToSection("faq")} className="flex items-center gap-2 text-white"><HelpCircle size={18} /> FAQ</button></li>
                  <li><button className="flex items-center gap-2 text-white"><Headset size={18} /> Suporte Técnico</button></li>
                  <li><button className="flex items-center gap-2 text-white"><FileText size={18} /> Termos de Serviço</button></li>
                  <li><button className="flex items-center gap-2 text-white"><ShieldCheck size={18} /> Política de Privacidade</button></li>
                  <li><button className="flex items-center gap-2 text-white"><BookOpenCheck size={18} /> Livro de Reclamações</button></li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4" style={{ color: colors.secondary }}>Siga-nos</h4>
                <div className="flex space-x-2">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full transition-all duration-300 hover:bg-opacity-10" style={{ backgroundColor: colors.secondary + '20' }}><Facebook size={22} color="white" /></a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full transition-all duration-300 hover:bg-opacity-10" style={{ backgroundColor: colors.secondary + '20' }}><Instagram size={22} color="white" /></a>
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full transition-all duration-300 hover:bg-opacity-10" style={{ backgroundColor: colors.secondary + '20' }}><Linkedin size={22} color="white" /></a>
                </div>
              </div>
            </div>
            <div className="text-center text-sm text-white/70">&copy; 2025 FaturaJá. Todos os direitos reservados. | Desenvolvido em Angola por SDOCA.</div>
          </div>
        </footer>
      </AnimatedSection>
    </div>
  );
}
