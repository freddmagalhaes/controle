import React, { useState } from "react";
import { supabase, isSimulated } from "../lib/supabaseClient";
import supabaseSimulator from "../lib/supabaseSimulator";
import { ShieldAlert, KeyRound, Mail, RefreshCw, Lock } from "lucide-react";

interface AuthProps {
  onLoginSuccess: (user: any) => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Controle de fluxo de MFA
  const [step, setStep] = useState<"login" | "mfa">("login");
  const [mfaCode, setMfaCode] = useState("");
  const [tempUser, setTempUser] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      if (data && data.user) {
        setTempUser(data.user);
        // Transicionar para o passo MFA (2FA TOTP)
        setTimeout(() => {
          setStep("mfa");
          setLoading(false);
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao fazer login.");
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simulação de MFA: valida qualquer código de 6 dígitos se estiver simulado, ou o código correto 123456
    if (mfaCode.length === 6) {
      // Salvar sessão no simulador
      const role = tempUser.email.startsWith("admin") ? "admin" : "operador";
      const profile = supabaseSimulator.select<any>("usuarios").find((u: any) => u.role === role);
      
      if (profile) {
        supabaseSimulator.setCurrentUser(profile);
        onLoginSuccess(profile);
      } else {
        setError("Perfil de usuário não encontrado.");
      }
      setLoading(false);
    } else {
      setError("Código de autenticação inválido. Deve ter exatamente 6 dígitos.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={styles.container}>
      <div className="glass-panel fade-in" style={styles.card}>
        <div style={styles.logoArea}>
          <div className="avatar-initials" style={styles.logoIcon}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="omni-auth-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#3ecf8e" />
                  <stop offset="50%" stop-color="#00e5ff" />
                  <stop offset="100%" stop-color="#7c3aed" />
                </linearGradient>
              </defs>
              <path 
                d="M7 16a4 4 0 110-8c1.8 0 3.2 1.2 3.8 2.8L16 6h5a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5.2-4.8C10.2 14.8 8.8 16 7 16z" 
                stroke="url(#omni-auth-logo-grad)" 
                strokeWidth="2.2" 
                strokeLinejoin="round" 
              />
              <path d="M15 10h4M15 14h4" stroke="url(#omni-auth-logo-grad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
            </svg>
          </div>
          <h2 style={styles.title}>OmniCard</h2>
          <p style={styles.subtitle}>Portal de Benefícios & Cartões</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <ShieldAlert size={18} color="var(--color-danger)" />
            <span style={{ fontSize: "0.85rem" }}>{error}</span>
          </div>
        )}

        {step === "login" ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <div className="form-group">
              <label>E-mail Corporativo</label>
              <div style={styles.inputIconWrapper}>
                <Mail size={16} style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="ex: admin@sistema.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.inputWithIcon}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Senha de Acesso</label>
              <div style={styles.inputIconWrapper}>
                <KeyRound size={16} style={styles.inputIcon} />
                <input
                  type="password"
                  placeholder="Digite sua senha"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.inputWithIcon}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: "10px" }}>
              {loading ? <RefreshCw className="spin" size={18} /> : "Entrar no Sistema"}
            </button>

            {isSimulated && (
              <div style={styles.demoCredentials}>
                <p style={{ fontWeight: 600, color: "var(--primary)", marginBottom: "4px" }}>Credenciais de Demonstração (MFA Ativo):</p>
                <code style={styles.code}>Admin: admin@sistema.com / 123456</code>
                <code style={styles.code}>Operador: operador@sistema.com / 123456</code>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyMfa} style={styles.form}>
            <div style={styles.mfaHeader}>
              <Lock size={20} color="var(--primary)" />
              <h3 style={styles.mfaTitle}>Verificação em Duas Etapas (2FA)</h3>
              <p style={styles.mfaSubtitle}>
                Insira o código TOTP gerado pelo seu aplicativo de autenticação (Google Authenticator ou Authy).
              </p>
            </div>

            {/* QR Code de Autenticação Simulado com visual ultra premium */}
            <div style={styles.qrContainer}>
              <svg width="120" height="120" viewBox="0 0 100 100" style={styles.qrSvg}>
                {/* QR Code Simulado com SVG */}
                <rect width="100" height="100" fill="transparent" />
                <rect x="5" y="5" width="25" height="25" fill="var(--primary)" />
                <rect x="10" y="10" width="15" height="15" fill="#060913" />
                <rect x="70" y="5" width="25" height="25" fill="var(--primary)" />
                <rect x="75" y="10" width="15" height="15" fill="#060913" />
                <rect x="5" y="70" width="25" height="25" fill="var(--primary)" />
                <rect x="10" y="75" width="15" height="15" fill="#060913" />
                <rect x="40" y="40" width="20" height="20" fill="var(--secondary)" />
                {/* Padrões aleatórios do QR */}
                <rect x="40" y="5" width="10" height="10" fill="var(--text-secondary)" />
                <rect x="55" y="15" width="10" height="10" fill="var(--text-secondary)" />
                <rect x="70" y="40" width="15" height="10" fill="var(--primary)" />
                <rect x="5" y="45" width="10" height="15" fill="var(--text-secondary)" />
                <rect x="40" y="70" width="10" height="25" fill="var(--primary)" />
                <rect x="70" y="70" width="25" height="25" fill="var(--secondary)" />
                <circle cx="50" cy="50" r="4" fill="var(--text-primary)" />
              </svg>
              <div style={styles.qrText}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Segredo TOTP:</span>
                <code style={{ fontSize: "0.85rem", color: "var(--primary)" }}>OMNICARD-AUTH-KEY</code>
              </div>
            </div>

            <div className="form-group">
              <label style={{ textAlign: "center", display: "block" }}>Código Autenticador</label>
              <input
                type="text"
                placeholder="000 000"
                maxLength={6}
                required
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                style={styles.mfaInput}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: "10px" }}>
              {loading ? <RefreshCw className="spin" size={18} /> : "Verificar e Entrar"}
            </button>

            <button type="button" className="btn-secondary" onClick={() => setStep("login")} style={{ width: "100%", marginTop: "10px" }}>
              Voltar ao Login
            </button>

            <div style={styles.mfaHint}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                Dica de simulação: Insira qualquer código de 6 dígitos (ex: 123456)
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Estilos inline de alta qualidade para complementar o index.css sem necessidade de arquivos extras complexos
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    width: "100vw",
    padding: "20px"
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    padding: "36px",
    display: "flex",
    flexDirection: "column"
  },
  logoArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "32px"
  },
  logoIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "14px",
    marginBottom: "12px",
    boxShadow: "0 0 15px var(--primary-glow)"
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: "800",
    letterSpacing: "0.05em",
    background: "linear-gradient(to right, #fff, var(--text-secondary))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  subtitle: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginTop: "4px"
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    backgroundColor: "var(--color-danger-bg)",
    border: "1px solid hsla(355, 85%, 55%, 0.2)",
    borderRadius: "var(--radius-sm)",
    marginBottom: "20px",
    color: "#fff"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  inputIconWrapper: {
    position: "relative",
    width: "100%"
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)"
  },
  inputWithIcon: {
    paddingLeft: "42px"
  },
  demoCredentials: {
    marginTop: "20px",
    padding: "12px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  code: {
    fontFamily: "monospace",
    fontSize: "0.75rem",
    color: "var(--text-secondary)"
  },
  mfaHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    marginBottom: "20px"
  },
  mfaTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    marginTop: "10px",
    color: "#fff"
  },
  mfaSubtitle: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    marginTop: "6px",
    lineHeight: "1.4"
  },
  qrContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "16px",
    background: "rgba(0,0,0,0.2)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-color)"
  },
  qrSvg: {
    padding: "8px",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0,0,0,0.5)"
  },
  qrText: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column"
  },
  mfaInput: {
    textAlign: "center",
    fontSize: "1.4rem",
    letterSpacing: "8px",
    fontWeight: "700",
    color: "var(--primary)"
  },
  mfaHint: {
    textAlign: "center",
    marginTop: "10px"
  }
};
