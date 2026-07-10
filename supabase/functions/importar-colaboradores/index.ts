import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Headers CORS para permitir acesso do browser
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ColaboradorImportInput {
  nome: string;
  cpf: string;
  empresa_cnpj: string;
}

serve(async (req) => {
  // Trata preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const client = createClient(supabaseUrl, supabaseAnonKey);

    // Espera receber um JSON com a lista de colaboradores (já extraída do XLSX no client-side ou enviada diretamente)
    const { colaboradores, empresaId } = await req.json() as { 
      colaboradores: ColaboradorImportInput[];
      empresaId: string;
    };

    if (!empresaId) {
      return new Response(JSON.stringify({ error: "empresaId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inconsistencias: Array<{ linha: number; nome: string; cpf: string; erro: string }> = [];
    const cpfsParaInserir: string[] = [];
    const validos: ColaboradorImportInput[] = [];

    // Função de validação de CPF básica
    const validarCPF = (cpf: string): boolean => {
      const cleanCPF = cpf.replace(/\D/g, "");
      if (cleanCPF.length !== 11) return false;
      if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // CPFs com todos dígitos iguais

      let soma = 0;
      let resto;
      for (let i = 1; i <= 9; i++) {
        soma = soma + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
      }
      resto = (soma * 10) % 11;
      if (resto === 10 || resto === 11) resto = 0;
      if (resto !== parseInt(cleanCPF.substring(9, 10))) return false;

      soma = 0;
      for (let i = 1; i <= 10; i++) {
        soma = soma + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
      }
      resto = (soma * 10) % 11;
      if (resto === 10 || resto === 11) resto = 0;
      if (resto !== parseInt(cleanCPF.substring(10, 11))) return false;

      return true;
    };

    // 1. Validar estrutura e CPFs no lote enviado
    for (let i = 0; i < colaboradores.length; i++) {
      const col = colaboradores[i];
      const linha = i + 1;
      const cleanCpf = col.cpf ? col.cpf.replace(/\D/g, "") : "";

      if (!col.nome || col.nome.trim() === "") {
        inconsistencias.push({ linha, nome: col.nome || "", cpf: col.cpf || "", erro: "Nome vazio ou inválido" });
        continue;
      }

      if (!cleanCpf || !validarCPF(cleanCpf)) {
        inconsistencias.push({ linha, nome: col.nome, cpf: col.cpf || "", erro: "CPF inválido" });
        continue;
      }

      // Evitar duplicidades no próprio lote enviado
      if (cpfsParaInserir.includes(cleanCpf)) {
        inconsistencias.push({ linha, nome: col.nome, cpf: col.cpf, erro: "CPF duplicado no arquivo enviado" });
        continue;
      }

      cpfsParaInserir.push(cleanCpf);
      validos.push({
        nome: col.nome.trim(),
        cpf: cleanCpf,
        empresa_cnpj: col.empresa_cnpj,
      });
    }

    // 2. Verificar CPFs que já existem no banco de dados
    let importados = 0;
    if (validos.length > 0) {
      const { data: existentes, error: queryError } = await client
        .from("colaboradores")
        .select("cpf")
        .in("cpf", cpfsParaInserir);

      if (queryError) {
        throw new Error(`Erro ao checar CPFs existentes: ${queryError.message}`);
      }

      const cpfsExistentesNoBanco = (existentes || []).map((c: { cpf: string }) => c.cpf);
      const colaboradoresParaInserir = [];

      for (const col of validos) {
        if (cpfsExistentesNoBanco.includes(col.cpf)) {
          inconsistencias.push({
            linha: colaboradores.findIndex(c => c.cpf.replace(/\D/g, "") === col.cpf) + 1,
            nome: col.nome,
            cpf: col.cpf,
            erro: "CPF já cadastrado no sistema (duplicidade no banco)",
          });
          continue;
        }

        colaboradoresParaInserir.push({
          nome: col.nome,
          cpf: col.cpf,
          empresa_id: empresaId,
          status: "ativo",
        });
      }

      // 3. Inserir em lote os colaboradores válidos
      if (colaboradoresParaInserir.length > 0) {
        const { data: insertData, error: insertError } = await client
          .from("colaboradores")
          .insert(colaboradoresParaInserir)
          .select();

        if (insertError) {
          throw new Error(`Erro ao salvar colaboradores: ${insertError.message}`);
        }
        importados = insertData ? insertData.length : 0;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        importados,
        totalProcessado: colaboradores.length,
        inconsistencias,
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
