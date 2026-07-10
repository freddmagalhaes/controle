import React, { useEffect, useState } from "react";
import { supabase, runEdgeFunction } from "../lib/supabaseClient";
import { UserPlus, FileUp, Search, Trash2, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from "lucide-react";

export default function Colaboradores() {
  // Lists
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [dependentes, setDependentes] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [cartoes, setCartoes] = useState<any[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedColId, setExpandedColId] = useState<string | null>(null);

  // Filters
  const [filterEmpresa, setFilterEmpresa] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [searchName, setSearchName] = useState("");

  // Modais
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [showAddDepModal, setShowAddDepModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form States - Colaborador
  const [colNome, setColNome] = useState("");
  const [colCpf, setColCpf] = useState("");
  const [colEmpresaId, setColEmpresaId] = useState("");

  // Form States - Dependente
  const [depNome, setDepNome] = useState("");
  const [depColId, setDepColId] = useState("");

  // Import States
  const [selectedImportEmpresaId, setSelectedImportEmpresaId] = useState("");
  const [importReport, setImportReport] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Empresas
      const { data: emp } = await supabase.from("empresas").select("*");
      setEmpresas(emp || []);

      // 2. Colaboradores
      const { data: cols } = await supabase.from("colaboradores").select("*");
      setColaboradores(cols || []);

      // 3. Dependentes
      const { data: deps } = await supabase.from("dependentes").select("*");
      setDependentes(deps || []);

      // 4. Cartões (para saber quem tem cartão)
      const { data: cards } = await supabase.from("cartoes").select("*");
      setCartoes(cards || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanCpf = colCpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      setError("O CPF deve conter exatamente 11 dígitos.");
      return;
    }

    if (!colEmpresaId) {
      setError("Selecione uma empresa conveniada.");
      return;
    }

    try {
      const { error: insertErr } = await supabase
        .from("colaboradores")
        .insert({
          nome: colNome,
          cpf: cleanCpf,
          empresa_id: colEmpresaId,
          status: "ativo"
        });

      if (insertErr) throw insertErr;

      setSuccess("Colaborador cadastrado com sucesso!");
      setColNome("");
      setColCpf("");
      setShowAddColModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Erro ao criar colaborador.");
    }
  };

  const handleAddDependente = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!depColId) return;

    try {
      const { error: insertErr } = await supabase
        .from("dependentes")
        .insert({
          nome: depNome,
          colaborador_id: depColId,
          status: "ativo"
        });

      if (insertErr) throw insertErr;

      setSuccess("Dependente adicionado com sucesso!");
      setDepNome("");
      setShowAddDepModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Erro ao adicionar dependente.");
    }
  };

  // Inativação lógica do Colaborador
  const handleInactivateColaborador = async (id: string) => {
    if (!confirm("Tem certeza que deseja inativar este colaborador? Isso inativará seus dependentes e bloqueará todos os cartões vinculados a eles.")) return;
    
    setError(null);
    setSuccess(null);
    try {
      const { error: updateErr } = await supabase
        .from("colaboradores")
        .update({ status: "inativo" })
        .eq("id", id);

      if (updateErr) throw updateErr;

      setSuccess("Colaborador inativado com sucesso (cascata de inativação e logs registrados)!");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Inativação lógica do Dependente
  const handleInactivateDependente = async (id: string) => {
    if (!confirm("Tem certeza que deseja inativar este dependente? Os cartões deste dependente serão bloqueados.")) return;

    setError(null);
    setSuccess(null);
    try {
      const { error: updateErr } = await supabase
        .from("dependentes")
        .update({ status: "inativo" })
        .eq("id", id);

      if (updateErr) throw updateErr;

      setSuccess("Dependente inativado!");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Simulação de Importação do Excel (.xlsx) via Edge Function
  const triggerSimulatedImport = async (type: "valido" | "erros") => {
    if (!selectedImportEmpresaId) {
      alert("Por favor, selecione a empresa destino para os colaboradores.");
      return;
    }

    setImporting(true);
    setImportReport(null);

    // Massa de dados de simulação
    const mockDataValida = [
      { Nome: "Gabriel Barbosa", CPF: "22849508006" }, // CPF Válido formatado internamente
      { Nome: "Isabela Martins", CPF: "92150965030" }, // CPF Válido
      { Nome: "Ricardo Tavares", CPF: "04938210080" }  // CPF Válido
    ];

    const mockDataComErros = [
      { Nome: "Roberto Souza", CPF: "11111111111" },     // CPF Inválido (todos repetidos)
      { Nome: "Juliana Santos", CPF: "1234567" },         // CPF Muito Curto
      { Nome: "", CPF: "45678912300" },                  // Nome vazio
      { Nome: "Ana Paula Oliveira", CPF: "12345678901" }  // CPF já cadastrado no banco (duplicidade)
    ];

    const colaboradoresParaEnviar = type === "valido" ? mockDataValida : mockDataComErros;

    try {
      const res = await runEdgeFunction("importar-colaboradores", {
        colaboradores: colaboradoresParaEnviar,
        empresaId: selectedImportEmpresaId
      });

      setImportReport(res);
      fetchData(); // atualiza dados locais
    } catch (err: any) {
      alert("Erro na Edge Function: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Filtragem local
  const getFilteredColaboradores = () => {
    return colaboradores.filter((col) => {
      const matchEmpresa = filterEmpresa ? col.empresa_id === filterEmpresa : true;
      const matchStatus = filterStatus === "todos" ? true : col.status === filterStatus;
      const matchSearch = col.nome.toLowerCase().includes(searchName.toLowerCase()) || col.cpf.includes(searchName);
      return matchEmpresa && matchStatus && matchSearch;
    });
  };

  const getCompanyDetails = (empId: string) => {
    const emp = empresas.find(e => e.id === empId);
    return emp ? emp.razao_social : "Sem Empresa";
  };

  const getDependentsOfCol = (colId: string) => {
    return dependentes.filter(d => d.colaborador_id === colId);
  };

  const getActiveCardsCount = (donoId: string) => {
    return cartoes.filter(c => c.dono_id === donoId && c.status === "ativo").length;
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Colaboradores & Dependentes</h1>
          <p>Gerencie o quadro de beneficiários e dependentes vinculados ao sistema</p>
        </div>

        <div style={styles.headerActions}>
          <button className="btn btn-primary" onClick={() => setShowAddColModal(true)}>
            <UserPlus size={16} /> Novo Colaborador
          </button>
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
            <FileUp size={16} /> Importar Lote (XLSX)
          </button>
        </div>
      </div>

      {success && <div className="badge badge-success" style={styles.alertBanner}>{success}</div>}
      {error && <div className="badge badge-danger" style={styles.alertBanner}>{error}</div>}

      {/* Barra de Filtros */}
      <div className="glass-panel" style={styles.filtersBar}>
        <div style={styles.filterInputWrapper}>
          <Search size={16} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={styles.filterInput}
          />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <select value={filterEmpresa} onChange={(e) => setFilterEmpresa(e.target.value)} style={styles.filterSelect}>
            <option value="">Todas as Empresas</option>
            {empresas.map(e => (
              <option key={e.id} value={e.id}>{e.razao_social}</option>
            ))}
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
            <option value="todos">Todos Status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
      </div>

      {/* Tabela de Colaboradores */}
      <div className="glass-panel" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>Carregando dados...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}></th>
                  <th>Nome Completo</th>
                  <th>CPF</th>
                  <th>Empresa Conveniada</th>
                  <th>Status</th>
                  <th>Cartões Ativos</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredColaboradores().length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                      Nenhum beneficiário encontrado.
                    </td>
                  </tr>
                ) : (
                  getFilteredColaboradores().map((col) => {
                    const isExpanded = expandedColId === col.id;
                    const colDeps = getDependentsOfCol(col.id);
                    const cardsCount = getActiveCardsCount(col.id);

                    return (
                      <React.Fragment key={col.id}>
                        {/* Linha Principal */}
                        <tr>
                          <td>
                            <button
                              style={styles.expandButton}
                              onClick={() => setExpandedColId(isExpanded ? null : col.id)}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </td>
                          <td style={{ fontWeight: 600 }}>{col.nome}</td>
                          <td>{formatCPF(col.cpf)}</td>
                          <td>{getCompanyDetails(col.empresa_id)}</td>
                          <td>
                            <span className={`badge ${col.status === "ativo" ? "badge-success" : "badge-danger"}`}>
                              {col.status === "ativo" ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: "600", color: cardsCount > 0 ? "var(--color-info)" : "var(--text-muted)" }}>
                              {cardsCount} cartões
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {col.status === "ativo" && (
                              <div style={{ display: "inline-flex", gap: "8px" }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                                  onClick={() => {
                                    setDepColId(col.id);
                                    setShowAddDepModal(true);
                                  }}
                                >
                                  + Dependente
                                </button>
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                                  onClick={() => handleInactivateColaborador(col.id)}
                                >
                                  Inativar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Detalhes / Dependentes (Acordeão) */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} style={styles.expandedRowBg}>
                              <div style={styles.expandedContent}>
                                <h4 style={styles.expandedTitle}>Membros Dependentes de {col.nome}</h4>
                                {colDeps.length === 0 ? (
                                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                    Nenhum dependente vinculado a este colaborador.
                                  </p>
                                ) : (
                                  <div style={styles.depsGrid}>
                                    {colDeps.map((dep) => {
                                      const depCardsCount = getActiveCardsCount(dep.id);
                                      return (
                                        <div key={dep.id} style={styles.depItemCard}>
                                          <div>
                                            <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{dep.nome}</p>
                                            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                              Status: {dep.status === "ativo" ? "Ativo" : "Inativo"} | Cartões: {depCardsCount}
                                            </p>
                                          </div>
                                          {dep.status === "ativo" && (
                                            <button
                                              style={styles.deleteDepBtn}
                                              onClick={() => handleInactivateDependente(dep.id)}
                                              title="Inativar dependente"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
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

      {/* Modal - Novo Colaborador */}
      {showAddColModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel fade-in" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Cadastrar Novo Colaborador</h3>
            </div>
            <form onSubmit={handleAddColaborador} style={styles.modalForm}>
              <div className="form-group">
                <label>Nome Completo</label>
                <input
                  type="text"
                  placeholder="ex: João da Silva"
                  required
                  value={colNome}
                  onChange={(e) => setColNome(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>CPF (apenas números)</label>
                <input
                  type="text"
                  placeholder="11 dígitos"
                  maxLength={11}
                  required
                  value={colCpf}
                  onChange={(e) => setColCpf(e.target.value.replace(/\D/g, ""))}
                />
              </div>

              <div className="form-group">
                <label>Empresa Destino</label>
                <select value={colEmpresaId} onChange={(e) => setColEmpresaId(e.target.value)} required>
                  <option value="">Selecione uma empresa...</option>
                  {empresas.map(e => (
                    <option key={e.id} value={e.id}>{e.razao_social}</option>
                  ))}
                </select>
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddColModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Novo Dependente */}
      {showAddDepModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel fade-in" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Adicionar Membro Dependente</h3>
            </div>
            <form onSubmit={handleAddDependente} style={styles.modalForm}>
              <div className="form-group">
                <label>Nome do Dependente</label>
                <input
                  type="text"
                  placeholder="Nome completo do dependente"
                  required
                  value={depNome}
                  onChange={(e) => setDepNome(e.target.value)}
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddDepModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Vincular Dependente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Importador XLSX (Edge Function) */}
      {showImportModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel fade-in" style={{ ...styles.modalContent, maxWidth: "600px" }}>
            <div style={styles.modalHeader}>
              <h3>Importador de Colaboradores em Lote (.xlsx)</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                Processado no servidor via Supabase Edge Functions
              </p>
            </div>

            <div className="form-group">
              <label>Empresa Destino da Carga</label>
              <select value={selectedImportEmpresaId} onChange={(e) => setSelectedImportEmpresaId(e.target.value)} required>
                <option value="">Selecione a empresa conveniada...</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.razao_social}</option>
                ))}
              </select>
            </div>

            {/* Drag and Drop Zone simulada com interatividade real */}
            <div style={styles.dropZone}>
              <FileUp size={36} color="var(--primary)" style={{ marginBottom: "10px" }} />
              <p style={{ fontWeight: "600", fontSize: "0.9rem" }}>Selecione o arquivo de dados</p>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Formatos aceitos: .xlsx, .csv
              </span>
              
              <div style={styles.importSimulateButtons}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                  disabled={importing}
                  onClick={() => triggerSimulatedImport("valido")}
                >
                  {importing ? "Importando..." : "Simular Carga Válida"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                  disabled={importing}
                  onClick={() => triggerSimulatedImport("erros")}
                >
                  {importing ? "Importando..." : "Simular Carga com Inconsistências"}
                </button>
              </div>
            </div>

            {/* Relatório de Retorno da Edge Function */}
            {importReport && (
              <div style={styles.reportArea}>
                <h4 style={styles.reportTitle}>Resultado do Processamento (Edge Function Report)</h4>
                
                <div style={styles.reportStats}>
                  <div style={styles.statBox}>
                    <CheckCircle size={16} color="var(--color-success)" />
                    <span>Importados: <strong>{importReport.importados}</strong></span>
                  </div>
                  <div style={styles.statBox}>
                    <AlertCircle size={16} color="var(--color-danger)" />
                    <span>Inconsistentes: <strong>{importReport.inconsistencias.length}</strong></span>
                  </div>
                </div>

                {importReport.inconsistencias.length > 0 && (
                  <div style={styles.inconsistenciesTableContainer}>
                    <table style={{ minWidth: "100%", fontSize: "0.8rem" }}>
                      <thead>
                        <tr>
                          <th style={{ padding: "8px" }}>Linha</th>
                          <th style={{ padding: "8px" }}>Nome</th>
                          <th style={{ padding: "8px" }}>CPF</th>
                          <th style={{ padding: "8px" }}>Inconsistência Identificada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importReport.inconsistencias.map((inc: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ padding: "8px" }}>{inc.linha}</td>
                            <td style={{ padding: "8px", fontWeight: "600" }}>{inc.nome || "-"}</td>
                            <td style={{ padding: "8px" }}>{inc.cpf || "-"}</td>
                            <td style={{ padding: "8px", color: "var(--color-danger)" }}>{inc.erro}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div style={styles.modalActions}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportModal(false);
                  setImportReport(null);
                }}
              >
                Fechar Painel
              </button>
            </div>
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
  alertBanner: {
    display: "block",
    width: "100%",
    padding: "12px",
    marginBottom: "20px"
  },
  filtersBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    padding: "16px 20px",
    marginBottom: "20px"
  },
  filterInputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    background: "var(--bg-input)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    paddingLeft: "12px",
    flex: 1,
    maxWidth: "360px"
  },
  filterInput: {
    border: "none",
    background: "transparent",
    padding: "10px 10px 10px 6px",
    boxShadow: "none"
  },
  filterSelect: {
    width: "auto",
    padding: "10px 16px"
  },
  expandButton: {
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    padding: "4px"
  },
  expandedRowBg: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderTop: "none"
  },
  expandedContent: {
    padding: "16px 40px"
  },
  expandedTitle: {
    fontSize: "0.85rem",
    textTransform: "uppercase",
    color: "var(--primary)",
    letterSpacing: "0.05em",
    marginBottom: "12px",
    fontWeight: "700"
  },
  depsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "12px"
  },
  depItemCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "var(--bg-hover)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 16px"
  },
  deleteDepBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px"
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
  },
  dropZone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: "2px dashed var(--border-color)",
    borderRadius: "var(--radius-md)",
    padding: "24px",
    textAlign: "center",
    background: "rgba(255, 255, 255, 0.01)",
    marginBottom: "20px",
    transition: "border-color 0.3s"
  },
  importSimulateButtons: {
    display: "flex",
    gap: "10px",
    marginTop: "16px"
  },
  reportArea: {
    background: "rgba(0, 0, 0, 0.2)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius-sm)",
    padding: "16px",
    marginTop: "10px",
    maxHeight: "260px",
    overflowY: "auto"
  },
  reportTitle: {
    fontSize: "0.85rem",
    fontWeight: "700",
    color: "#fff",
    marginBottom: "12px"
  },
  reportStats: {
    display: "flex",
    gap: "20px",
    marginBottom: "16px"
  },
  statBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.85rem"
  },
  inconsistenciesTableContainer: {
    borderRadius: "var(--radius-sm)",
    overflow: "hidden",
    border: "1px solid var(--border-color)",
    background: "var(--bg-main)"
  }
};
