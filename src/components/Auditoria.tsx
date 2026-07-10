import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { ShieldAlert, Database, Calendar, User, Eye, EyeOff } from "lucide-react";

interface UserProfile {
  id: string;
  nome: string;
  role: "admin" | "operador";
}

export default function Auditoria() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filterTabela, setFilterTabela] = useState("");
  const [filterAcao, setFilterAcao] = useState("");

  // Expansão de logs individuais
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Perfil
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser.user_metadata as any);
      }

      // 2. Carregar Logs (Se RLS não travar)
      const { data: logsData, error: logsErr } = await supabase
        .from("logs_auditoria")
        .select("*")
        .order("created_at", { ascending: false });

      if (logsErr) throw logsErr;
      setLogs(logsData || []);

      // 3. Carregar Lista de Perfis (para mapear os nomes)
      const { data: usersData } = await supabase
        .from("usuarios_perfil")
        .select("*");
      setUsuarios(usersData || []);
    } catch (err: any) {
      setError(err.message || "Acesso Negado ou Falha no Banco.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getUsuarioNome = (usuarioId: string | null) => {
    if (!usuarioId) return "Sistema / Automático";
    const u = usuarios.find(item => item.id === usuarioId);
    return u ? u.nome : `Usuário (${usuarioId.substring(0, 8)})`;
  };

  // Filtragem local
  const getFilteredLogs = () => {
    return logs.filter((log) => {
      const matchTabela = filterTabela ? log.tabela === filterTabela : true;
      const matchAcao = filterAcao ? log.acao === filterAcao : true;
      return matchTabela && matchAcao;
    });
  };

  // Renderizar o Diff do JSON de forma visualmente incrível
  const renderDiff = (dados: any) => {
    const antes = dados.antes || {};
    const depois = dados.depois || {};
    const todasAsChaves = Array.from(new Set([...Object.keys(antes), ...Object.keys(depois)]));

    // Omitir campos repetitivos/desnecessários no diff visual se quiser
    const chavesFiltradas = todasAsChaves.filter(k => k !== "created_at" && k !== "id");

    return (
      <div style={styles.diffWrapper}>
        <div style={styles.diffGridHeader}>
          <div style={styles.diffHeaderCol}>Coluna</div>
          <div style={styles.diffHeaderCol}>Estado Anterior (OLD)</div>
          <div style={styles.diffHeaderCol}>Novo Estado (NEW)</div>
        </div>
        
        {chavesFiltradas.map((key) => {
          const valOld = antes[key] !== undefined ? JSON.stringify(antes[key]) : null;
          const valNew = depois[key] !== undefined ? JSON.stringify(depois[key]) : null;
          const isChanged = valOld !== valNew;

          let rowBg = "transparent";
          let colorOld = "var(--text-secondary)";
          let colorNew = "var(--text-primary)";

          if (valOld === null) {
            rowBg = "rgba(14, 165, 233, 0.05)"; // Novo campo (cyan)
            colorNew = "var(--color-info)";
          } else if (valNew === null) {
            rowBg = "rgba(239, 68, 68, 0.05)";  // Excluído (red)
            colorOld = "var(--color-danger)";
          } else if (isChanged) {
            rowBg = "rgba(249, 115, 22, 0.05)"; // Modificado (orange)
            colorNew = "var(--color-warning)";
          }

          return (
            <div key={key} style={{ ...styles.diffRow, backgroundColor: rowBg }}>
              <div style={styles.diffKey}>{key}</div>
              <div style={{ ...styles.diffVal, color: colorOld }}>{valOld !== null ? valOld.replace(/"/g, "") : <em style={{color:"var(--text-muted)"}}>vazio</em>}</div>
              <div style={{ ...styles.diffVal, color: colorNew, fontWeight: isChanged ? 600 : "normal" }}>
                {valNew !== null ? valNew.replace(/"/g, "") : <em style={{color:"var(--text-muted)"}}>vazio</em>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case "INSERT": return "badge-info";
      case "UPDATE": return "badge-warning";
      case "DELETE": return "badge-danger";
      default: return "badge-info";
    }
  };

  // Se o usuário não for Admin, barramos a visualização e simulamos RLS
  const isDenied = user && user.role !== "admin";

  if (isDenied) {
    return (
      <div className="fade-in" style={styles.deniedContainer}>
        <div className="glass-panel" style={styles.deniedCard}>
          <div style={styles.deniedIcon}>
            <ShieldAlert size={48} color="var(--color-danger)" />
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: "700", color: "#fff", marginBottom: "10px" }}>Acesso Negado (Políticas RLS)</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6", maxWidth: "340px", margin: "0 auto" }}>
            A tabela <strong>logs_auditoria</strong> possui a diretiva <code>Row Level Security</code> ativa. 
            Apenas usuários com o perfil <strong>Administrador</strong> têm permissão para ler o histórico de auditoria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Logs de Auditoria</h1>
          <p>Histórico intocável de modificações de dados capturados por Database Triggers</p>
        </div>
      </div>

      {error && <div className="badge badge-danger" style={{ display: "block", marginBottom: "20px", padding: "10px" }}>{error}</div>}

      {/* Filtros */}
      <div className="glass-panel" style={styles.filtersBar}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Database size={18} color="var(--text-secondary)" />
          <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>Filtros de Auditoria</span>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <select value={filterTabela} onChange={(e) => setFilterTabela(e.target.value)} style={styles.filterSelect}>
            <option value="">Todas as Tabelas</option>
            <option value="colaboradores">colaboradores</option>
            <option value="contratos">contratos</option>
            <option value="cartoes">cartoes</option>
          </select>

          <select value={filterAcao} onChange={(e) => setFilterAcao(e.target.value)} style={styles.filterSelect}>
            <option value="">Todas as Ações</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>

      {/* Grid de Logs */}
      <div className="glass-panel" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>Consultando registros de segurança...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>Visualizar</th>
                  <th>Horário (UTC)</th>
                  <th>Autor da Ação</th>
                  <th>Tabela</th>
                  <th>Operação</th>
                  <th>Resumo</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredLogs().length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                      Nenhum registro de auditoria gravado.
                    </td>
                  </tr>
                ) : (
                  getFilteredLogs().map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const dataFormatada = new Date(log.created_at).toLocaleString("pt-BR", { timeZone: "UTC" });
                    
                    return (
                      <React.Fragment key={log.id}>
                        {/* Linha Resumo */}
                        <tr>
                          <td>
                            <button
                              style={styles.expandBtn}
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            >
                              {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Calendar size={14} color="var(--text-muted)" />
                              {dataFormatada}
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <User size={14} color="var(--primary)" />
                              {getUsuarioNome(log.usuario_id)}
                            </div>
                          </td>
                          <td>
                            <code>{log.tabela}</code>
                          </td>
                          <td>
                            <span className={`badge ${getActionBadgeClass(log.acao)}`}>
                              {log.acao}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            {log.acao === "INSERT" ? "Inserção de novo registro" : 
                             log.acao === "DELETE" ? "Exclusão física de registro" : 
                             `Alteração de dados em ${log.tabela}`}
                          </td>
                        </tr>

                        {/* Detalhes do Diff (Acordeão) */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} style={styles.expandedRowBg}>
                              <div style={styles.diffContainer}>
                                <h4 style={styles.diffTitle}>Detalhamento das Alterações de Colunas</h4>
                                {renderDiff(log.dados)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  deniedContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px"
  },
  deniedCard: {
    maxWidth: "480px",
    width: "100%",
    textAlign: "center",
    padding: "40px"
  },
  deniedIcon: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "var(--color-danger-bg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px"
  },
  filtersBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "16px"
  },
  filterSelect: {
    width: "auto",
    padding: "10px 16px"
  },
  expandBtn: {
    background: "transparent",
    border: "none",
    color: "var(--primary)",
    cursor: "pointer",
    padding: "4px"
  },
  expandedRowBg: {
    backgroundColor: "rgba(0, 0, 0, 0.25)"
  },
  diffContainer: {
    padding: "20px 40px"
  },
  diffTitle: {
    fontSize: "0.85rem",
    textTransform: "uppercase",
    color: "var(--primary)",
    letterSpacing: "0.05em",
    marginBottom: "14px",
    fontWeight: "700"
  },
  diffWrapper: {
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    overflow: "hidden"
  },
  diffGridHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr 2fr",
    background: "var(--bg-main)",
    borderBottom: "1px solid var(--border-color)",
    padding: "10px 16px",
    fontSize: "0.75rem",
    fontWeight: "600",
    textTransform: "uppercase",
    color: "var(--text-secondary)"
  },
  diffHeaderCol: {
    textAlign: "left"
  },
  diffRow: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr 2fr",
    padding: "10px 16px",
    borderBottom: "1px solid var(--border-color)",
    fontSize: "0.85rem"
  },
  diffKey: {
    fontWeight: "600",
    color: "var(--text-secondary)"
  },
  diffVal: {
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    paddingRight: "10px"
  }
};
