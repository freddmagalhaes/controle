import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const client = createClient(supabaseUrl, supabaseAnonKey);

    const { donoId, tipoDono } = await req.json() as {
      donoId: string;
      tipoDono: "colaborador" | "dependente";
    };

    if (!donoId || !tipoDono) {
      return new Response(JSON.stringify({ error: "donoId e tipoDono são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se o dono realmente existe no banco e está ativo
    const table = tipoDono === "colaborador" ? "colaboradores" : "dependentes";
    const { data: dono, error: queryError } = await client
      .from(table)
      .select("id, status, nome")
      .eq("id", donoId)
      .single();

    if (queryError || !dono) {
      return new Response(JSON.stringify({ error: `Dono (${tipoDono}) não encontrado no banco` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (dono.status !== "ativo") {
      return new Response(
        JSON.stringify({ error: `Não é possível gerar cartão para um ${tipoDono} inativo` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Gerar um número de cartão único de 16 dígitos com prefixo de benefício (ex: 6032)
    // Garantimos unicidade rodando um loop simples caso o número já exista
    let numeroCartao = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      // Formato: 6032 5500 1234 5678 (apenas números salvos no banco)
      const randomDigits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
      numeroCartao = `6032${randomDigits}`;

      // Consultar banco para garantir que é único
      const { data: existe, error: checkError } = await client
        .from("cartoes")
        .select("id")
        .eq("numero_cartao", numeroCartao)
        .maybeSingle();

      if (!checkError && !existe) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      throw new Error("Falha ao gerar um número de cartão único após várias tentativas");
    }

    // Inserir cartão no banco
    const { data: novoCartao, error: insertError } = await client
      .from("cartoes")
      .insert({
        numero_cartao: numeroCartao,
        dono_id: donoId,
        tipo_dono: tipoDono,
        status: "ativo"
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erro ao registrar cartão: ${insertError.message}`);
    }

    // Registrar ação no log de auditoria
    // Capturar o usuário logado se fornecido no cabeçalho Authorization
    let usuarioId = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { data: { user } } = await client.auth.getUser(token);
      if (user) {
        // Encontra o usuário na tabela usuarios_perfil correspondente
        const { data: perfil } = await client
          .from("usuarios_perfil")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (perfil) usuarioId = perfil.id;
      }
    }

    await client.from("logs_auditoria").insert({
      usuario_id: usuarioId,
      tabela: "cartoes",
      acao: "INSERT",
      dados: { depois: novoCartao, info: `Cartão gerado via Edge Function para o dono ${dono.nome}` }
    });

    return new Response(JSON.stringify({ success: true, cartao: novoCartao }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
