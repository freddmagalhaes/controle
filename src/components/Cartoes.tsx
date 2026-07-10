import React, { useEffect, useState } from "react";
import { supabase, runEdgeFunction } from "../lib/supabaseClient";
import { CreditCard, Plus, FileText, RefreshCcw, Download, X } from "lucide-react";

export default function Cartoes() {
  const [cartoes, setCartoes] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [dependentes, setDependentes] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  
  // PDF download info
  const [pdfLink, setPdfLink] = useState<{ url: string; name: string } | null>(null);

  // Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Form State
  const [issueCompanyId, setIssueCompanyId] = useState("");
  const [issueOwnerType, setIssueOwnerType] = useState<"colaborador" | "dependente">("colaborador");
  const [issueOwnerId, setIssueOwnerId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Cartões
      const { data: cards } = await supabase.from("cartoes").select("*").order("created_at", { ascending: false });
      setCartoes(cards || []);

      // 2. Colaboradores
      const { data: cols } = await supabase.from("colaboradores").select("*").eq("status", "ativo");
      setColaboradores(cols || []);

      // 3. Dependentes
      const { data: deps } = await supabase.from("dependentes").select("*").eq("status", "ativo");
      setDependentes(deps || []);

      // 4. Empresas
      const { data: emps } = await supabase.from("empresas").select("*");
      setEmpresas(emps || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIssueCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (!issueOwnerId) {
      setError("Selecione o proprietário do cartão.");
      setSubmitting(false);
      return;
    }

    try {
      // Chama a Edge Function gerar-cartao
      const res = await runEdgeFunction("gerar-cartao", {
        donoId: issueOwnerId,
        tipoDono: issueOwnerType
      });

      if (res && res.success) {
        setSuccess(`Cartão ${formatCardNumber(res.cartao.numero_cartao)} emitido com sucesso!`);
        setShowIssueModal(false);
        setIssueOwnerId("");
        setIssueCompanyId("");
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || "Erro ao emitir cartão.");
    } finally {
      setSubmitting(false);
    }
  };

  // Alterar status de cartão individualmente
  const handleUpdateStatus = async (cardId: string, newStatus: "ativo" | "bloqueado" | "cancelado") => {
    setError(null);
    setSuccess(null);
    try {
      const { error: updateErr } = await supabase
        .from("cartoes")
        .update({ status: newStatus })
        .eq("id", cardId);

      if (updateErr) throw updateErr;

      setSuccess(`Status do cartão atualizado para '${newStatus}' com sucesso!`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Fluxo de reemissão: cancela o antigo e emite um novo
  const handleReissueCard = async (oldCard: any) => {
    if (!confirm(`Confirmar a reemissão do cartão para o portador? O cartão atual ${formatCardNumber(oldCard.numero_cartao)} será cancelado permanentemente.`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      // 1. Cancelar cartão atual
      const { error: cancelErr } = await supabase
        .from("cartoes")
        .update({ status: "cancelado" })
        .eq("id", oldCard.id);

      if (cancelErr) throw cancelErr;

      // 2. Chamar gerar-cartao Edge Function para emitir o novo
      const res = await runEdgeFunction("gerar-cartao", {
        donoId: oldCard.dono_id,
        tipoDono: oldCard.tipo_dono
      });

      if (res && res.success) {
        setSuccess(`Cartão reemitido com sucesso! Novo número: ${formatCardNumber(res.cartao.numero_cartao)}`);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || "Erro ao reemitir cartão.");
    } finally {
      setSubmitting(false);
    }
  };

  // Exportação em lote para PDF
  const handleExportPDF = async () => {
    if (selectedCards.length === 0) return;

    setError(null);
    setPdfLink(null);
    setSubmitting(true);

    try {
      const res = await runEdgeFunction("exportar-cartoes-pdf", {
        cartaoIds: selectedCards
      });

      if (res && res.success) {
        setPdfLink({ url: res.pdfUrl, name: res.fileName });
        setSuccess(`Layout PDF de ${selectedCards.length} cartões gerado com sucesso!`);
        setSelectedCards([]);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao exportar PDF.");
    } finally {
      setSubmitting(false);
    }
  };

  // Checkboxes
  const handleToggleSelect = (cardId: string) => {
    setSelectedCards(prev => 
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Selecionar apenas os ativos ou todos listados
      setSelectedCards(cartoes.map(c => c.id));
    } else {
      setSelectedCards([]);
    }
  };

  // Obter detalhes formatados
  const getOwnerDetails = (donoId: string, tipoDono: string) => {
    if (tipoDono === "colaborador") {
      const col = colaboradores.find(c => c.id === donoId);
      return col ? { nome: col.nome, empresa: getCompanyName(col.empresa_id) } : { nome: "Colaborador Inativo", empresa: "N/A" };
    } else {
      const dep = dependentes.find(d => d.id === donoId);
      if (dep) {
        const col = colaboradores.find(c => c.id === dep.colaborador_id);
        return { nome: `${dep.nome} (Dep.)`, empresa: col ? getCompanyName(col.empresa_id) : "N/A" };
      }
      return { nome: "Dependente Inativo", empresa: "N/A" };
    }
  };

  const getCompanyName = (empId: string) => {
    const emp = empresas.find(e => e.id === empId);
    return emp ? emp.razao_social : "Empresa Desconhecida";
  };

  const formatCardNumber = (num: string) => {
    return num.replace(/(\d{4})/g, "$1 ").trim();
  };

  // Filtrar elegíveis para emissão
  const getEligibleOwners = () => {
    if (!issueCompanyId) return [];

    if (issueOwnerType === "colaborador") {
      // Colaboradores da empresa que não possuem cartão ativo
      return colaboradores.filter(col => 
        col.empresa_id === issueCompanyId && 
        col.status === "ativo" &&
        !cartoes.some(card => card.dono_id === col.id && card.tipo_dono === "colaborador" && card.status === "ativo")
      );
    } else {
      // Dependentes de colaboradores dessa empresa que não possuem cartão ativo
      const colaboradoresDaEmpresaIds = colaboradores
        .filter(c => c.empresa_id === issueCompanyId)
        .map(c => c.id);

      return dependentes.filter(dep => 
        colaboradoresDaEmpresaIds.includes(dep.colaborador_id) && 
        dep.status === "ativo" &&
        !cartoes.some(card => card.dono_id === dep.id && card.tipo_dono === "dependente" && card.status === "ativo")
      );
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Cartões de Benefício</h1>
          <p>Emissão de vias digitais, controle de status de segurança e exportação para impressão</p>
        </div>

        <div style={styles.headerActions}>
          {selectedCards.length > 0 && (
            <button className="btn btn-primary" onClick={handleExportPDF} disabled={submitting}>
              {submitting ? <RefreshCcw className="spin" size={16} /> : <FileText size={16} />}
              Exportar PDF ({selectedCards.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowIssueModal(true)}>
            <Plus size={16} /> Emitir Cartão
          </button>
        </div>
      </div>

      {success && <div className="badge badge-success" style={styles.alertBanner}>{success}</div>}
      {error && <div className="badge badge-danger" style={styles.alertBanner}>{error}</div>}

      {/* Link de download do PDF se gerado */}
      {pdfLink && (
        <div style={styles.pdfDownloadBanner}>
          <Download size={20} color="var(--primary)" />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>PDF de Lote de Cartões Pronto</p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Arquivo: {pdfLink.name}</p>
          </div>
          <a href={pdfLink.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
            Baixar PDF
          </a>
          <button style={styles.closeBannerBtn} onClick={() => setPdfLink(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabela de Cartões */}
      <div className="glass-panel" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>Carregando dados dos cartões...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={selectedCards.length === cartoes.length && cartoes.length > 0}
                      onChange={handleSelectAll}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th>Número do Cartão</th>
                  <th>Titular</th>
                  <th>Empresa Conveniada</th>
                  <th>Status</th>
                  <th>Emitido Em</th>
                  <th style={{ textAlign: "right" }}>Gerenciamento</th>
                </tr>
              </thead>
              <tbody>
                {cartoes.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                      Nenhum cartão emitido no sistema.
                    </td>
                  </tr>
                ) : (
                  cartoes.map((card) => {
                    const owner = getOwnerDetails(card.dono_id, card.tipo_dono);
                    const isSelected = selectedCards.includes(card.id);

                    return (
                      <tr key={card.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(card.id)}
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                        <td>
                          <div style={styles.cardNumberWrapper}>
                            <CreditCard size={16} color="var(--primary)" />
                            <span style={styles.cardNumber}>{formatCardNumber(card.numero_cartao)}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{owner.nome}</td>
                        <td>{owner.empresa}</td>
                        <td>
                          <span
                            className={`badge ${
                              card.status === "ativo"
                                ? "badge-success"
                                : card.status === "bloqueado"
                                ? "badge-warning"
                                : "badge-danger"
                            }`}
                          >
                            {card.status}
                          </span>
                        </td>
                        <td>{new Date(card.created_at).toLocaleDateString("pt-BR")}</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "8px" }}>
                            {card.status === "ativo" && (
                              <>
                                <button
                                  className="btn btn-secondary"
                                  style={styles.actionBtn}
                                  onClick={() => handleUpdateStatus(card.id, "bloqueado")}
                                  title="Bloquear cartão temporariamente"
                                >
                                  Bloquear
                                </button>
                                <button
                                  className="btn btn-danger"
                                  style={styles.actionBtn}
                                  onClick={() => handleUpdateStatus(card.id, "cancelado")}
                                  title="Cancelar cartão permanentemente"
                                >
                                  Cancelar
                                </button>
                              </>
                            )}

                            {card.status === "bloqueado" && (
                              <button
                                className="btn btn-secondary"
                                style={{ ...styles.actionBtn, borderColor: "var(--color-success)" }}
                                onClick={() => handleUpdateStatus(card.id, "ativo")}
                              >
                                Desbloquear
                              </button>
                            )}

                            {card.status !== "cancelado" && (
                              <button
                                className="btn btn-secondary"
                                style={styles.actionBtn}
                                onClick={() => handleReissueCard(card)}
                                title="Reemitir nova via (cancela a atual)"
                              >
                                Reemitir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal - Emissão de Cartão */}
      {showIssueModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel fade-in" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Emitir Novo Cartão de Benefício</h3>
            </div>
            <form onSubmit={handleIssueCard} style={styles.modalForm}>
              <div className="form-group">
                <label>Selecione a Empresa Conveniada</label>
                <select value={issueCompanyId} onChange={(e) => {
                  setIssueCompanyId(e.target.value);
                  setIssueOwnerId("");
                }} required>
                  <option value="">Selecione...</option>
                  {empresas.map(e => (
                    <option key={e.id} value={e.id}>{e.razao_social}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tipo de Titularidade</label>
                <select value={issueOwnerType} onChange={(e: any) => {
                  setIssueOwnerType(e.target.value);
                  setIssueOwnerId("");
                }}>
                  <option value="colaborador">Colaborador Titular</option>
                  <option value="dependente">Dependente</option>
                </select>
              </div>

              <div className="form-group">
                <label>Portador Beneficiário Elegível</label>
                <select value={issueOwnerId} onChange={(e) => setIssueOwnerId(e.target.value)} required disabled={!issueCompanyId}>
                  <option value="">Selecione o beneficiário...</option>
                  {getEligibleOwners().map((o: any) => (
                    <option key={o.id} value={o.id}>
                      {o.nome} ({o.cpf ? `CPF: ${o.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.***.***-$4")}` : "Dependente"})
                    </option>
                  ))}
                </select>
                {issueCompanyId && getEligibleOwners().length === 0 && (
                  <span style={{ fontSize: "0.75rem", color: "var(--color-warning)", marginTop: "4px" }}>
                    Nenhum portador elegível (sem cartão ativo) encontrado para os filtros selecionados.
                  </span>
                )}
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowIssueModal(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !issueOwnerId}>
                  {submitting ? <RefreshCcw className="spin" size={16} /> : "Gerar Via Ativa"}
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
  alertBanner: {
    display: "block",
    width: "100%",
    padding: "12px",
    marginBottom: "20px"
  },
  pdfDownloadBanner: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    background: "rgba(59, 130, 246, 0.08)",
    border: "1px solid rgba(59, 130, 246, 0.25)",
    borderRadius: "var(--radius-md)",
    marginBottom: "25px",
    animation: "fadeIn 0.3s ease-out"
  },
  closeBannerBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px"
  },
  cardNumberWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  cardNumber: {
    fontFamily: "monospace",
    fontWeight: "600",
    letterSpacing: "0.05em"
  },
  actionBtn: {
    padding: "6px 12px",
    fontSize: "0.8rem"
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
