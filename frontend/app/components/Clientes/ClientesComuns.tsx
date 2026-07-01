export interface ThemeColors {
    text: string; textSecondary: string; background: string;
    card: string; border: string; primary: string; secondary: string;
    success: string; warning: string; danger: string; error: string;
    hover: string; fp: string;
}

export const CODIGOS_PAIS = [
  // ─── PALOP ──────────────────────────────
  { codigo: "+244", pais: "Angola", bandeira: "🇦🇴", iso: "AO" },
  { codigo: "+351", pais: "Portugal", bandeira: "🇵🇹", iso: "PT" },
  { codigo: "+55", pais: "Brasil", bandeira: "🇧🇷", iso: "BR" },
  { codigo: "+258", pais: "Moçambique", bandeira: "🇲🇿", iso: "MZ" },
  { codigo: "+238", pais: "Cabo Verde", bandeira: "🇨🇻", iso: "CV" },
  { codigo: "+245", pais: "Guiné-Bissau", bandeira: "🇬🇼", iso: "GW" },
  { codigo: "+239", pais: "S. Tomé e Príncipe", bandeira: "🇸🇹", iso: "ST" },

  // ─── Outros países lusófonos ────────────
  { codigo: "+670", pais: "Timor-Leste", bandeira: "🇹🇱", iso: "TL" },
  { codigo: "+240", pais: "Guiné Equatorial", bandeira: "🇬🇶", iso: "GQ" }, // espanhol, mas parceiro na CPLP
  { codigo: "+853", pais: "Macau", bandeira: "🇲🇴", iso: "MO" }, // região administrativa especial da China (português oficial)

  // ─── África Austral ──────────────────────
  { codigo: "+27", pais: "África do Sul", bandeira: "🇿🇦", iso: "ZA" },
  { codigo: "+264", pais: "Namíbia", bandeira: "🇳🇦", iso: "NA" },
  { codigo: "+260", pais: "Zâmbia", bandeira: "🇿🇲", iso: "ZM" },
  { codigo: "+263", pais: "Zimbabué", bandeira: "🇿🇼", iso: "ZW" },
  { codigo: "+243", pais: "R.D. Congo", bandeira: "🇨🇩", iso: "CD" },
  { codigo: "+267", pais: "Botswana", bandeira: "🇧🇼", iso: "BW" },

  // ─── África Ocidental ────────────────────
  { codigo: "+234", pais: "Nigéria", bandeira: "🇳🇬", iso: "NG" },
  { codigo: "+233", pais: "Gana", bandeira: "🇬🇭", iso: "GH" },

  // ─── Europa ──────────────────────────────
  { codigo: "+44", pais: "Reino Unido", bandeira: "🇬🇧", iso: "GB" },
  { codigo: "+33", pais: "França", bandeira: "🇫🇷", iso: "FR" },
  { codigo: "+49", pais: "Alemanha", bandeira: "🇩🇪", iso: "DE" },
  { codigo: "+34", pais: "Espanha", bandeira: "🇪🇸", iso: "ES" },
  { codigo: "+39", pais: "Itália", bandeira: "🇮🇹", iso: "IT" },
  { codigo: "+31", pais: "Países Baixos", bandeira: "🇳🇱", iso: "NL" },
  { codigo: "+32", pais: "Bélgica", bandeira: "🇧🇪", iso: "BE" },
  { codigo: "+41", pais: "Suíça", bandeira: "🇨🇭", iso: "CH" },

  // ─── Américas ─────────────────────────────
  { codigo: "+1", pais: "EUA/Canadá", bandeira: "🇺🇸", iso: "US" }, // +1 também Canadá, mas mantemos EUA
  { codigo: "+1", pais: "Canadá", bandeira: "🇨🇦", iso: "CA" }, // mesmo código, mas com iso diferente
  { codigo: "+52", pais: "México", bandeira: "🇲🇽", iso: "MX" },
  { codigo: "+54", pais: "Argentina", bandeira: "🇦🇷", iso: "AR" },
  { codigo: "+56", pais: "Chile", bandeira: "🇨🇱", iso: "CL" },
  { codigo: "+57", pais: "Colômbia", bandeira: "🇨🇴", iso: "CO" },
  { codigo: "+58", pais: "Venezuela", bandeira: "🇻🇪", iso: "VE" },

  // ─── Ásia ──────────────────────────────────
  { codigo: "+86", pais: "China", bandeira: "🇨🇳", iso: "CN" },
  { codigo: "+91", pais: "Índia", bandeira: "🇮🇳", iso: "IN" },
  { codigo: "+81", pais: "Japão", bandeira: "🇯🇵", iso: "JP" },
  { codigo: "+82", pais: "Coreia do Sul", bandeira: "🇰🇷", iso: "KR" },
  { codigo: "+65", pais: "Singapura", bandeira: "🇸🇬", iso: "SG" },
  { codigo: "+60", pais: "Malásia", bandeira: "🇲🇾", iso: "MY" },
  { codigo: "+62", pais: "Indonésia", bandeira: "🇮🇩", iso: "ID" },
  { codigo: "+971", pais: "Emirados Árabes", bandeira: "🇦🇪", iso: "AE" },
  { codigo: "+966", pais: "Arábia Saudita", bandeira: "🇸🇦", iso: "SA" },

  // ─── Oceania ──────────────────────────────
  { codigo: "+61", pais: "Austrália", bandeira: "🇦🇺", iso: "AU" },
  { codigo: "+64", pais: "Nova Zelândia", bandeira: "🇳🇿", iso: "NZ" },
];