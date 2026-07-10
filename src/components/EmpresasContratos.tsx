import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Building2, FileText, Plus, Check, ShieldAlert, Calendar } from "lucide-react";

interface UserProfile {
  id: string;
  nome: string;
  role: "admin" | "operador";
}

export default function EmpresasContratos() {
  const [activeTab, setActiveTab] = useState<"empresas" | "contratos">("empresas");
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // States
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal States
  const [showEmpresaModal, setShowEmpresaModal] = useState(false);
  const [showContratoModal, setShowContratoModal] = useState(false);

  // Form States - Empresa
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [empresaStatus, setEmpresaStatus] = useState<"ativa" | "inativa">("ativa");

  // Form States - Contrato
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Perfil do usuário
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser.user_metadata as any);
      }

      // 2. Carregar Empresas
      const { data: empData, error: empErr } = await supabase
        .from("empresas")
        .select("*")
        .order("razao_social", { ascending: true });
      if (empErr) throw empErr;
      setEmpresas(empData || []);

      // 3. Carregar Contratos
      const { data: contData, error: contErr } = await supabase
        .from("contratos")
        .select("*")
        .order("data_fim", { ascending: false });
      if (contErr) throw contErr;
      setContratos(contData || []);
    } catch (err: any) {
      setError(err.message || "Erro ao consultar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) {
      setError("CNPJ deve conter exatamente 14 dígitos.");
      return;
    }

    try {
      const { error: insertErr } = await supabase
        .from("empresas")
        .insert({
          razao_social: razaoSocial,
          cnpj: cleanCnpj,
          status: empresaStatus
        });

      if (insertErr) throw insertErr;

      setSuccessMsg("Empresa cadastrada com sucesso!");
      setRazaoSocial("");
      setCnpj("");
      setShowEmpresaModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Erro ao cadastrar empresa.");
    }
  };

  const handleCreateContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedEmpresaId) {
      setError("Selecione uma empresa.");
      return;
    }

    if (new Date(dataFim) < new Date(dataInicio)) {
      setError("A data de término não pode ser anterior à data de início.");
      return;
    }

    try {
      // Calcular status preliminar do contrato
      const hoje = new Date();
      const fim = new Date(dataFim);
      let status: "ativo" | "a_vencer" | "vencido" = "ativo";

      if (fim < hoje) {
        status = "vencido";
      } else {
        const diffTime = fim.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          status = "a_vencer";
        }
      }

      const { error: insertErr } = await supabase
        .from("contratos")
        .insert({
          empresa_id: selectedEmpresaId,
          data_inicio: dataInicio,
          data_fim: dataFim,
          status
        });

      if (insertErr) throw insertErr;

      setSuccessMsg("Contrato gerado com sucesso!");
      setDataInicio("");
      setDataFim("");
      setSelectedEmpresaId("");
      setShowContratoModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Erro ao registrar contrato.");
    }
  };

  const getEmpresaNome = (empresaId: string) => {
    const emp = empresas.find(e => e.id === empresaId);
    return emp ? emp.razao_social : "Empresa não encontrada";
  };

  const formatCNPJ = (cnpjRaw: string) => {
    return cnpjRaw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };

  const formatVigencia = (inicio: string, fim: string) => {
    const dIni = new Date(inicio).toLocaleDateString("pt-BR", { timeZone: "UTC" });
    const dFim = new Date(fim).toLocaleDateString("pt-BR", { timeZone: "UTC" });
    return `${dIni} até ${dFim}`;
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Estrutura Corporativa</h1>
          <p>Gerenciamento de empresas conveniadas e vigência contratual</p>
        </div>

        {isAdmin && (
          <div style={styles.headerActions}>
            <button className="btn btn-primary" onClick={() => setShowEmpresaModal(true)}>
              <Plus size={16} /> Nova Empresa
            </button>
            <button className="btn btn-secondary" onClick={() => setShowContratoModal(true)}>
              <Plus size={16} /> Novo Contrato
            </button>
          </div>
        )}
      </div>

      {/* RLS Alert Banner for Operator Role */}
      {!isAdmin && (
        <div style={styles.rlsNotice}>
          <ShieldAlert size={16} color="var(--color-warning)" />
          <span>Modo Somente Leitura ativado para seu perfil de Operador (RLS ativo)</span>
        </div>
      )}

      {error && <div className="badge badge-danger" style={{ display: "block", marginBottom: "20px", padding: "10px" }}>{error}</div>}
      {successMsg && <div className="badge badge-success" style={{ display: "block", marginBottom: "20px", padding: "10px" }}>{successMsg}</div>}

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab("empresas")}
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === "empresas" ? "2px solid var(--primary)" : "2px solid transparent",
            color: activeTab === "empresas" ? "var(--primary)" : "var(--text-secondary)"
          }}
        >
          <Building2 size={16} /> Empresas Cadastradas ({empresas.length})
        </button>
        <button
          onClick={() => setActiveTab("contratos")}
          style={{
            ...styles.tabButton,
            borderBottom: activeTab === "contratos" ? "2px solid var(--primary)" : "2px solid transparent",
            color: activeTab === "contratos" ? "var(--primary)" : "var(--text-secondary)"
          }}
        >
          <FileText size={16} /> Contratos vigentes ({contratos.length})
        </button>
      </div>

      {/* Content */}
      <div className="glass-panel" style={{ padding: "0" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>Carregando registros...</div>
        ) : activeTab === "empresas" ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Razão Social</th>
                  <th>CNPJ</th>
                  <th>Status</th>
                  <th>Criado Em</th>
                </tr>
              </thead>
              <tbody>
                {empresas.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)" }}>Nenhuma empresa cadastrada.</td>
                  </tr>
                ) : (
                  empresas.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 600 }}>{emp.razao_social}</td>
                      <td>{formatCNPJ(emp.cnpj)}</td>
                      <td>
                        <span className={`badge ${emp.status === "ativa" ? "badge-success" : "badge-danger"}`}>
                          {emp.status === "ativa" ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                      <td>{new Date(emp.created_at).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Período de Vigência</th>
                  <th>Status</th>
                  <th>Criado Em</th>
                </tr>
              </thead>
              <tbody>
                {contratos.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)" }}>Nenhum contrato cadastrado.</td>
                  </tr>
                ) : (
                  contratos.map((cont) => (
                    <tr key={cont.id}>
                      <td style={{ fontWeight: 600 }}>{getEmpresaNome(cont.empresa_id)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={14} color="var(--text-muted)" />
                          {formatVigencia(cont.data_inicio, cont.data_fim)}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            cont.status === "ativo"
                              ? "badge-success"
                              : cont.status === "a_vencer"
                              ? "badge-warning"
                              : "badge-danger"
                          }`}
                        >
                          {cont.status === "ativo" ? "Ativo" : cont.status === "a_vencer" ? "A vencer" : "Vencido"}
                        </span>
                      </td>
                      <td>{new Date(cont.created_at).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal - Cadastro Empresa */}
      {showEmpresaModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel fade-in" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Cadastrar Nova Empresa Conveniada</h3>
            </div>
            <form onSubmit={handleCreateEmpresa} style={styles.modalForm}>
              <div className="form-group">
                <label>Razão Social</label>
                <input
                  type="text"
                  placeholder="ex: ACME Corp Beneficios"
                  required
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>CNPJ (apenas números)</label>
                <input
                  type="text"
                  placeholder="14 dígitos"
                  maxLength={14}
                  required
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value.replace(/\D/g, ""))}
                />
              </div>

              <div className="form-group">
                <label>Status Operacional</label>
                <select value={empresaStatus} onChange={(e: any) => setEmpresaStatus(e.target.value)}>
                  <option value="ativa">Ativa</option>
                  <option value="inativa">Inativa</option>
                </select>
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEmpresaModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> Salvar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Cadastro Contrato */}
      {showContratoModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel fade-in" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Registrar Novo Contrato Comercial</h3>
            </div>
            <form onSubmit={handleCreateContrato} style={styles.modalForm}>
              <div className="form-group">
                <label>Selecione a Empresa Conveniada</label>
                <select value={selectedEmpresaId} onChange={(e) => setSelectedEmpresaId(e.target.value)} required>
                  <option value="">Selecione uma empresa...</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.razao_social} ({formatCNPJ(emp.cnpj)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Data de Início da Vigência</label>
                <input type="date" required value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Data de Término da Vigência</label>
                <input type="date" required value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowContratoModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> Salvar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headerActions: {
    display: "flex",
    gap: "10px"
  },
  rlsNotice: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 18px",
    background: "rgba(249, 115, 22, 0.05)",
    border: "1px solid rgba(249, 115, 22, 0.2)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-warning)",
    fontSize: "0.85rem",
    marginBottom: "20px"
  },
  tabsContainer: {
    display: "flex",
    gap: "24px",
    marginBottom: "20px",
    borderBottom: "1px solid var(--border-color)"
  },
  tabButton: {
    background: "transparent",
    border: "none",
    padding: "12px 6px",
    fontSize: "0.95rem",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(6, 9, 19, 0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    padding: "20px"
  },
  modalContent: {
    width: "100%",
    maxWidth: "500px",
    backgroundColor: "var(--bg-card)",
    boxShadow: "var(--shadow-lg)"
  },
  modalHeader: {
    marginBottom: "20px",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "12px"
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
    borderTop: "1px solid var(--border-color)",
    paddingTop: "14px"
  }
};
