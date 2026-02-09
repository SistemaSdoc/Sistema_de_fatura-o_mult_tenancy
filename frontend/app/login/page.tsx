'use client';

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";
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
interface InputFieldProps {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ElementType;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
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
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);

  return (
    <motion.div
      className="relative w-full"
      variants={itemVariants}
    >
      <motion.div
        className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-colors duration-300 ${isFocused ? "text-[#F9941F]" : "text-gray-400"
          }`}
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
        className={`w-full pl-10 pr-${showPasswordToggle ? '12' : '4'} py-3 rounded-xl border-2 bg-white/50 backdrop-blur-sm
          transition-all duration-300 outline-none
          ${isFocused
            ? "border-[#F9941F] shadow-lg shadow-[#F9941F]/20 bg-white"
            : "border-gray-200 hover:border-gray-300"
          }
          placeholder:text-gray-400 text-gray-800
        `}
      />

      {showPasswordToggle && onTogglePassword && (
        <motion.button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#123859] transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {type === "password" ? <EyeOff size={20} /> : <Eye size={20} />}
        </motion.button>
      )}
    </motion.div>
  );
};

const FloatingShape: React.FC<{ className: string; delay?: number }> = ({
  className,
  delay = 0
}) => (
  <motion.div
    className={`absolute rounded-full opacity-10 pointer-events-none ${className}`}
    variants={floatingShapeVariants}
    animate="animate"
    style={{ animationDelay: `${delay}s` }}
  />
);

/* ---------------- MAIN PAGE ---------------- */
export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Limpa erro quando usuário digita
  useEffect(() => {
    if (error) setError("");
  }, [email, password]);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200">
      {/* Background Decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingShape className="w-96 h-96 bg-[#123859] -top-20 -left-20 blur-3xl" delay={0} />
        <FloatingShape className="w-80 h-80 bg-[#F9941F] -bottom-20 -right-20 blur-3xl" delay={5} />
        <FloatingShape className="w-64 h-64 bg-[#123859] top-1/2 left-1/4 blur-2xl" delay={10} />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#123859 1px, transparent 1px), linear-gradient(90deg, #123859 1px, transparent 1px)`,
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
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 overflow-hidden relative"
          variants={itemVariants}
          whileHover={{
            boxShadow: "0 25px 50px -12px rgba(18, 56, 89, 0.25)",
          }}
        >
          {/* Shine Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
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
                className="absolute inset-0 rounded-2xl bg-[#F9941F]/20 blur-xl -z-10"
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
            <h2 className="text-3xl font-bold text-[#123859] mb-2">
              Bem-vindo
            </h2>
            <p className="text-gray-500 text-sm">
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
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-xl flex items-center gap-3 shadow-sm">
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
            />

            <InputField
              type={showPassword ? "text" : "password"}
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              showPasswordToggle
              onTogglePassword={() => setShowPassword(!showPassword)}
            />

            {/* Esqueci senha */}
            <motion.div
              className="flex justify-end"
              variants={itemVariants}
            >
              <Link
                href="/forgot-password"
                className="text-xs text-[#123859] hover:text-[#F9941F] transition-colors font-medium"
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
                ${isLoading
                  ? "bg-[#123859]/70 cursor-not-allowed"
                  : "bg-[#123859] hover:bg-[#0f2b4c] hover:shadow-lg hover:shadow-[#123859]/30"
                }
              `}
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
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">ou</span>
            </div>
          </motion.div>

          {/* Link Cadastro */}
          <motion.div
            className="text-center"
            variants={itemVariants}
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 text-[#123859] hover:text-[#F9941F] transition-colors font-medium"
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
          className="text-center text-gray-400 text-xs mt-6"
          variants={itemVariants}
        >
          © {new Date().getFullYear()} Sistema. Todos os direitos reservados.
        </motion.p>
      </motion.div>
    </div>
  );
}