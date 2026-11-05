export interface RegistrationFormData {
  nome: string;
  nif: string;
  email: string;
  telefone: string;
  endereco: string;
  regime_fiscal: "simplificado" | "geral";
  sujeito_iva: boolean;
  is_seguradora: boolean;
  nome_banco?: string | null;
  numero_conta?: string | null;
  iban?: string | null;
  logo: string;
  subdomain: string;
  modo: "colectivo" | "singular";
  admin_name: string;
  admin_email: string;
  admin_password: string;
}

export interface RegistrationPaymentData {
  metodo: string;
  parcelas: number;
  data_vencimento: string;
}

export interface RegistrationPlan {
  id: string;
  nome: string;
  valor_mensal: number | string;
  features?: { nome: string }[];
}
