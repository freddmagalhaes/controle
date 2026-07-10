import { createClient } from "@supabase/supabase-js";
import supabaseSimulator from "./supabaseSimulator";

// Obter as variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Determinar se estamos em modo simulado
export const isSimulated = !supabaseUrl || !supabaseAnonKey || supabaseUrl === "YOUR_SUPABASE_URL";

if (isSimulated) {
  console.warn(
    "%c[Supabase Simulado]%c O sistema de banco de dados e autenticação está rodando localmente (localStorage). Para conectar a um projeto Supabase real, configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local",
    "color: #3ecf8e; font-weight: bold; background: #0c1020; padding: 4px 8px; border-radius: 4px;",
    "color: inherit;"
  );
}

// Inicializar cliente real se configurado
const realSupabase = !isSimulated ? createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * Cliente Unificado do Supabase.
 * Fornece métodos compatíveis com a sintaxe do Supabase, mas redireciona
 * para o local storage e simula triggers/restrições RLS caso não haja conexão.
 */
export const supabase = {
  auth: {
    getUser: async () => {
      if (isSimulated) {
        const u = supabaseSimulator.getCurrentUser();
        return { data: { user: u ? { id: u.id, email: `${u.role}@sistema.com`, user_metadata: { nome: u.nome, role: u.role } } : null }, error: null };
      }
      return realSupabase!.auth.getUser();
    },
    signInWithPassword: async ({ email, password }: any) => {
      if (isSimulated) {
        // Simulação simples: se email for admin@sistema.com ou operador@sistema.com
        const role = email.startsWith("admin") ? "admin" : "operador";
        const users = supabaseSimulator.select<any>("usuarios");
        const found = users.find((u: any) => u.role === role);
        if (!found) {
          throw new Error("Usuário simulado correspondente não encontrado");
        }
        // Retorna sucesso para simular envio de OTP (MFA)
        return { data: { user: { id: found.id, email, user_metadata: { nome: found.nome, role: found.role } }, session: { access_token: "mock-token" } }, error: null };
      }
      return realSupabase!.auth.signInWithPassword({ email, password });
    },
    signOut: async () => {
      if (isSimulated) {
        supabaseSimulator.setCurrentUser(null);
        return { error: null };
      }
      return realSupabase!.auth.signOut();
    }
  },

  // Simulação simplificada de consultas PostgREST do Supabase
  from: (table: string) => {
    if (!isSimulated) {
      return realSupabase!.from(table);
    }

    // Tradução de nomes de tabela do Supabase real para o simulador
    const dbTable = 
      table === "logs_auditoria" ? "logs" : 
      table === "usuarios_perfil" ? "usuarios" : 
      table;

    // Builder simulado para consultas fluentes
    const builder = {
      data: [] as any[],
      error: null as any,

      select: (_columns: string = "*", _options: any = {}) => {
        try {
          builder.data = supabaseSimulator.select(dbTable);
        } catch (e: any) {
          builder.error = e;
        }
        return builder;
      },

      insert: (rows: any) => {
        try {
          if (Array.isArray(rows)) {
            builder.data = rows.map(r => supabaseSimulator.insert(dbTable, r));
          } else {
            builder.data = [supabaseSimulator.insert(dbTable, rows)];
          }
        } catch (e: any) {
          builder.error = e;
        }
        return builder;
      },

      update: (updates: any) => {
        // Retorna um objeto com filter para executar o update
        return {
          eq: (column: string, value: any) => {
            try {
              // Para simplificar, buscamos o ID
              if (column === "id") {
                const updated = supabaseSimulator.update(dbTable, value, updates);
                builder.data = [updated];
              } else {
                // Modifica múltiplos
                const all = supabaseSimulator.select<any>(dbTable);
                const updatedRows = all.map(row => {
                  if (row[column] === value) {
                    return supabaseSimulator.update(dbTable, row.id, updates);
                  }
                  return row;
                });
                builder.data = updatedRows;
              }
            } catch (e: any) {
              builder.error = e;
            }
            return builder;
          }
        };
      },

      // Filtros simples no select simulado
      eq: (column: string, value: any) => {
        if (!builder.error) {
          builder.data = builder.data.filter(row => row[column] === value);
        }
        return builder;
      },

      in: (column: string, values: any[]) => {
        if (!builder.error) {
          builder.data = builder.data.filter(row => values.includes(row[column]));
        }
        return builder;
      },

      order: (column: string, { ascending = true } = {}) => {
        if (!builder.error) {
          builder.data.sort((a, b) => {
            const valA = a[column];
            const valB = b[column];
            if (valA < valB) return ascending ? -1 : 1;
            if (valA > valB) return ascending ? 1 : -1;
            return 0;
          });
        }
        return builder;
      },

      // Métodos para encadear retorno compatível com promises
      then: (onfulfilled?: (value: any) => any) => {
        const result = { data: builder.data, error: builder.error };
        // Limpar estado
        builder.data = [];
        builder.error = null;
        return Promise.resolve(result).then(onfulfilled);
      }
    };

    return builder;
  }
};

/**
 * Função utilitária unificada para chamar Edge Functions do Supabase
 */
export async function runEdgeFunction(functionName: string, body: any = {}, method: "GET" | "POST" = "POST"): Promise<any> {
  if (isSimulated) {
    // Atraso artificial de 600ms para simular latência de rede
    await new Promise(resolve => setTimeout(resolve, 600));

    switch (functionName) {
      case "importar-colaboradores":
        return supabaseSimulator.edge_importarColaboradores(body.colaboradores, body.empresaId);
      case "gerar-cartao":
        const cartao = await supabaseSimulator.edge_gerarCartao(body.donoId, body.tipoDono);
        return { success: true, cartao };
      case "exportar-cartoes-pdf":
        return supabaseSimulator.edge_exportarCartoesPdf(body.cartaoIds);
      case "dashboard-indicadores":
        return supabaseSimulator.edge_dashboardIndicadores();
      default:
        throw new Error(`Edge Function ${functionName} não implementada no simulador.`);
    }
  }

  // Realizar requisição real do Supabase
  const { data, error } = await realSupabase!.functions.invoke(functionName, {
    method,
    body
  });

  if (error) throw error;
  return data;
}
export default supabase;
