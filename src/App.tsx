import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import EmpresasContratos from "./components/EmpresasContratos";
import Colaboradores from "./components/Colaboradores";
import Cartoes from "./components/Cartoes";
import Auditoria from "./components/Auditoria";
import { LayoutDashboard, Building2, Users, CreditCard, ShieldAlert, LogOut } from "lucide-react";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [loading, setLoading] = useState(true);

  // Mapeamento dos perfis de usuário
  useEffect(() => {
    async function checkSession() {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setSession(data.user);
      }
      setLoading(false);
    }
    checkSession();
  }, []);

  const handleLoginSuccess = (user: any) => {
    // Transforma o perfil do simulador em uma estrutura de sessão compatível
    setSession({
      id: user.id,
      email: `${user.role}@sistema.com`,
      user_metadata: {
        nome: user.nome,
        role: user.role
      }
    });
    setActiveTab("dashboard");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setActiveTab("dashboard");
  };

  if (loading) {
    return (
      <div style={styles.loadingWrapper}>
        <div className="avatar-initials spin" style={{ width: "50px", height: "50px" }}></div>
        <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>Carregando dados da sessão de segurança...</p>
      </div>
    );
  }

  // Se deslogado, exibe tela de login
  if (!session) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  const role = session.user_metadata?.role || "operador";
  const nome = session.user_metadata?.nome || "Usuário";

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "empresas":
        return <EmpresasContratos />;
      case "colaboradores":
        return <Colaboradores />;
      case "cartoes":
        return <Cartoes />;
      case "auditoria":
        return <Auditoria />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* SVG Gradientes Úteis para Lucide e Estilização de Logos */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--secondary)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Sidebar Corporativa */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>OmniCard</span>
        </div>

        <ul className="sidebar-menu">
          <li className={`sidebar-item ${activeTab === "dashboard" ? "active" : ""}`}>
            <button onClick={() => setActiveTab("dashboard")}>
              <LayoutDashboard size={18} />
              <span>Painel</span>
            </button>
          </li>
          
          <li className={`sidebar-item ${activeTab === "empresas" ? "active" : ""}`}>
            <button onClick={() => setActiveTab("empresas")}>
              <Building2 size={18} />
              <span>Empresas Conveniadas</span>
            </button>
          </li>

          <li className={`sidebar-item ${activeTab === "colaboradores" ? "active" : ""}`}>
            <button onClick={() => setActiveTab("colaboradores")}>
              <Users size={18} />
              <span>Colaboradores</span>
            </button>
          </li>

          <li className={`sidebar-item ${activeTab === "cartoes" ? "active" : ""}`}>
            <button onClick={() => setActiveTab("cartoes")}>
              <CreditCard size={18} />
              <span>Cartões Emitidos</span>
            </button>
          </li>

          {/* O link de Logs só aparece se for Admin para simular o controle de acesso RLS, ou aparece com cadeado se for Operador */}
          <li className={`sidebar-item ${activeTab === "auditoria" ? "active" : ""}`}>
            <button onClick={() => setActiveTab("auditoria")}>
              <ShieldAlert size={18} color={role === "admin" ? "inherit" : "var(--text-muted)"} />
              <span style={{ color: role === "admin" ? "inherit" : "var(--text-muted)" }}>
                Auditoria de Logs {role !== "admin" && "🔒"}
              </span>
            </button>
          </li>
        </ul>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="avatar-initials">
              {nome.substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{nome}</span>
              <span className="user-role">{role}</span>
            </div>
          </div>
          <button className="btn btn-secondary btn-signout" onClick={handleSignOut} style={styles.signOutBtn}>
            <LogOut size={16} />
            <span>Sair do Portal</span>
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="main-content">
        {renderActiveTab()}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    width: "100vw",
    backgroundColor: "var(--bg-main)"
  },
  signOutBtn: {
    width: "100%",
    marginTop: "14px",
    padding: "8px 12px",
    fontSize: "0.85rem",
    justifyContent: "center",
    borderColor: "transparent",
    background: "rgba(239, 68, 68, 0.05)",
    color: "var(--color-danger)"
  }
};
