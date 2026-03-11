'use client';

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";
import { useThemeColors } from "@/context/ThemeContext";
import { AxiosError } from "axios";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  UserPlus
} from "lucide-react";

/* ---------------- TYPES ---------------- */
interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  danger: string;
}

interface InputFieldProps {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ElementType;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  colors: ThemeColors;
}


/* ---------------- ANIMATION VARIANTS ---------------- */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const logoVariants: Variants = {
  initial: { scale: 0.8, rotateY: -180 },
  animate: {
    scale: 1,
    rotateY: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      duration: 0.8,
    }
  },
  hover: {
    rotateX: 10,
    rotateY: -10,
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 12,
    },
  },
};

const errorVariants: Variants = {
  initial: { opacity: 0, height: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    height: "auto",
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    }
  },
  exit: {
    opacity: 0,
    height: 0,
    scale: 0.9,
    transition: {
      duration: 0.2,
    }
  },
};

const buttonVariants: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
  loading: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const floatingShapeVariants: Variants = {
  animate: {
    y: [-20, 20, -20],
    rotate: [0, 180, 360],
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

/* ---------------- COMPONENTS ---------------- */
const InputField: React.FC<InputFieldProps> = ({
  type,
  placeholder,
  value,
  onChange,
  icon: Icon,
  showPasswordToggle = false,
  onTogglePassword,
  colors,
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);

  return (
    <motion.div
      className="relative w-full"
      variants={itemVariants}
    >
      <motion.div
        className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-colors duration-300`}
        style={{ color: isFocused ? colors.secondary : colors.textSecondary }}
        animate={{
          scale: isFocused ? 1.1 : 1,
          rotate: isFocused ? [0, -10, 10, 0] : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        <Icon size={20} />
      </motion.div>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required
        className={`w-full pl-10 pr-${showPasswordToggle ? '12' : '4'} py-3 rounded-xl border-2 backdrop-blur-sm
          transition-all duration-300 outline-none
        `}
        style={{
          backgroundColor: isFocused ? colors.card : `${colors.card}80`,
          borderColor: isFocused ? colors.secondary : colors.border,
          color: colors.text,
          boxShadow: isFocused ? `0 10px 15px -3px ${colors.secondary}20` : 'none',
        }}
      />

      {showPasswordToggle && onTogglePassword && (
        <motion.button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: colors.textSecondary }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {type === "password" ? <EyeOff size={20} /> : <Eye size={20} />}
        </motion.button>
      )}
    </motion.div>
  );
};

const FloatingShape: React.FC<{ className: string; delay?: number; colors: ThemeColors; style?: React.CSSProperties }> = ({
  className,
  delay = 0,
  style
}) => (
  <motion.div
    className={`absolute rounded-full opacity-10 pointer-events-none ${className}`}
    variants={floatingShapeVariants}
    animate="animate"
    style={{ animationDelay: `${delay}s`, ...style }}
  />
);

/* ---------------- MAIN PAGE ---------------- */
export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const colors = useThemeColors();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Limpa erro quando usuário digita
  useEffect(() => {
    if (error) setError("");
  }, [email, password, error]);

  // Redirecionamento após login
  useEffect(() => {
    if (!user) return;

    const redirectMap: Record<string, string> = {
      admin: "/dashboard",
      caixa: "/dashboard/Vendas/Nova_venda",
      operador: "/dashboard/Vendas/Nova_venda",
    };

    const destination = redirectMap[user.role] || "/login";

    // Pequeno delay para mostrar animação de sucesso
    const timer = setTimeout(() => {
      router.push(destination);
    }, 500);

    return () => clearTimeout(timer);
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      let errorMessage = "Ocorreu um erro desconhecido";

      if (err instanceof AxiosError) {
        errorMessage = err.response?.data?.message ?? err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || authLoading;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: colors.background }}>
      {/* Background Decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingShape className="w-96 h-96 -top-20 -left-20 blur-3xl" delay={0} colors={colors}
          style={{ backgroundColor: colors.primary }} />
        <FloatingShape className="w-80 h-80 -bottom-20 -right-20 blur-3xl" delay={5} colors={colors}
          style={{ backgroundColor: colors.secondary }} />
        <FloatingShape className="w-64 h-64 top-1/2 left-1/4 blur-2xl" delay={10} colors={colors}
          style={{ backgroundColor: colors.primary }} />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(${colors.primary} 1px, transparent 1px), linear-gradient(90deg, ${colors.primary} 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <motion.div
        className="relative w-full max-w-md z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Card Principal */}
        <motion.div
          className="backdrop-blur-xl rounded-3xl shadow-2xl border p-8 overflow-hidden relative"
          style={{
            backgroundColor: `${colors.card}CC`, // CC = 80% opacity
            borderColor: colors.border,
          }}
          variants={itemVariants}
          whileHover={{
            boxShadow: `0 25px 50px -12px ${colors.primary}40`,
          }}
        >
          {/* Shine Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
            initial={{ x: "-200%" }}
            animate={{ x: "200%" }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 5,
              ease: "easeInOut",
            }}
          />

          {/* LOGO */}
          <motion.div
            className="flex justify-center mb-6"
            variants={logoVariants}
            initial="initial"
            animate="animate"
            whileHover="hover"
            style={{ perspective: 1000 }}
          >
            <motion.div
              className="relative"
              whileHover={{ rotateY: 360 }}
              transition={{ duration: 0.8 }}
            >
              <Image
                src="/images/3.png"
                alt="Logo do Sistema"
                width={80}
                height={80}
                className="rounded-2xl cursor-pointer shadow-lg"
                priority
              />
              <motion.div
                className="absolute inset-0 rounded-2xl blur-xl -z-10"
                style={{ backgroundColor: `${colors.secondary}40` }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          </motion.div>

          {/* Título */}
          <motion.div className="text-center mb-6" variants={itemVariants}>
            <h2 className="text-3xl font-bold mb-2" style={{ color: colors.primary }}>
              Bem-vindo
            </h2>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Faça login para acessar o sistema
            </p>
          </motion.div>

          {/* Erro */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                variants={errorVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="mb-4 overflow-hidden"
              >
                <div className="border-l-4 p-4 rounded-r-xl flex items-center gap-3 shadow-sm"
                  style={{
                    backgroundColor: `${colors.danger}20`,
                    borderColor: colors.danger,
                    color: colors.danger
                  }}>
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <InputField
              type="email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              colors={colors}
            />

            <InputField
              type={showPassword ? "text" : "password"}
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              showPasswordToggle
              onTogglePassword={() => setShowPassword(!showPassword)}
              colors={colors}
            />

            {/* Esqueci senha */}
            <motion.div
              className="flex justify-end"
              variants={itemVariants}
            >
              <Link
                href="/forgot-password"
                className="text-xs font-medium transition-colors"
                style={{ color: colors.primary }}
              >
                Esqueceu a senha?
              </Link>
            </motion.div>

            {/* Botão Submit */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className={`
                w-full py-3.5 mt-2 rounded-xl font-semibold text-white
                flex items-center justify-center gap-2
                transition-all duration-300 relative overflow-hidden
              `}
              style={{
                backgroundColor: isLoading ? `${colors.primary}B3` : colors.primary,
              }}
              variants={buttonVariants}
              initial="idle"
              whileHover={isLoading ? undefined : "hover"}
              whileTap={isLoading ? undefined : "tap"}
              animate={isLoading ? "loading" : "idle"}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <ArrowRight size={20} />
                  </motion.div>
                </>
              )}

              {/* Ripple Effect */}
              {!isLoading && (
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ scale: 0, opacity: 0 }}
                  whileTap={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <motion.div
            className="relative my-6"
            variants={itemVariants}
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: colors.border }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4" style={{ backgroundColor: colors.card, color: colors.textSecondary }}>
                ou
              </span>
            </div>
          </motion.div>

          {/* Link Cadastro */}
          <motion.div
            className="text-center"
            variants={itemVariants}
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 transition-colors font-medium"
              style={{ color: colors.primary }}
            >
              <UserPlus size={18} />
              <span>Não tem conta? Cadastre-se</span>
              <motion.span
                className="inline-block"
                animate={{ x: [0, 4, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center text-xs mt-6"
          style={{ color: colors.textSecondary }}
          variants={itemVariants}
        >
          © {new Date().getFullYear()} Sistema. Todos os direitos reservados.
        </motion.p>
      </motion.div>
    </div>
  );
}