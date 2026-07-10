import React, { useEffect, useState } from "react";
import { runEdgeFunction } from "../lib/supabaseClient";
import { Building2, CreditCard, Users, FileWarning, RefreshCw, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Chama a Edge Function dashboard-indicadores
      const res = await runEdgeFunction("dashboard-indicadores");
      if (res && res.data) {
        setData(res.data);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <RefreshCw className="spin" size={40} color="var(--primary)" />
        <p style={{ marginTop: "12px", color: "var(--text-secondary)" }}>Carregando métricas analíticas...</p>
      </div>
    );
  }

  const { kpis, cartoesPorStatus, evolucaoMensal } = data || {
    kpis: { empresasAtivas: 0, contratosAVencer: 0, contratosVencidos: 0, colaboradoresAtivos: 0, totalCartoes: 0 },
    cartoesPorStatus: { ativo: 0, bloqueado: 0, cancelado: 0, reemitido: 0 },
    evolucaoMensal: []
  };

  // Calcular porcentagens para o gráfico
  const totalCards = kpis.totalCartoes || 1; // evita divisão por zero
  const pctAtivos = ((cartoesPorStatus.ativo / totalCards) * 100).toFixed(1);
  const pctBloqueados = ((cartoesPorStatus.bloqueado / totalCards) * 100).toFixed(1);
  const pctCancelados = ((cartoesPorStatus.cancelado / totalCards) * 100).toFixed(1);
  const pctReemitidos = ((cartoesPorStatus.reemitido / totalCards) * 100).toFixed(1);

  // Determinar altura para o gráfico de barras SVG
  const maxMensal = Math.max(...evolucaoMensal.map((m: any) => m.total), 1);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Dashboard Analítico</h1>
          <p>Visão geral de empresas, contratos e cartões de benefício ativos</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchDashboardData}>
          <RefreshCw size={16} /> Atualizar Painel
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={styles.kpiGrid}>
        <div className="glass-panel" style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, background: "rgba(59, 130, 246, 0.1)", borderColor: "var(--primary)" }}>
            <Building2 size={24} color="var(--primary)" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Empresas Ativas</p>
            <h3 style={styles.kpiValue}>{kpis.empresasAtivas}</h3>
          </div>
        </div>

        <div className="glass-panel" style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, background: "rgba(168, 85, 247, 0.1)", borderColor: "var(--secondary)" }}>
            <Users size={24} color="var(--secondary)" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Colaboradores Ativos</p>
            <h3 style={styles.kpiValue}>{kpis.colaboradoresAtivos}</h3>
          </div>
        </div>

        <div className="glass-panel" style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, background: "rgba(6, 182, 212, 0.1)", borderColor: "var(--color-info)" }}>
            <CreditCard size={24} color="var(--color-info)" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Total de Cartões</p>
            <h3 style={styles.kpiValue}>{kpis.totalCartoes}</h3>
          </div>
        </div>

        <div className="glass-panel" style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, background: "rgba(249, 115, 22, 0.1)", borderColor: "var(--color-warning)" }}>
            <FileWarning size={24} color="var(--color-warning)" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Contratos de Risco</p>
            <h3 style={styles.kpiValue}>
              {kpis.contratosAVencer + kpis.contratosVencidos}
              <span style={{ fontSize: "0.85rem", fontWeight: "normal", marginLeft: "6px", color: "var(--text-secondary)" }}>
                ({kpis.contratosAVencer} à vencer, {kpis.contratosVencidos} vencidos)
              </span>
            </h3>
          </div>
        </div>
      </div>

      {/* Gráficos e Detalhes */}
      <div style={styles.chartsRow}>
        {/* Gráfico 1: Evolução Mensal (SVG Curva e Barras) */}
        <div className="glass-panel" style={{ ...styles.chartPanel, flex: 2 }}>
          <h4 style={styles.chartTitle}>
            <TrendingUp size={18} color="var(--primary)" /> Evolução de Cartões Emitidos (Últimos 6 meses)
          </h4>
          <div style={styles.svgChartContainer}>
            <svg viewBox="0 0 500 200" width="100%" height="200" style={{ overflow: "visible" }}>
              {/* Eixos Grid */}
              <line x1="40" y1="20" x2="40" y2="170" stroke="var(--border-color)" strokeWidth="1" />
              <line x1="40" y1="170" x2="480" y2="170" stroke="var(--border-color)" strokeWidth="1" />
              
              {/* Linhas Horizontais de Referência */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="40" y1="70" x2="480" y2="70" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="40" y1="120" x2="480" y2="120" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3,3" />
              
              {/* Plotando as barras e labels */}
              {evolucaoMensal.map((m: any, idx: number) => {
                const x = 70 + idx * 75;
                const barHeight = (m.total / maxMensal) * 130;
                const y = 170 - barHeight;

                return (
                  <g key={idx}>
                    {/* Barra com Gradiente Neon */}
                    <defs>
                      <linearGradient id={`bar-grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>
                    <rect
                      x={x - 15}
                      y={y}
                      width="30"
                      height={barHeight}
                      fill={`url(#bar-grad-${idx})`}
                      rx="4"
                      style={{ transition: "all 0.5s" }}
                    />
                    {/* Círculo com valor de pico */}
                    <circle cx={x} cy={y} r="4" fill="var(--text-primary)" />
                    <text x={x} y={y - 8} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="600">
                      {m.total}
                    </text>
                    {/* Nome do Mês */}
                    <text x={x} y="188" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">
                      {m.mes}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Gráfico 2: Distribuição de Cartões por Status */}
        <div className="glass-panel" style={{ ...styles.chartPanel, flex: 1 }}>
          <h4 style={styles.chartTitle}>Status dos Cartões</h4>
          <div style={styles.statusBarsWrapper}>
            {/* Ativos */}
            <div style={styles.statusBarItem}>
              <div style={styles.statusBarHeader}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Ativos</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--color-success)" }}>
                  {cartoesPorStatus.ativo} ({pctAtivos}%)
                </span>
              </div>
              <div style={styles.statusBarTrack}>
                <div style={{ ...styles.statusBarFill, width: `${pctAtivos}%`, background: "var(--color-success)" }}></div>
              </div>
            </div>

            {/* Bloqueados */}
            <div style={styles.statusBarItem}>
              <div style={styles.statusBarHeader}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Bloqueados</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--color-warning)" }}>
                  {cartoesPorStatus.bloqueado} ({pctBloqueados}%)
                </span>
              </div>
              <div style={styles.statusBarTrack}>
                <div style={{ ...styles.statusBarFill, width: `${pctBloqueados}%`, background: "var(--color-warning)" }}></div>
              </div>
            </div>

            {/* Cancelados */}
            <div style={styles.statusBarItem}>
              <div style={styles.statusBarHeader}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Cancelados</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--color-danger)" }}>
                  {cartoesPorStatus.cancelado} ({pctCancelados}%)
                </span>
              </div>
              <div style={styles.statusBarTrack}>
                <div style={{ ...styles.statusBarFill, width: `${pctCancelados}%`, background: "var(--color-danger)" }}></div>
              </div>
            </div>

            {/* Reemitidos */}
            <div style={styles.statusBarItem}>
              <div style={styles.statusBarHeader}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Reemitidos</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--color-info)" }}>
                  {cartoesPorStatus.reemitido} ({pctReemitidos}%)
                </span>
              </div>
              <div style={styles.statusBarTrack}>
                <div style={{ ...styles.statusBarFill, width: `${pctReemitidos}%`, background: "var(--color-info)" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "300px"
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "30px"
  },
  kpiCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "20px"
  },
  kpiIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid"
  },
  kpiLabel: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)"
  },
  kpiValue: {
    fontSize: "1.4rem",
    fontWeight: "700",
    color: "#fff",
    marginTop: "2px"
  },
  chartsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px"
  },
  chartPanel: {
    minWidth: "300px",
    display: "flex",
    flexDirection: "column"
  },
  chartTitle: {
    fontSize: "1rem",
    fontWeight: "600",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#fff"
  },
  svgChartContainer: {
    marginTop: "auto"
  },
  statusBarsWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "auto",
    paddingBottom: "10px"
  },
  statusBarItem: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  statusBarHeader: {
    display: "flex",
    justifyContent: "space-between"
  },
  statusBarTrack: {
    height: "6px",
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: "3px",
    overflow: "hidden"
  },
  statusBarFill: {
    height: "100%",
    borderRadius: "3px",
    transition: "width 0.8s ease-out"
  }
};
