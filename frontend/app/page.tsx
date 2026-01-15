"use client";
import Link from 'next/link';
import React, { useState, useRef, useEffect } from 'react';
import { Facebook, Instagram, Linkedin } from "lucide-react";
import EmpresasSection from "./components/EmpresasSection";
import {
  HelpCircle,
  Headset,
  FileText,
  ShieldCheck,
  BookOpenCheck
} from "lucide-react"




// --- Paleta de Cores PERSONALIZADA ---
const COLOR_PRIMARY = "#123859";   // Azul-Escuro Forte (Ação principal, Botões)
const COLOR_ACCENT = "#F9941F";    // Laranja/Âmbar Intenso (Destaque, Títulos)
const COLOR_DARK_TEXT = "#123859"; // Azul Escuro (Texto Principal)
const COLOR_LIGHT_BG = "#F2F2F2";  // Cinza Muito Claro (Fundo estático)
const COLOR_SECONDARY_BG = "#E5E5E5"; // Um tom intermédio para secções

// CORES NOVAS PARA O GRADIENTE SUAVE DO FOOTER
const FOOTER_GRADIENT_START = "#0F2D44"; // Azul escuro um pouco mais frio
const FOOTER_GRADIENT_END = "#1A476F";   // Azul escuro primário
const FOOTER_GRADIENT_MID = "#0A1F30";   // Tom quase preto para profundidade

// Cor de Texto do Rodapé (AGORA BRANCO FIXO)
const FOOTER_TEXT_COLOR = 'white'; // Mantido para referência, mas usaremos 'text-white'
const FOOTER_ACCENT_COLOR = COLOR_ACCENT;

// Classes Tailwind customizadas: APENAS UTILITIES SEM CORES DINÂMICAS
const TAILWIND_CLASSES = {
  // Botão principal (usado agora nos planos)
  buttonPrimary: `px-8 py-3 rounded-full font-semibold  transition duration-300 ease-in-out transform hover:scale-[1.05] focus:ring-4 focus:ring-opacity-50`,
  // Botão secundário 
  buttonSecondary: `px-8 py-3 rounded-full font-semibold  transition duration-300 ease-in-out transform hover:scale-[1.03] focus:ring-4 focus:ring-opacity-50 border`,
  // Input field focus (Usa a cor primária para o anel de foco)
  inputFocus: `border-gray-300 focus:ring-2 focus:ring-[${COLOR_PRIMARY}] focus:ring-opacity-75 focus:shadow-lg focus:border-[${COLOR_PRIMARY}]`,
  // Textos
  textHighlight: ``,
  textDefault: ``,
  textMuted: "text-white-600",
};
// 1. COMPONENTE DE ANIMAÇÃO (Animation Observer)
const AnimatedSection = ({ children, animation = 'fade-up', delay = 0, threshold = 0.1 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
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
  }, [threshold]);

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

  const style = delay > 0 ? { transitionDelay: `${delay}ms` } : {};

  return (
    <div ref={ref} className={`${baseClasses} ${animationClasses}`} style={style}>
      {children}
    </div>
  );
};


// =========================================================================
// 2. COMPONENTES E ÍCONES AUXILIARES
// =========================================================================

// Ícone de Visto (Usado nas Funcionalidades e Planos)
const CheckIcon = ({ color = COLOR_PRIMARY }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5 mr-2 flex-shrink-0"
    style={{ color: color }}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// Ícone de Fatura (Usado no Logotipo e Hero)
const InvoiceIcon = ({ sizeClass = 'w-12 h-12' }) => (
  <img src="/images/3.png" alt="Invoice Icon" className={sizeClass} />
);



// Ícone: Headset (Suporte Técnico)
const HeadsetIcon = ({ size = 4, color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`w-${size} h-${size} mr-2 flex-shrink-0`} style={{ color: color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l-5 5m5-5l-5-5" />
  </svg>
);

// Ícone: Book (Livro de Reclamações)
const BookIcon = ({ size = 4, color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`w-${size} h-${size} mr-2 flex-shrink-0`} style={{ color: color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.206 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.832 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.832 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.168 18 16.5 18s-3.332.477-4.5 1.253" />
  </svg>
);

// Ícone de Menu (Três Barras)
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
  </svg>
);

// Ícones Sociais (Para o rodapé)
const FacebookIcon = () => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M14.999 3h2.998v3h-3a1 1 0 00-1 1v2h4l-.667 4h-3.333v9h-4v-9h-3v-4h3v-2.5c0-3.668 2.333-5.5 6-5.5z" /></svg>);
const InstagramIcon = () => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4c0 3.2-2.6 5.8-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2zm-.2 2A1.8 1.8 0 004 5.8v8.4c0 0 1.8 1.8 1.8 1.8h8.4c1 0 1.8-.8 1.8-1.8V5.8A1.8 1.8 0 0016.2 4H7.6zm9.2 2.4a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zm-4 3.6c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6a2 2 0 110-4 2 2 0 010 4z" /></svg>);
const LinkedinIcon = () => (<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.7 2h-15C2.6 2 2 2.6 2 4.3v15.4C2 21.4 2.6 22 4.3 22h15.4c1.7 0 2.3-.6 2.3-2.3V4.3C22 2.6 21.4 2 19.7 2zM8 19H5V8h3v11zm2-11h-3V19h3V8zm7 0h-3v11h3V8zm0 0h3V19h-3V8zm-11-2.5A2.5 2.5 0 117.5 9 2.5 2.5 0 016 6.5z" /></svg>);

const SocialIconLink = ({ icon, href, accentColor, textColor }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`transition duration-200`}
    style={{ color: textColor }}
    onMouseOver={e => e.currentTarget.style.color = accentColor}
    onMouseOut={e => e.currentTarget.style.color = textColor}
  >
    {icon}
  </a>
);

// Componente Cartão de Funcionalidade
const FeatureCard = ({ Icon = () => <CheckIcon color={COLOR_PRIMARY} />, title, description, delay }) => (
  <AnimatedSection animation="fade-up" delay={delay}>
    <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 transform hover:scale-[1.02] border border-gray-100 h-full">
      <div className="flex items-center mb-3">
        <Icon />
        <h3 className={`text-xl font-bold ${TAILWIND_CLASSES.textDefault}`} style={{ color: COLOR_DARK_TEXT }}>{title}</h3>
      </div>
      <p className={`text-sm ${TAILWIND_CLASSES.textMuted}`}>{description}</p>
    </div>
  </AnimatedSection>
);

// Componente Cartão de Passo do Processo
const StepCard = ({ number, title, description, delay }) => (
  <AnimatedSection animation="fade-up" delay={delay}>
    <div className="bg-white p-6 rounded-xl shadow-lg border-t-4" style={{ borderColor: COLOR_ACCENT }}>
      <span className={`text-4xl font-extrabold mb-3 block ${TAILWIND_CLASSES.textHighlight}`} style={{ color: COLOR_ACCENT }}>{number}</span>
      <h3 className={`text-xl font-bold mb-2 ${TAILWIND_CLASSES.textDefault}`} style={{ color: COLOR_DARK_TEXT }}>{title}</h3>
      <p className={`text-sm ${TAILWIND_CLASSES.textMuted}`}>{description}</p>
    </div>
  </AnimatedSection>
);

// Componente Visual Grande para a Secção Hero
const HeroVisual = () => (
  <AnimatedSection animation="slide-left" delay={500} threshold={0.1}>
    <div
      className="hidden lg:flex justify-center items-center p-12 rounded-3xl h-full shadow-2xl"
      style={{ backgroundColor: COLOR_SECONDARY_BG }}
    >
      {/* Ícone de fatura gigante */}
      <InvoiceIcon sizeClass="w-48 h-48" />
    </div>
  </AnimatedSection>
);


// Componente Simulação de Vídeo
const VideoSection = () => (
  // ESTILO FIXO: Fundo Primário (Azul Escuro)
  <section className="py-16 md:py-24 text-white" style={{ backgroundColor: COLOR_PRIMARY }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <AnimatedSection animation="fade-up" threshold={0.1}>
        <h2 className={`text-3xl font-extrabold mb-4 text-white`}>
          Veja o FaturaJá em Ação
        </h2>
        <p className={`text-lg mb-10 max-w-2xl mx-auto location1`} style={{ color: '#f2f2f2' }}>
          Uma breve apresentação do sistema e da nossa missão para simplificar a sua faturação.
        </p>
      </AnimatedSection>

      <AnimatedSection animation="fade-in" delay={300} threshold={0.1}>
        <div
          className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl aspect-video"
          style={{ border: `4px solid ${COLOR_ACCENT}`, backgroundColor: '#000000' }}
        >
          <video
            width="100%"
            height="100%"
            controls
            preload="metadata"
            className="w-full h-full object-cover rounded-xl shadow-lg"
            src="/video/lv_0_20251103165718.mp4" type="video/mp4" controls
          >
          </video>

        </div>
      </AnimatedSection>
    </div>
  </section>
);


// Componente Acordeão FAQ
const FAQItem = ({ question, answer, index }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AnimatedSection animation="fade-up" delay={index * 100}>
      <div className="border-b border-gray-200">
        <button
          className={`flex justify-between items-center w-full py-4 text-left font-semibold transition-colors duration-200 ${TAILWIND_CLASSES.textDefault} hover:text-orange-500`}
          style={{ color: COLOR_DARK_TEXT }}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          {question}
          <span className="text-2xl">{isOpen ? '−' : '+'}</span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 py-3' : 'max-h-0 opacity-0'}`}
        >
          <p className={TAILWIND_CLASSES.textMuted}>{answer}</p>
        </div>
      </div>
    </AnimatedSection>
  );
};

// Componente Cartão do Plano de Preços
const PricingCard = ({ plan, index }) => {

  // Novo estilo de botão: Branco -> Azul no hover, com shadow e arredondado.
  const buttonStyle = {
    backgroundColor: 'white',
    color: COLOR_PRIMARY,
    borderRadius: '30px',
    border: `1px solid ${COLOR_PRIMARY}`,
    transition: 'all 0.3s ease',
  };

  const buttonHoverStyle = {
    backgroundColor: COLOR_PRIMARY,
    color: 'white',
    transform: 'scale(1.05)'
  };

  // Novo estilo de cartão: Elevação no hover
  const cardBaseClasses = `flex flex-col p-6 mx-auto max-w-lg text-center bg-white rounded-xl  border-2 border-gray-100 h-full transition duration-300 ease-in-out`;
  const cardHoverClasses = `hover:shadow-2xl hover:scale-[1.03]`;

  return (
    <AnimatedSection animation="fade-up" delay={index * 100} threshold={0.2}>
      <div className={`${cardBaseClasses} ${cardHoverClasses}`}>
        <h3 className={`mb-4 text-2xl font-semibold ${TAILWIND_CLASSES.textDefault}`} style={{ color: COLOR_DARK_TEXT }}>
          {plan.name}
        </h3>

        <div className="flex justify-center items-baseline my-4">
          <span className={`text-5xl font-extrabold ${TAILWIND_CLASSES.textDefault}`} style={{ color: COLOR_DARK_TEXT }}>{plan.price}</span>
          <span className={`text-xl font-medium ${TAILWIND_CLASSES.textMuted}`}>{plan.interval}</span>
        </div>

        <ul className="space-y-3 text-left mb-8 flex-grow">
          {plan.features.map((feature, idx) => (
            <li key={idx} className={`flex items-start ${TAILWIND_CLASSES.textMuted}`}>
              <CheckIcon color={COLOR_PRIMARY} />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Botão Link moderno com login dinâmico */}
        <Link
          href={getLoginLink(plan.name)}
          className={TAILWIND_CLASSES.buttonPrimary + " mt-auto cursor-pointer inline-block text-center"}
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
const getLoginLink = (planName: string) => {
  switch (planName) {
    case "Grátis":
      return "/cadastro";
    case "Essencial":
    case "Pro":
      return "/cadastro";
    case "Premium":
    case "Empresa":
      return "/cadastro";
    default:
      return "/cadastro"; // fallback seguro
  }
};

// =========================================================================
// 3. DADOS
// =========================================================================
const allFeaturesData = [
  { title: "Emissão de Faturas", description: "Crie faturas, notas de crédito e recibos rapidamente, associe clientes, produtos e impostos, e envie por email.", icon: () => <CheckIcon color={COLOR_ACCENT} /> },
  { title: "Gestão de Clientes", description: "Cadastre e administre os seus clientes, consulte o histórico de faturas e contactos de forma organizada e segura.", icon: () => <CheckIcon color={COLOR_ACCENT} /> },
  { title: "Controle de Produtos", description: "Gerencie produtos e serviços, preços e stock em tempo real, directamente ligados às faturas.", icon: () => <CheckIcon color={COLOR_ACCENT} /> },
  { title: "Relatórios Financeiros", description: "Visualize relatórios detalhados sobre vendas, faturamento e desempenho financeiro da sua empresa.", icon: () => <CheckIcon color={COLOR_ACCENT} /> },
  { title: "Gestão de Utilizadores", description: "Adicione membros da equipa com permissões diferentes, garantindo controlo e colaboração eficiente.", icon: () => <CheckIcon color={COLOR_ACCENT} /> },
  { title: "Integração com Pagamentos", description: "Aceite pagamentos por transferência bancária, cartão de débito/crédito ou Multicaixa, e acompanhe o estado das faturas (pendente, pago, cancelado).", icon: () => <CheckIcon color={COLOR_ACCENT} /> },
];

const processSteps = [
  { number: 1, title: "Registo Rápido", description: "Comece em minutos! Crie sua conta sem papelada e esteja pronto para faturar hoje mesmo." },
  { number: 2, title: "Personalização", description: "Sua empresa, do seu jeito! Personalize dados fiscais, logótipo e templates de faturas em segundos." },
  { number: 3, title: "Fature Já", description: "Fature em um clique! Crie e envie sua primeira fatura sem complicações.                         " },
];

const faqData = [
  { q: "O que torna o Fatura Já diferente de outras plataformas?", a: "O FacturaJá foca-se na simplicidade e rapidez. Pode criar uma fatura profissional em menos de 60 segundos, com ênfase na conformidade legal angolana e num design limpo e moderno." },
  { q: "Posso cancelar o meu plano a qualquer momento?", a: "Sim, todos os planos podem ser cancelados a qualquer momento, sem taxas de rescisão. Caso cancele, mantém o acesso até ao final do ciclo de faturação." },
  { q: "Como é que a segurança dos meus dados é garantida?", a: "Utilizamos encriptação SSL de 256 bits para todas as comunicações, e os seus dados são armazenados em servidores seguros, cumprindo a legislação angolana de protecção de dados pessoais. A privacidade é a nossa prioridade." },
  { q: "O Fatura Já é compatível com telemóveis?", a: "Absolutamente! A plataforma é 100% responsiva, funcionando perfeitamente em dispositivos móveis, tablets e desktops." },
  { q: "Posso adicionar vários utilizadores à minha conta?", a: "Sim, dependendo do plano, pode adicionar vários utilizadores com diferentes permissões para gerir clientes, produtos e faturas de forma colaborativa." },
  { q: "Quais métodos de pagamento estão disponíveis para os clientes finais??", a: "Pode aceitar pagamentos por transferência bancária, Multicaixa ou cartões de débito/crédito, e acompanhar o estado das faturas (pendente, pago, cancelado)." },
  { q: "Posso gerar relatórios das minhas vendas e faturamento?", a: "Sim, os planos Essencial, Pro, Premium e Empresa permitem gerar relatórios detalhados de faturamento e vendas, ajudando a monitorizar o desempenho financeiro da sua empresa." },
  { q: "As faturas cumprem a legislação fiscal angolana?", a: "Sim, todas as faturas emitidas pelo FacturaJá cumprem as normas da Autoridade Tributária Angolana, garantindo conformidade legal." },
];

// Moeda atualizada para Kwanza (KZ)
const pricingPlans = [
  {
    name: "Grátis",
    price: "0 KZ",
    interval: "/mês",
    isPopular: false,
    features: [
      "Até 5 faturas/mês",
      "1 utilizador",
      "Suporte comunitário",
      "Armazenamento de 100MB",
      "Design padrão",
      "Sem relatórios"
    ]
  },
  {
    name: "Essencial",
    price: "19.000 KZ",
    interval: "/mês",
    isPopular: true,
    features: [
      "Faturação ilimitada",
      "Até 3 utilizadores",
      "Suporte prioritário",
      "Armazenamento ilimitado",
      "Gestão de clientes avançada",
      "Relatórios detalhados (trimestrais)"
    ]
  },
  {
    name: "Pro",
    price: "39.000 KZ",
    interval: "/mês",
    isPopular: false,
    features: [
      "Tudo no Essencial",
      "Até 5 utilizadores",
      "API de integração",
      "Automação simples de pagamentos",
      "Monitorização de pagamentos",
      "Relatórios avançados (personalizáveis)"
    ]
  },
  {
    name: "Premium",
    price: "79.000 KZ",
    interval: "/mês",
    isPopular: false,
    features: [
      "Tudo no Pro",
      "Até 10 utilizadores",
      "Gestão multi-moeda",
      "Gestão de stocks",
      "Consultor dedicado",
      "Suporte 24/7"
    ]
  },
  {
    name: "Empresa",
    price: "149.000 KZ",
    interval: "/mês",
    isPopular: false,
    features: [
      "Tudo no Premium",
      "Utilizadores ilimitados",
      "Servidor dedicado",
      "Formação personalizada",
      "Onboarding VIP",
      "Conformidade internacional"
    ]
  }
];


// Mapeamento de links para a navegação
const navLinks = [
  { name: 'Funcionalidades', id: 'funcionalidades' },
  { name: 'Processo', id: 'processo' },
  { name: 'Planos', id: 'planos' },
  { name: 'FAQ', id: 'faq' },
  { name: 'Contacto', id: 'contacto' },
];

// =========================================================================
// 4. COMPONENTE PRINCIPAL APP
// =========================================================================

export default function App() {

  // Estado para controlar o menu mobile (hamburger)
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Simulação do Contact Form
  const [contactForm, setContactForm] = useState({ name: '', email: '', type: 'Cliente', message: '' });
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [contactMessage, setContactMessage] = useState({ type: '', text: '' });

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactMessage({ type: '', text: '' });
    setIsContactLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1500)); // Simula latência

    if (contactForm.message.length > 10) {
      setContactMessage({ type: 'success', text: 'Mensagem enviada com sucesso! Responderemos brevemente.' });
      setContactForm({ name: '', email: '', type: 'Cliente', message: '' });
    } else {
      setContactMessage({ type: 'error', text: 'Ocorreu um erro. Por favor, preencha a mensagem com mais detalhes.' });
    }
    setIsContactLoading(false);
  };

  // Função para navegação (âncoras)
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      // Ajuste para a altura do header fixo (64px)
      window.scrollTo({ top: element.offsetTop - 64, behavior: 'smooth' });
    }
    // Fechar o menu mobile após clicar no link
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen font-inter" style={{ backgroundColor: COLOR_LIGHT_BG }}>

      {/* INJEÇÃO DE FONTE INTER (Componente simulado) */}
      <Helmet />

      {/* ESTILOS CSS PARA O GRADIENTE ANIMADO (APENAS FOOTER) */}
      <style jsx global>{`
                /* Font Inter global */
                body {
                    font-family: 'Inter', sans-serif;
                    color:"white"
                }
                /* Classe de fundo com gradiente SUAVE e LENTO */
                .animated-gradient-section {
                    background: linear-gradient(
                        -30deg,
                        ${FOOTER_GRADIENT_START},
                        ${FOOTER_GRADIENT_END},
                        ${FOOTER_GRADIENT_MID},
                        ${FOOTER_GRADIENT_START}
                    );
                    background-size: 400% 400%; /* Permite o movimento grande */
                    animation: gradientShift 25s ease infinite; /* 30s para ser mais lento */
                }

                /* Keyframes para animação */
                @keyframes gradientShift {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%; /* Move o gradiente horizontalmente */
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                }
            `}</style>

      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">

          {/* Logotipo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => scrollToSection('topo')}>
            <InvoiceIcon />
            <h1 className={`text-2xl font-extrabold ${TAILWIND_CLASSES.textDefault}`} style={{ color: COLOR_DARK_TEXT }}>
              Fatura <span className={TAILWIND_CLASSES.textHighlight} style={{ color: COLOR_ACCENT }}>Já</span>
            </h1>
          </div>

          {/* Links de Navegação (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-4">
            {/* Links para as secções */}
            {navLinks.map(link => (
              <a
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className={`cursor-pointer text-sm font-medium ${TAILWIND_CLASSES.textMuted} hover:text-orange-500 transition duration-150`}
              >
                {link.name}
              </a>
            ))}

            {/* Botão de Cadastro - Usa a cor Primária */}
            <Link
              href="/login"
              className={TAILWIND_CLASSES.buttonPrimary + " py-2 px-4 text-sm ml-4"}
              style={{ backgroundColor: COLOR_PRIMARY, color: 'white' }}
            >
              Login
            </Link>
          </nav>

          {/* Menu Hamburger (Mobile e Tablet) */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ color: COLOR_PRIMARY, borderColor: COLOR_PRIMARY, outlineColor: COLOR_PRIMARY }}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              <MenuIcon />
            </button>
          </div>

        </div>

        {/* Dropdown do Menu Mobile (Aparece no clique) */}
        <div id="mobile-menu"
          className={`lg:hidden transition-all duration-300 ease-in-out overflow-hidden ${isMenuOpen ? 'max-h-96 opacity-100 py-2' : 'max-h-0 opacity-0'}`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map(link => (
              <a
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className={`block px-3 py-2 rounded-md text-base font-medium cursor-pointer ${TAILWIND_CLASSES.textDefault} hover:bg-gray-100 hover:text-orange-600`}
                style={{ color: COLOR_DARK_TEXT }}
              >
                {link.name}
              </a>
            ))}
            <a
              onClick={() => { console.log('Simulação de Navegação: Ir para /cadastro'); setIsMenuOpen(false); }}
              className={TAILWIND_CLASSES.buttonPrimary + " w-full text-center py-2 px-4 text-sm cursor-pointer mt-2 block"}
              style={{ backgroundColor: COLOR_PRIMARY, color: 'white' }}
            >
              Começar Grátis
            </a>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main>
        {/* 1. Secção Principal (Hero) - ID para Navegação */}
        <section id="topo" className="pt-20 pb-16 md:py-32" style={{ backgroundColor: COLOR_LIGHT_BG }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

              {/* Lado Esquerdo: Texto e Botões */}
              <div className="text-center lg:text-left">
                <AnimatedSection animation="fade-up" delay={0} threshold={0.1}>
                  {/* Texto ajustado para cor Azul Escuro (COLOR_PRIMARY) no fundo claro */}
                  <h2 className={`text-5xl md:text-6xl font-extrabold tracking-tight mb-4`} style={{ color: COLOR_PRIMARY }}>
                    Faturação Simples, <br className="sm:hidden" />
                    <span className={TAILWIND_CLASSES.textHighlight} style={{ color: COLOR_ACCENT }}>Poderosa</span> e Rápida.
                  </h2>
                </AnimatedSection>
                <AnimatedSection animation="fade-up" delay={200} threshold={0.1}>
                  <p className={`text-xl md:text-2xl mb-8 max-w-lg mx-auto lg:mx-0 ${TAILWIND_CLASSES.textMuted}`}>
                    Gere faturas profissionais em segundos, sem complicações.
                    A ferramenta ideal para pequenos negócios e freelancers.
                  </p>
                </AnimatedSection>
                <AnimatedSection animation="fade-up" delay={400} threshold={0.1}>
                  <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                    <a
                      href="/login"  // Link real para a página de login
                      className={TAILWIND_CLASSES.buttonPrimary + " cursor-pointer"}
                      style={{ backgroundColor: COLOR_PRIMARY, color: 'white' }}
                    >
                      Começar Agora (É Grátis)
                    </a>

                    <a
                      onClick={() => scrollToSection('planos')}
                      className={TAILWIND_CLASSES.buttonSecondary + " cursor-pointer bg-transparent border-gray-400 text-gray-700 hover:bg-gray-100 hover:text-gray-900"}
                    >
                      Ver Planos
                    </a>
                  </div>
                </AnimatedSection>
              </div>

              {/* Lado Direito: Visual de Ícone Grande */}
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* 1.5 Secção de Vídeo */}
        <VideoSection />

        {/* 2. Secção de Funcionalidades (Ferramentas Essenciais) - ID para Navegação */}
        <section id="funcionalidades" className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection animation="fade-up" threshold={0.1}>
              <h1 className={`text-4xl font-extrabold text-center mb-12 ${TAILWIND_CLASSES.textDefault}`} style={{ color: COLOR_DARK_TEXT }}>
                Ferramentas Essenciais para o seu Negócio
              </h1>
              {/* Subtítulo */}
              <p className="text-center text-[#1f2937] mb-12 text-lg">
                Tudo o que precisa para começar a faturar de forma simples, segura e eficiente.
              </p>
            </AnimatedSection>

            {/* Grid de 8 Funcionalidades */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {allFeaturesData.map((feature, index) => (
                <FeatureCard
                  key={index}
                  Icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  delay={index * 100}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 3. Secção Processo (Fácil de Usar) - ID para Navegação */}
        <section id="processo" className="py-16 md:py-24" style={{ backgroundColor: COLOR_SECONDARY_BG }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection animation="fade-up" threshold={0.1}>
              <h2 className={`text-3xl font-extrabold text-center mb-12 ${TAILWIND_CLASSES.textDefault}`} style={{ color: COLOR_DARK_TEXT }}>
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
                  className="h-full"
                />
              ))}
            </div>

          </div>
        </section>

        {/* 4. Secção de Planos de Pagamento - ID para Navegação */}
        <section id="planos" className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection animation="fade-up" threshold={0.1}>
              <h2 className={`text-3xl font-extrabold text-center mb-12 ${TAILWIND_CLASSES.textDefault}`} style={{ color: COLOR_DARK_TEXT }}>
                Escolha o Plano Certo para Si
              </h2>
            </AnimatedSection>

            {/* Grid de Planos - Com hover effect de elevação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
              {pricingPlans.map((plan, index) => (
                <PricingCard key={index} plan={plan} index={index} />
              ))}
            </div>
            <AnimatedSection animation="fade-in" delay={500}>
              <p className={`text-center mt-12 text-sm ${TAILWIND_CLASSES.textMuted}`}>
                Preços apresentados sem IVA. Experimente o plano Grátis sem compromisso.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* 5. Secção FAQ - ID para Navegação */}
        <section id="faq" className="py-16 md:py-24" style={{ backgroundColor: COLOR_LIGHT_BG }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection animation="fade-up" threshold={0.1}>
              <h2 className={`text-3xl font-extrabold text-center mb-10 ${TAILWIND_CLASSES.textDefault}`} style={{ color: COLOR_DARK_TEXT }}>
                Perguntas Frequentes
              </h2>
            </AnimatedSection>
            <div className="space-y-4">
              {faqData.map((item, index) => (
                <FAQItem key={index} question={item.q} answer={item.a} index={index} />
              ))}
            </div>
          </div>
        </section>
        <EmpresasSection />

        {/* 6. Secção Contacto (Deixe Sua Mensagem) - ID para Navegação */}
        <section id="contacto" className="py-16 md:py-24 bg-white">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection animation="fade-up" threshold={0.1}>
              <h2 className={`text-3xl font-extrabold text-center mb-10 ${TAILWIND_CLASSES.textDefault}`} style={{ color: COLOR_DARK_TEXT }}>
                Deixe Seu <span className={TAILWIND_CLASSES.textHighlight} style={{ color: COLOR_ACCENT }}>Comentário</span>
              </h2>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={200} threshold={0.1}>
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                {contactMessage.text && (
                  <div className={`p-4 mb-4 rounded-lg text-sm font-medium ${contactMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {contactMessage.text}
                  </div>
                )}

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  {/* Nome */}
                  <div>
                    <label htmlFor="contact-name" className={`block text-sm font-medium mb-1 ${TAILWIND_CLASSES.textDefault}`} style={{ color: COLOR_DARK_TEXT }}>Nome</label>
                    <input
                      type="text"
                      id="contact-name"
                      name="name"
                      value={contactForm.name}
                      onChange={handleContactChange}
                      required
                      className={`w-full border rounded-lg p-3 outline-none transition duration-150 ${TAILWIND_CLASSES.inputFocus}`}
                      disabled={isContactLoading}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="contact-email" className={`block text-sm font-medium mb-1 ${TAILWIND_CLASSES.textDefault}`} style={{ color: COLOR_DARK_TEXT }}>Email</label>
                    <input
                      type="email"
                      id="contact-email"
                      name="email"
                      value={contactForm.email}
                      onChange={handleContactChange}
                      required
                      className={`w-full border rounded-lg p-3 outline-none transition duration-150 ${TAILWIND_CLASSES.inputFocus}`}
                      disabled={isContactLoading}
                    />
                  </div>

                  {/* Mensagem */}
                  <div>
                    <label htmlFor="contact-message" className={`block text-sm font-medium mb-1 ${TAILWIND_CLASSES.textDefault}`} style={{ color: COLOR_DARK_TEXT }}>Mensagem</label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows="4"
                      value={contactForm.message}
                      onChange={handleContactChange}
                      required
                      className={`w-full border rounded-lg p-3 outline-none transition duration-150 ${TAILWIND_CLASSES.inputFocus}`}
                      disabled={isContactLoading}
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className={TAILWIND_CLASSES.buttonPrimary + " w-full rounded-lg"}
                    style={{ backgroundColor: COLOR_PRIMARY, color: 'white' }}
                    disabled={isContactLoading}
                  >
                    {isContactLoading ? 'A Enviar...' : 'Enviar Mensagem'}
                  </button>
                </form>
              </div>
            </AnimatedSection>
          </div>
        </section>

      </main>

      {/* Rodapé (Footer) - AGORA COM text-white TAILWIND CLASS + CLASSES EXPLÍCITAS NAS LISTAS */}
      {/* Rodapé (Footer) - AGORA COM TODOS OS <p> BRANCOS */}
      <AnimatedSection animation="fade-in" delay={200} threshold={0.5}>
        <footer
          className={`py-10 shadow-inner transition-colors duration-1000 animated-gradient-section text-white [&_p]:text-white`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-b border-opacity-30 pb-8 mb-8" style={{ borderColor: FOOTER_ACCENT_COLOR }}>

              {/* Coluna 1: Info (Logo, Descrição, Contacto, Localização) */}
              <div className="col-span-2 md:col-span-1">
                <h4 className="text-2xl font-extrabold mb-4" style={{ color: FOOTER_TEXT_COLOR }}>
                  Fatura<span style={{ color: FOOTER_ACCENT_COLOR }}>Já</span>
                </h4>
                <p className="mb-4" style={{ color: '#f2f2f2' }} >
                  A sua solução definitiva para gestão e faturação simplificada. Rápido, seguro e compatível com as normas fiscais.
                </p>
                <p className="space-y-1 text-orange-500">
                  <span className="block location" style={{ color: '#f9941f' }}>Luanda, Angola</span>
                  <a
                    href="mailto:geral@sdoca.it.ao"
                    className="block font-semibold location hover:underline"
                    style={{ color: '#f9941f' }}
                  >
                    geral@sdoca.it.ao
                  </a>
                  <span className="block font-semibold location" style={{ color: '#f9941f' }}>
                    +244 923678529 <br /> +244 927800505
                  </span>
                </p>

              </div>

              {/* Coluna 2: Navegação */}
              <div>
                <h4 className={`text-lg font-semibold mb-4 text-white/70`} style={{ color: FOOTER_ACCENT_COLOR }}>Navegação</h4>
                <ul className="space-y-2 text-sm">
                  {navLinks.map(link => (
                    <li key={link.id}>
                      <a
                        onClick={() => scrollToSection(link.id)}
                        className={` hover:text-white cursor-pointer transition`}
                        style={{ color: '#f2f2f2' }}
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Coluna 3: Apoio e Legal */}
              <div>
                <h4 className={`text-lg font-semibold mb-4 text-white/70`} style={{ color: FOOTER_ACCENT_COLOR }}>Apoio e Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a
                      onClick={() => scrollToSection("faq")}
                      className="flex items-center gap-2 cursor-pointer transition hover:text-white"
                      style={{ color: "#f2f2f2" }}
                    >
                      <HelpCircle size={18} />
                      FAQ
                    </a>
                  </li>

                  <li>
                    <a
                      onClick={() => console.log("Link para Suporte Técnico")}
                      className="flex items-center gap-2 cursor-pointer transition hover:text-white"
                      style={{ color: "#f2f2f2" }}
                    >
                      <Headset size={18} />
                      Suporte Técnico
                    </a>
                  </li>

                  <li>
                    <a
                      onClick={() => console.log("Link para Termos")}
                      className="flex items-center gap-2 cursor-pointer transition hover:text-white"
                      style={{ color: "#f2f2f2" }}
                    >
                      <FileText size={18} />
                      Termos de Serviço
                    </a>
                  </li>

                  <li>
                    <a
                      onClick={() => console.log("Link para Política")}
                      className="flex items-center gap-2 cursor-pointer transition hover:text-white"
                      style={{ color: "#f2f2f2" }}
                    >
                      <ShieldCheck size={18} />
                      Política de Privacidade
                    </a>
                  </li>

                  <li>
                    <a
                      onClick={() => console.log("Link para Livro de Reclamações")}
                      className="flex items-center gap-2 cursor-pointer transition hover:text-white"
                      style={{ color: "#f2f2f2" }}
                    >
                      <BookOpenCheck size={18} />
                      Livro de Reclamações
                    </a>
                  </li>

                </ul>
              </div>

              {/* Coluna 4: Siga-nos (Social Media) */}
              <div>
                <h4 className={`text-lg font-semibold mb-4 text-white/70`} style={{ color: FOOTER_ACCENT_COLOR }}>Siga-nos</h4>
                <div className="flex space-x-2">
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full transition-all duration-300 hover:bg-[#F9941F]/10"
                  >
                    <Facebook size={22} color="#f2f2f2" className="hover:scale-110 transition-transform" />
                  </a>

                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full transition-all duration-300 hover:bg-[#F9941F]/10"
                  >
                    <Instagram size={22} color="#f2f2f2" className="hover:scale-110 transition-transform" />
                  </a>

                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full transition-all duration-300 hover:bg-[#F9941F]/10"
                  >
                    <Linkedin size={22} color="#f2f2f2" className="hover:scale-110 transition-transform" />
                  </a>
                </div>
              </div>

            </div>

            {/* Direitos de Autor */}
            <div className="text-center text-sm text-white/70">
              &copy; 2025 FaturaJá. Todos os direitos reservados. | Desenvolvido em Angola por SDOCA.
            </div>
          </div>
        </footer>
      </AnimatedSection>

    </div>
  );
}

// Componente simulado para injetar estilos no head
function Helmet() {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.textContent = `body { font-family: 'Inter', sans-serif; }`;
    document.head.appendChild(style);

    return () => {
      // Limpar se o componente fosse destruído
      document.head.removeChild(link);
      document.head.removeChild(style);
    }
  }, []);
  return null;
}
