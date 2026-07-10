// ==========================================
// SIMULADOR DO SUPABASE NO CLIENT-SIDE
// Simula tabelas, triggers, RLS e Edge Functions no localStorage
// ==========================================

export interface UsuarioPerfil {
  id: string;
  nome: string;
  role: "admin" | "operador";
  created_at: string;
}

export interface Empresa {
  id: string;
  razao_social: string;
  cnpj: string;
  status: "ativa" | "inativa";
  created_at: string;
}

export interface Contrato {
  id: string;
  empresa_id: string;
  data_inicio: string;
  data_fim: string;
  status: "ativo" | "a_vencer" | "vencido";
  created_at: string;
}

export interface Colaborador {
  id: string;
  empresa_id: string;
  nome: string;
  cpf: string;
  status: "ativo" | "inativo";
  created_at: string;
  data_inativacao?: string;
}

export interface Dependente {
  id: string;
  colaborador_id: string;
  nome: string;
  status: "ativo" | "inativo";
  created_at: string;
}

export interface Cartao {
  id: string;
  numero_cartao: string;
  dono_id: string;
  tipo_dono: "colaborador" | "dependente";
  status: "ativo" | "bloqueado" | "cancelado" | "reemitido";
  created_at: string;
}

export interface LogAuditoria {
  id: string;
  usuario_id: string | null;
  tabela: string;
  acao: "INSERT" | "UPDATE" | "DELETE";
  dados: any;
  created_at: string;
}

// Inicialização com dados iniciais se estiver vazio
const DEFAULT_USUARIOS: UsuarioPerfil[] = [
  { id: "d3b07384-d113-4956-a5db-e7c5b62b10a1", nome: "Carlos Silva (Admin)", role: "admin", created_at: new Date().toISOString() },
  { id: "d3b07384-d113-4956-a5db-e7c5b62b10a2", nome: "Mariana Souza (Operador)", role: "operador", created_at: new Date().toISOString() },
];

const DEFAULT_EMPRESAS: Empresa[] = [
  { id: "emp-1", razao_social: "ACME Corp Beneficios LTDA", cnpj: "12345678000199", status: "ativa", created_at: new Date(2026, 0, 15).toISOString() },
  { id: "emp-2", razao_social: "Tech Solucoes e Servicos", cnpj: "98765432000188", status: "ativa", created_at: new Date(2026, 1, 10).toISOString() },
  { id: "emp-3", razao_social: "Inativa Empreendimentos", cnpj: "11223344000155", status: "inativa", created_at: new Date(2025, 6, 20).toISOString() },
];

const DEFAULT_CONTRATOS: Contrato[] = [
  { id: "cont-1", empresa_id: "emp-1", data_inicio: "2026-01-15", data_fim: "2027-01-15", status: "ativo", created_at: new Date(2026, 0, 15).toISOString() },
  { id: "cont-2", empresa_id: "emp-2", data_inicio: "2026-02-10", data_fim: "2026-07-31", status: "a_vencer", created_at: new Date(2026, 1, 10).toISOString() }, // Vence em breve considerando a data de Julho 2026
  { id: "cont-3", empresa_id: "emp-3", data_inicio: "2025-06-20", data_fim: "2026-06-20", status: "vencido", created_at: new Date(2025, 5, 20).toISOString() },
];

const DEFAULT_COLABORADORES: Colaborador[] = [
  { id: "col-1", empresa_id: "emp-1", nome: "Ana Paula Oliveira", cpf: "12345678901", status: "ativo", created_at: new Date(2026, 0, 16).toISOString() },
  { id: "col-2", empresa_id: "emp-1", nome: "Bruno Medeiros", cpf: "98765432100", status: "ativo", created_at: new Date(2026, 0, 20).toISOString() },
  { id: "col-3", empresa_id: "emp-2", nome: "Clara Santos Cruz", cpf: "45678912300", status: "ativo", created_at: new Date(2026, 1, 11).toISOString() },
];

const DEFAULT_DEPENDENTES: Dependente[] = [
  { id: "dep-1", colaborador_id: "col-1", nome: "Pedro Oliveira (Filho)", status: "ativo", created_at: new Date(2026, 0, 16).toISOString() },
  { id: "dep-2", colaborador_id: "col-2", nome: "Julia Medeiros (Cônjuge)", status: "ativo", created_at: new Date(2026, 0, 20).toISOString() },
];

const DEFAULT_CARTOES: Cartao[] = [
  { id: "card-1", numero_cartao: "6032123456789012", dono_id: "col-1", tipo_dono: "colaborador", status: "ativo", created_at: new Date(2026, 0, 17).toISOString() },
  { id: "card-2", numero_cartao: "6032123456789020", dono_id: "dep-1", tipo_dono: "dependente", status: "ativo", created_at: new Date(2026, 0, 17).toISOString() },
  { id: "card-3", numero_cartao: "6032987654321010", dono_id: "col-2", tipo_dono: "colaborador", status: "bloqueado", created_at: new Date(2026, 0, 21).toISOString() },
];

class SupabaseSimulatorStore {
  constructor() {
    this.initDatabase();
    this.runCronContractsUpdate();
  }

  private initDatabase() {
    if (!localStorage.getItem("sim_usuarios")) localStorage.setItem("sim_usuarios", JSON.stringify(DEFAULT_USUARIOS));
    if (!localStorage.getItem("sim_empresas")) localStorage.setItem("sim_empresas", JSON.stringify(DEFAULT_EMPRESAS));
    if (!localStorage.getItem("sim_contratos")) localStorage.setItem("sim_contratos", JSON.stringify(DEFAULT_CONTRATOS));
    if (!localStorage.getItem("sim_colaboradores")) localStorage.setItem("sim_colaboradores", JSON.stringify(DEFAULT_COLABORADORES));
    if (!localStorage.getItem("sim_dependentes")) localStorage.setItem("sim_dependentes", JSON.stringify(DEFAULT_DEPENDENTES));
    if (!localStorage.getItem("sim_cartoes")) localStorage.setItem("sim_cartoes", JSON.stringify(DEFAULT_CARTOES));
    if (!localStorage.getItem("sim_logs")) localStorage.setItem("sim_logs", JSON.stringify([]));
    
    // Auth Session
    if (!localStorage.getItem("sim_session_user")) {
      // Começa deslogado por padrão
      localStorage.setItem("sim_session_user", "null");
    }
  }

  // Getters auxiliares
  private getTable<T>(name: string): T[] {
    return JSON.parse(localStorage.getItem(`sim_${name}`) || "[]");
  }

  private setTable<T>(name: string, data: T[]) {
    localStorage.setItem(`sim_${name}`, JSON.stringify(data));
  }

  // Obter usuário logado atual
  getCurrentUser(): UsuarioPerfil | null {
    const userJson = localStorage.getItem("sim_session_user");
    if (!userJson || userJson === "null") return null;
    return JSON.parse(userJson);
  }

  setCurrentUser(user: UsuarioPerfil | null) {
    localStorage.setItem("sim_session_user", user ? JSON.stringify(user) : "null");
  }

  // Verificação de RLS
  private checkRLS(action: "select" | "insert" | "update" | "delete", table: string) {
    // Permitir select na tabela de usuarios para viabilizar o fluxo de login/MFA simulado
    if (table === "usuarios" && action === "select") {
      return;
    }

    const user = this.getCurrentUser();
    if (!user) {
      throw new Error(`[RLS Error] Usuário não autenticado. Ação '${action}' negada na tabela '${table}'.`);
    }

    if (table === "logs" && user.role !== "admin") {
      throw new Error(`[RLS Error] Apenas administradores podem ler os logs de auditoria.`);
    }

    if ((table === "empresas" || table === "contratos") && action !== "select" && user.role !== "admin") {
      throw new Error(`[RLS Error] Operadores não têm permissão para criar ou modificar empresas e contratos.`);
    }
  }

  // Simular Trigger de Auditoria no PostgreSQL
  private executeAuditTrigger(table: string, action: "INSERT" | "UPDATE" | "DELETE", oldRow: any, newRow: any) {
    if (table !== "colaboradores" && table !== "contratos" && table !== "cartoes") {
      return; // Apenas auditar essas tabelas conforme solicitado
    }

    const logs = this.getTable<LogAuditoria>("logs");
    const user = this.getCurrentUser();

    const dadosSnapshot: any = {};
    if (action === "INSERT") dadosSnapshot.depois = newRow;
    else if (action === "UPDATE") dadosSnapshot.antes = oldRow; // salva antigo/novo
    if (action === "UPDATE") dadosSnapshot.depois = newRow;
    else if (action === "DELETE") dadosSnapshot.antes = oldRow;

    const newLog: LogAuditoria = {
      id: "log-" + Math.random().toString(36).substring(2, 11),
      usuario_id: user ? user.id : null,
      tabela: table,
      acao: action,
      dados: dadosSnapshot,
      created_at: new Date().toISOString()
    };

    logs.unshift(newLog); // insere no início
    this.setTable("logs", logs);
  }

  // Simular Trigger de Inativação Lógica
  private executeInactivationTrigger(table: string, oldRow: any, newRow: any) {
    if (table === "colaboradores") {
      // Se alterou para inativo
      if (newRow.status === "inativo" && oldRow.status !== "inativo") {
        // 1. Inativar dependentes
        const dependentes = this.getTable<Dependente>("dependentes");
        const dependentesAtualizados = dependentes.map(dep => {
          if (dep.colaborador_id === newRow.id && dep.status === "ativo") {
            const updatedDep = { ...dep, status: "inativo" as const };
            // Cascade inativação de cartão do dependente
            this.inactivateCardsOfOwner(dep.id, "dependente");
            return updatedDep;
          }
          return dep;
        });
        this.setTable("dependentes", dependentesAtualizados);

        // 2. Inativar cartões do colaborador
        this.inactivateCardsOfOwner(newRow.id, "colaborador");
      }
    } else if (table === "dependentes") {
      if (newRow.status === "inativo" && oldRow.status !== "inativo") {
        // Inativar cartões do dependente
        this.inactivateCardsOfOwner(newRow.id, "dependente");
      }
    }
  }

  private inactivateCardsOfOwner(donoId: string, tipoDono: "colaborador" | "dependente") {
    const cartoes = this.getTable<Cartao>("cartoes");
    const cartoesAtualizados = cartoes.map(card => {
      if (card.dono_id === donoId && card.tipo_dono === tipoDono && card.status === "ativo") {
        const oldCard = { ...card };
        const newCard = { ...card, status: "bloqueado" as const };
        this.executeAuditTrigger("cartoes", "UPDATE", oldCard, newCard);
        return newCard;
      }
      return card;
    });
    this.setTable("cartoes", cartoesAtualizados);
  }

  // Simulação de Cron Job do Banco (pg_cron)
  runCronContractsUpdate() {
    const contratos = this.getTable<Contrato>("contratos");
    const hoje = new Date();
    // Normalizar para meia noite local para comparação
    const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    const contratosAtualizados = contratos.map(c => {
      const dataFim = new Date(c.data_fim);
      let novoStatus = c.status;

      // Se data_fim anterior a hoje -> vencido
      if (dataFim < dataHoje) {
        novoStatus = "vencido";
      } else {
        // Diferença em dias
        const diffTime = dataFim.getTime() - dataHoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          novoStatus = "a_vencer";
        } else {
          novoStatus = "ativo";
        }
      }

      if (c.status !== novoStatus) {
        const oldContrato = { ...c };
        const newContrato = { ...c, status: novoStatus };
        this.executeAuditTrigger("contratos", "UPDATE", oldContrato, newContrato);
        return newContrato;
      }
      return c;
    });

    this.setTable("contratos", contratosAtualizados);
  }

  // ==========================================
  // OPERAÇÕES DO BANCO DE DADOS (CRUD)
  // ==========================================

  // Select geral
  select<T>(table: string): T[] {
    this.checkRLS("select", table);
    return this.getTable<T>(table);
  }

  // Insert genérico
  insert<T extends { id?: string }>(table: string, row: Partial<T>): T {
    this.checkRLS("insert", table);
    const data = this.getTable<any>(table);
    
    const newRow = {
      id: row.id || `${table.substring(0, 3)}-` + Math.random().toString(36).substring(2, 11),
      ...row,
      created_at: new Date().toISOString()
    } as unknown as T;

    data.push(newRow);
    this.setTable(table, data);
    
    // Trigger de Auditoria para INSERT
    this.executeAuditTrigger(table, "INSERT", null, newRow);
    
    return newRow;
  }

  // Update genérico
  update<T extends { id: string }>(table: string, id: string, updates: Partial<T>): T {
    this.checkRLS("update", table);
    const data = this.getTable<any>(table);
    const index = data.findIndex((item: any) => item.id === id);

    if (index === -1) {
      throw new Error(`Registro com ID ${id} não encontrado na tabela ${table}`);
    }

    const oldRow = { ...data[index] };
    const newRow = { ...oldRow, ...updates };

    // Se inativando colaborador, seta a data
    if (table === "colaboradores" && newRow.status === "inativo" && oldRow.status !== "inativo") {
      newRow.data_inativacao = new Date().toISOString();
    }

    data[index] = newRow;
    this.setTable(table, data);

    // Executa Triggers antes de propagar auditoria
    this.executeInactivationTrigger(table, oldRow, newRow);

    // Trigger de Auditoria para UPDATE
    this.executeAuditTrigger(table, "UPDATE", oldRow, newRow);

    return newRow;
  }

  // ==========================================
  // EDGE FUNCTIONS SIMULADAS
  // ==========================================

  // 1. IMPORTAR COLABORADORES
  async edge_importarColaboradores(colaboradores: any[], empresaId: string) {
    const todosColaboradores = this.getTable<Colaborador>("colaboradores");
    const empresas = this.getTable<Empresa>("empresas");

    const empresa = empresas.find(e => e.id === empresaId);
    if (!empresa) {
      throw new Error("Empresa não encontrada");
    }

    const inconsistencias: any[] = [];
    let importadosCount = 0;
    const cpfsNoLote: string[] = [];

    // Função de validação de CPF básica
    const validarCPF = (cpf: string): boolean => {
      const cleanCPF = cpf.replace(/\D/g, "");
      if (cleanCPF.length !== 11) return false;
      if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

      let soma = 0;
      let resto;
      for (let i = 1; i <= 9; i++) soma += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
      resto = (soma * 10) % 11;
      if (resto === 10 || resto === 11) resto = 0;
      if (resto !== parseInt(cleanCPF.substring(9, 10))) return false;

      soma = 0;
      for (let i = 1; i <= 10; i++) soma += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
      resto = (soma * 10) % 11;
      if (resto === 10 || resto === 11) resto = 0;
      if (resto !== parseInt(cleanCPF.substring(10, 11))) return false;

      return true;
    };

    for (let i = 0; i < colaboradores.length; i++) {
      const row = colaboradores[i];
      const linha = i + 2; // Cabeçalho é linha 1
      const nome = row.Nome || row.nome || "";
      const cpf = row.CPF || row.cpf || "";
      const cleanCpf = cpf.toString().replace(/\D/g, "");

      if (!nome || nome.trim() === "") {
        inconsistencias.push({ linha, nome, cpf, erro: "Nome em branco" });
        continue;
      }

      if (!cleanCpf || !validarCPF(cleanCpf)) {
        inconsistencias.push({ linha, nome, cpf, erro: "CPF inválido" });
        continue;
      }

      if (cpfsNoLote.includes(cleanCpf)) {
        inconsistencias.push({ linha, nome, cpf, erro: "CPF duplicado no arquivo enviado" });
        continue;
      }

      // Verificar se já existe no banco
      const existeBanco = todosColaboradores.some(c => c.cpf === cleanCpf);
      if (existeBanco) {
        inconsistencias.push({ linha, nome, cpf, erro: "CPF já cadastrado no sistema (banco)" });
        continue;
      }

      // Válido, insere no lote
      cpfsNoLote.push(cleanCpf);
      this.insert<Colaborador>("colaboradores", {
        empresa_id: empresaId,
        nome: nome.trim(),
        cpf: cleanCpf,
        status: "ativo"
      });
      importadosCount++;
    }

    return {
      success: true,
      importados: importadosCount,
      totalProcessado: colaboradores.length,
      inconsistencias
    };
  }

  // 2. GERAR CARTÃO
  async edge_gerarCartao(donoId: string, tipoDono: "colaborador" | "dependente") {
    // Validação
    if (tipoDono === "colaborador") {
      const col = this.getTable<Colaborador>("colaboradores").find(c => c.id === donoId);
      if (!col || col.status !== "ativo") {
        throw new Error("Colaborador não encontrado ou inativo");
      }
    } else {
      const dep = this.getTable<Dependente>("dependentes").find(d => d.id === donoId);
      if (!dep || dep.status !== "ativo") {
        throw new Error("Dependente não encontrado ou inativo");
      }
    }

    let numeroCartao = "";
    let attempts = 0;
    const cartoes = this.getTable<Cartao>("cartoes");

    while (attempts < 10) {
      attempts++;
      const randomDigits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
      numeroCartao = `6032${randomDigits}`;
      const existe = cartoes.some(c => c.numero_cartao === numeroCartao);
      if (!existe) break;
    }

    const novoCartao = this.insert<Cartao>("cartoes", {
      numero_cartao: numeroCartao,
      dono_id: donoId,
      tipo_dono: tipoDono,
      status: "ativo"
    });

    return novoCartao;
  }

  // 3. EXPORTAR CARTÕES PDF
  async edge_exportarCartoesPdf(cartaoIds: string[]) {
    const cartoes = this.getTable<Cartao>("cartoes");
    const colaboradores = this.getTable<Colaborador>("colaboradores");
    const dependentes = this.getTable<Dependente>("dependentes");
    const empresas = this.getTable<Empresa>("empresas");

    const exportados = [];
    for (const id of cartaoIds) {
      const c = cartoes.find(card => card.id === id);
      if (!c) continue;

      let nomeDono = "";
      let empresaNome = "";

      if (c.tipo_dono === "colaborador") {
        const col = colaboradores.find(item => item.id === c.dono_id);
        if (col) {
          nomeDono = col.nome;
          const emp = empresas.find(e => e.id === col.empresa_id);
          if (emp) empresaNome = emp.razao_social;
        }
      } else {
        const dep = dependentes.find(item => item.id === c.dono_id);
        if (dep) {
          nomeDono = dep.nome;
          const col = colaboradores.find(item => item.id === dep.colaborador_id);
          if (col) {
            const emp = empresas.find(e => e.id === col.empresa_id);
            if (emp) empresaNome = emp.razao_social;
          }
        }
      }

      exportados.push({
        numero: c.numero_cartao,
        dono: nomeDono,
        tipo: c.tipo_dono,
        empresa: empresaNome,
        status: c.status
      });
    }

    // Criar um PDF simulado (vamos retornar um arquivo Blob com o JSON formatado para download, simulando a URL do PDF)
    const blobContent = JSON.stringify(exportados, null, 2);
    const blob = new Blob([blobContent], { type: "application/json" });
    const mockUrl = URL.createObjectURL(blob);

    return {
      success: true,
      pdfUrl: mockUrl,
      fileName: `lote_cartoes_${Date.now()}.pdf`,
      rawContent: exportados // Para a UI desenhar visualmente
    };
  }

  // 4. DASHBOARD INDICADORES
  async edge_dashboardIndicadores() {
    const empresas = this.getTable<Empresa>("empresas");
    const contratos = this.getTable<Contrato>("contratos");
    const colaboradores = this.getTable<Colaborador>("colaboradores");
    const cartoes = this.getTable<Cartao>("cartoes");

    const empresasAtivas = empresas.filter(e => e.status === "ativa").length;
    const contratosAVencer = contratos.filter(c => c.status === "a_vencer").length;
    const contratosVencidos = contratos.filter(c => c.status === "vencido").length;
    const colaboradoresAtivos = colaboradores.filter(c => c.status === "ativo").length;

    const cartoesPorStatus = {
      ativo: cartoes.filter(c => c.status === "ativo").length,
      bloqueado: cartoes.filter(c => c.status === "bloqueado").length,
      cancelado: cartoes.filter(c => c.status === "cancelado").length,
      reemitido: cartoes.filter(c => c.status === "reemitido").length,
    };

    // Montar os meses para evolução mensal (últimos 6 meses)
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const evolucaoMensalMap: Record<string, number> = {};
    const hoje = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const chave = `${meses[d.getMonth()]}/${d.getFullYear().toString().substring(2)}`;
      evolucaoMensalMap[chave] = 0;
    }

    cartoes.forEach(c => {
      const d = new Date(c.created_at);
      const chave = `${meses[d.getMonth()]}/${d.getFullYear().toString().substring(2)}`;
      if (evolucaoMensalMap[chave] !== undefined) {
        evolucaoMensalMap[chave]++;
      }
    });

    const evolucaoMensal = Object.entries(evolucaoMensalMap).map(([mes, total]) => ({
      mes,
      total
    }));

    return {
      success: true,
      data: {
        kpis: {
          empresasAtivas,
          contratosAVencer,
          contratosVencidos,
          colaboradoresAtivos,
          totalCartoes: cartoes.length
        },
        cartoesPorStatus,
        evolucaoMensal
      }
    };
  }
}

export const supabaseSimulator = new SupabaseSimulatorStore();
export default supabaseSimulator;
