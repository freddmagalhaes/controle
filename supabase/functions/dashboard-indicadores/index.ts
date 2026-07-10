import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const client = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Total de empresas ativas
    const { count: empresasAtivas, error: errEmpresa } = await client
      .from("empresas")
      .select("*", { count: "exact", head: true })
      .eq("status", "ativa");

    if (errEmpresa) throw errEmpresa;

    // 2. Contratos a vencer e vencidos
    const { count: contratosAVencer, error: errContratoAVencer } = await client
      .from("contratos")
      .select("*", { count: "exact", head: true })
      .eq("status", "a_vencer");

    if (errContratoAVencer) throw errContratoAVencer;

    const { count: contratosVencidos, error: errContratoVencidos } = await client
      .from("contratos")
      .select("*", { count: "exact", head: true })
      .eq("status", "vencido");

    if (errContratoVencidos) throw errContratoVencidos;

    // 3. Contagem de cartões por status
    const { data: cartoesData, error: errCartoes } = await client
      .from("cartoes")
      .select("status");

    if (errCartoes) throw errCartoes;

    const cartoesPorStatus = {
      ativo: 0,
      bloqueado: 0,
      cancelado: 0,
      reemitido: 0,
    };

    (cartoesData || []).forEach((c: { status: string }) => {
      // @ts-ignore
      if (cartoesPorStatus[c.status] !== undefined) {
        // @ts-ignore
        cartoesPorStatus[c.status]++;
      }
    });

    const totalCartoes = (cartoesData || []).length;

    // 4. Colaboradores totais
    const { count: colaboradoresAtivos, error: errColaboradores } = await client
      .from("colaboradores")
      .select("*", { count: "exact", head: true })
      .eq("status", "ativo");

    if (errColaboradores) throw errColaboradores;

    // 5. Evolução mensal simplificada (Histórico de criação de cartões nos últimos 6 meses)
    // Em produção, isso pode ser uma query complexa ou VIEW no PostgreSQL.
    // Simulamos aqui agrupando os dados dos últimos cartões criados.
    const { data: evolucaoCartoes, error: errEvolucao } = await client
      .from("cartoes")
      .select("created_at");

    if (errEvolucao) throw errEvolucao;

    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const evolucaoMensalMap: Record<string, number> = {};

    // Inicializa os últimos 6 meses com zero
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const chave = `${meses[d.getMonth()]}/${d.getFullYear().toString().substring(2)}`;
      evolucaoMensalMap[chave] = 0;
    }

    (evolucaoCartoes || []).forEach((c: { created_at: string }) => {
      const dataCriacao = new Date(c.created_at);
      const chave = `${meses[dataCriacao.getMonth()]}/${dataCriacao.getFullYear().toString().substring(2)}`;
      if (evolucaoMensalMap[chave] !== undefined) {
        evolucaoMensalMap[chave]++;
      }
    });

    const evolucaoMensal = Object.entries(evolucaoMensalMap).map(([mes, total]) => ({
      mes,
      total,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          kpis: {
            empresasAtivas: empresasAtivas || 0,
            contratosAVencer: contratosAVencer || 0,
            contratosVencidos: contratosVencidos || 0,
            colaboradoresAtivos: colaboradoresAtivos || 0,
            totalCartoes,
          },
          cartoesPorStatus,
          evolucaoMensal,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
