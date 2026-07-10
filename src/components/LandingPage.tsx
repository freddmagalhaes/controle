import { 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Zap, 
  Database, 
  Sun, 
  Moon, 
  CreditCard 
} from "lucide-react";

interface LandingPageProps {
  onAccessPortal: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export default function LandingPage({ onAccessPortal, theme, toggleTheme }: LandingPageProps) {
  return (
    <div className="landing-container" style={styles.container}>
      {/* 1. Header / Navbar */}
      <header className="glass-panel" style={styles.navbar}>
        <div style={styles.logoGroup}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="omni-landing-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--logo-stop-1)" />
                <stop offset="50%" stop-color="var(--logo-stop-2)" />
                <stop offset="100%" stop-color="var(--logo-stop-3)" />
              </linearGradient>
            </defs>
            <path 
              d="M7 16a4 4 0 110-8c1.8 0 3.2 1.2 3.8 2.8L16 6h5a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5.2-4.8C10.2 14.8 8.8 16 7 16z" 
              stroke="url(#omni-landing-logo-grad)" 
              strokeWidth="2.2" 
              strokeLinejoin="round" 
            />
            <path d="M15 10h4M15 14h4" stroke="url(#omni-landing-logo-grad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          </svg>
          <span style={styles.logoText}>OmniCard</span>
        </div>

        <nav style={styles.navLinks}>
          <a href="#features" style={styles.navLink}>Recursos</a>
          <a href="#architecture" style={styles.navLink}>Arquitetura</a>
          <a href="#interactive-card" style={styles.navLink}>O Cartão</a>
        </nav>

        <div style={styles.navActions}>
          <button 
            className="btn btn-secondary btn-icon" 
            onClick={toggleTheme} 
            style={styles.themeBtn}
            title={theme === "dark" ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="btn btn-primary" onClick={onAccessPortal} style={styles.accessBtn}>
            <span>Acessar Portal</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroContent} className="fade-in">
          <div style={styles.badge}>
            <ShieldCheck size={14} color="var(--primary)" />
            <span>Fintech Portal de Benefícios & Segurança</span>
          </div>
          <h1 style={styles.heroTitle}>
            A revolução na gestão de <span style={styles.gradientText}>benefícios corporativos</span>
          </h1>
          <p style={styles.heroSubtitle}>
            Simplifique o controle de colaboradores, automatize inativações em cascata e tenha auditoria completa em tempo real com segurança PostgreSQL nativa.
          </p>
          <div style={styles.heroButtonGroup}>
            <button className="btn btn-primary btn-lg" onClick={onAccessPortal} style={styles.heroPrimaryBtn}>
              <span>Acessar o Painel</span>
              <ArrowRight size={18} />
            </button>
            <a 
              href="https://github.com/freddmagalhaes/controle" 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-secondary btn-lg"
              style={styles.heroSecondaryBtn}
            >
              <span>Ver no GitHub</span>
            </a>
          </div>
        </div>

        <div style={styles.heroGraphic} className="fade-in">
          <div className="glass-panel pulse-glowing" style={styles.mockupContainer}>
            <img 
              src="/omnicard_dashboard_mockup.png" 
              alt="OmniCard Dashboard UI Mockup" 
              style={styles.mockupImage} 
            />
          </div>
        </div>
      </section>

      {/* 3. Stats Bar */}
      <section style={styles.statsBar} className="glass-panel">
        <div style={styles.statItem}>
          <span style={styles.statNumber}>100%</span>
          <span style={styles.statLabel}>Auditável com Triggers</span>
        </div>
        <div style={styles.statDivider}></div>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>Cascading</span>
          <span style={styles.statLabel}>Inativação de Colaboradores</span>
        </div>
        <div style={styles.statDivider}></div>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>Deno Edge</span>
          <span style={styles.statLabel}>Importação e Emissão de PDFs</span>
        </div>
        <div style={styles.statDivider}></div>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>RLS Ativo</span>
          <span style={styles.statLabel}>Políticas Row-Level Security</span>
        </div>
      </section>

      {/* 4. Features Section */}
      <section id="features" style={styles.featuresSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Recursos Avançados e Modernos</h2>
          <p style={styles.sectionSubtitle}>
            Unimos o melhor do design de alta fidelidade com políticas de segurança integradas diretamente no core do banco de dados.
          </p>
        </div>

        <div style={styles.featuresGrid}>
          <div className="glass-panel" style={styles.featureCard}>
            <div style={styles.featureIconWrapper}>
              <CreditCard size={20} color="var(--primary)" />
            </div>
            <h3 style={styles.featureCardTitle}>Gestão Inteligente de Cartões</h3>
            <p style={styles.featureCardText}>
              Emissão, bloqueio temporário, desbloqueio e reemissão com atualização imediata de vigência e controle flexível.
            </p>
          </div>

          <div className="glass-panel" style={styles.featureCard}>
            <div style={styles.featureIconWrapper}>
              <Layers size={20} color="var(--primary)" />
            </div>
            <h3 style={styles.featureCardTitle}>Inativação em Cascata</h3>
            <p style={styles.featureCardText}>
              Triggers PostgreSQL garantem consistência: inativar um colaborador bloqueia seus cartões e inativa seus dependentes automaticamente.
            </p>
          </div>

          <div className="glass-panel" style={styles.featureCard}>
            <div style={styles.featureIconWrapper}>
              <Database size={20} color="var(--primary)" />
            </div>
            <h3 style={styles.featureCardTitle}>Auditoria de Histórico Completa</h3>
            <p style={styles.featureCardText}>
              Tabelas de auditoria registram instantaneamente snapshots dos dados (antes e depois de modificações) para conformidade total.
            </p>
          </div>

          <div className="glass-panel" style={styles.featureCard}>
            <div style={styles.featureIconWrapper}>
              <Zap size={20} color="var(--primary)" />
            </div>
            <h3 style={styles.featureCardTitle}>Processamento com Deno Edge</h3>
            <p style={styles.featureCardText}>
              Importações assíncronas em lote de CPFs e exportação dinâmica de relatórios em PDF com assinatura digital do portal.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Interactive Floating Card Section */}
      <section id="interactive-card" style={styles.cardSection}>
        <div style={styles.cardSectionContent}>
          <h2 style={styles.cardSectionTitle}>O Cartão do Futuro Corporativo</h2>
          <p style={styles.cardSectionText}>
            Um único cartão físico ou virtual que unifica alimentação, refeição, mobilidade e saúde em um fluxo dinâmico gerenciado por regras finas de RLS.
          </p>
          <button className="btn btn-primary" onClick={onAccessPortal} style={{ marginTop: "1rem" }}>
            <span>Começar Agora</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <div style={styles.cardVisualWrapper}>
          <div className="floating-card-mockup" style={styles.creditCardMockup}>
            <div style={styles.ccHeader}>
              <div style={styles.ccChip}></div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="12" r="6" fill="#fff" opacity="0.15" />
                <circle cx="14" cy="12" r="6" fill="#fff" opacity="0.25" />
              </svg>
            </div>
            <div style={styles.ccNumber}>••••  ••••  ••••  4242</div>
            <div style={styles.ccFooter}>
              <div>
                <div style={styles.ccLabel}>Dono do Cartão</div>
                <div style={styles.ccValue}>Carlos Silva (Admin)</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={styles.ccLabel}>Vencimento</div>
                <div style={styles.ccValue}>12/31</div>
              </div>
            </div>
            <div style={styles.ccLogoName}>OmniCard</div>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer style={styles.footer} className="glass-panel">
        <div style={styles.footerBrand}>
          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>OmniCard © 2026</span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Portal Avançado de Controle e Gestão de Benefícios.
          </span>
        </div>
        <div style={styles.footerTechs}>
          <span style={styles.techBadge}>React 19</span>
          <span style={styles.statDivider}></span>
          <span style={styles.techBadge}>Supabase</span>
          <span style={styles.statDivider}></span>
          <span style={styles.techBadge}>PostgreSQL</span>
          <span style={styles.statDivider}></span>
          <span style={styles.techBadge}>Deno Edge</span>
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "var(--bg-main)",
    color: "var(--text-primary)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 24px",
    width: "100vw",
    overflowX: "hidden",
  },
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    maxWidth: "1200px",
    padding: "16px 24px",
    borderRadius: "16px",
    marginTop: "24px",
    border: "1px solid var(--border-color)",
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoText: {
    fontSize: "1.25rem",
    fontWeight: 800,
    background: "linear-gradient(135deg, var(--logo-stop-1), var(--logo-stop-3))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
  },
  navLinks: {
    display: "flex",
    gap: "24px",
  },
  navLink: {
    color: "var(--text-secondary)",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: 500,
    transition: "color 0.2s ease",
  },
  navActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  themeBtn: {
    width: "38px",
    height: "38px",
    padding: 0,
    borderRadius: "10px",
  },
  accessBtn: {
    fontSize: "0.85rem",
    padding: "8px 16px",
  },
  heroSection: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    maxWidth: "1200px",
    padding: "80px 0 60px 0",
    gap: "40px",
  },
  heroContent: {
    flex: "1 1 500px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    textAlign: "left",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--primary)",
    marginBottom: "24px",
  },
  heroTitle: {
    fontSize: "3.2rem",
    fontWeight: 800,
    lineHeight: "1.15",
    letterSpacing: "-1.5px",
    marginBottom: "20px",
  },
  gradientText: {
    background: "linear-gradient(135deg, var(--logo-stop-1), var(--logo-stop-2), var(--logo-stop-3))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  heroSubtitle: {
    fontSize: "1.15rem",
    color: "var(--text-secondary)",
    lineHeight: "1.6",
    marginBottom: "32px",
    maxWidth: "540px",
  },
  heroButtonGroup: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
  },
  heroPrimaryBtn: {
    padding: "14px 28px",
    fontSize: "1rem",
    borderRadius: "12px",
  },
  heroSecondaryBtn: {
    padding: "14px 28px",
    fontSize: "1rem",
    borderRadius: "12px",
  },
  heroGraphic: {
    flex: "1 1 450px",
    display: "flex",
    justifyContent: "center",
  },
  mockupContainer: {
    padding: "12px",
    borderRadius: "24px",
    border: "1px solid var(--border-color)",
    overflow: "hidden",
    boxShadow: "var(--shadow-lg)",
  },
  mockupImage: {
    width: "100%",
    maxWidth: "500px",
    borderRadius: "16px",
    display: "block",
  },
  statsBar: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    maxWidth: "1200px",
    padding: "24px",
    borderRadius: "20px",
    border: "1px solid var(--border-color)",
    margin: "40px 0 80px 0",
    gap: "20px",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  statNumber: {
    fontSize: "1.75rem",
    fontWeight: 800,
    background: "linear-gradient(135deg, var(--logo-stop-1), var(--logo-stop-2))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  statLabel: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    marginTop: "4px",
    fontWeight: 500,
  },
  statDivider: {
    width: "1px",
    height: "30px",
    backgroundColor: "var(--border-color)",
  },
  featuresSection: {
    width: "100%",
    maxWidth: "1200px",
    paddingBottom: "80px",
  },
  sectionHeader: {
    textAlign: "center",
    marginBottom: "48px",
  },
  sectionTitle: {
    fontSize: "2.2rem",
    fontWeight: 800,
    letterSpacing: "-1px",
    marginBottom: "12px",
  },
  sectionSubtitle: {
    color: "var(--text-secondary)",
    maxWidth: "600px",
    margin: "0 auto",
    lineHeight: "1.5",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "24px",
    width: "100%",
  },
  featureCard: {
    padding: "32px 24px",
    borderRadius: "18px",
    border: "1px solid var(--border-color)",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    textAlign: "left",
    transition: "transform 0.3s ease, border-color 0.3s ease",
  },
  featureIconWrapper: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "rgba(59, 130, 246, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
  },
  featureCardTitle: {
    fontSize: "1.2rem",
    fontWeight: 700,
    marginBottom: "10px",
  },
  featureCardText: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    lineHeight: "1.5",
  },
  cardSection: {
    display: "flex",
    flexWrap: "wrap-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    maxWidth: "1200px",
    padding: "80px 0",
    gap: "40px",
    borderTop: "1px solid var(--border-color)",
  },
  cardSectionContent: {
    flex: "1 1 500px",
    textAlign: "left",
  },
  cardSectionTitle: {
    fontSize: "2.2rem",
    fontWeight: 800,
    letterSpacing: "-1px",
    marginBottom: "16px",
  },
  cardSectionText: {
    fontSize: "1.05rem",
    color: "var(--text-secondary)",
    lineHeight: "1.6",
    marginBottom: "24px",
    maxWidth: "540px",
  },
  cardVisualWrapper: {
    flex: "1 1 450px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  creditCardMockup: {
    width: "360px",
    height: "220px",
    borderRadius: "18px",
    background: "linear-gradient(135deg, rgba(31, 41, 55, 0.9) 0%, rgba(17, 24, 39, 0.95) 100%)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 25px var(--primary-glow)",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    color: "#fff",
    overflow: "hidden",
  },
  ccHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ccChip: {
    width: "40px",
    height: "30px",
    borderRadius: "6px",
    background: "linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)",
    border: "1px solid rgba(0, 0, 0, 0.1)",
  },
  ccNumber: {
    fontSize: "1.35rem",
    fontFamily: "monospace",
    letterSpacing: "2px",
    margin: "24px 0 16px 0",
    color: "#f3f4f6",
  },
  ccFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  ccLabel: {
    fontSize: "0.65rem",
    textTransform: "uppercase",
    color: "#9ca3af",
    letterSpacing: "1px",
    marginBottom: "4px",
  },
  ccValue: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#f9fafb",
  },
  ccLogoName: {
    position: "absolute",
    top: "24px",
    right: "24px",
    fontSize: "1.1rem",
    fontWeight: 800,
    background: "linear-gradient(135deg, var(--logo-stop-1), var(--logo-stop-2))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  footer: {
    width: "100%",
    maxWidth: "1200px",
    padding: "32px",
    borderRadius: "20px",
    border: "1px solid var(--border-color)",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    margin: "40px 0 60px 0",
    gap: "20px",
  },
  footerBrand: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "6px",
    textAlign: "left",
  },
  footerTechs: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  techBadge: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
};
