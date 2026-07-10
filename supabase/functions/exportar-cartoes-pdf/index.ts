import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// pdf-lib é excelente para manipular e criar PDFs no lado do servidor em ambientes serverless/Deno
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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

    const { cartaoIds } = await req.json() as { cartaoIds: string[] };

    if (!cartaoIds || cartaoIds.length === 0) {
      return new Response(JSON.stringify({ error: "Lote de IDs de cartões vazio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Buscar os dados dos cartões com informações dos donos
    // Precisamos saber se o dono é colaborador ou dependente para buscar o nome correto
    const { data: cartoes, error: fetchError } = await client
      .from("cartoes")
      .select(`
        id,
        numero_cartao,
        dono_id,
        tipo_dono,
        status
      `)
      .in("id", cartaoIds);

    if (fetchError || !cartoes) {
      throw new Error(`Erro ao carregar dados dos cartões: ${fetchError?.message}`);
    }

    const cardsFormatted = [];
    for (const card of cartoes) {
      let nomeDono = "Dono não encontrado";
      let empresaNome = "Empresa não informada";

      if (card.tipo_dono === "colaborador") {
        const { data: col } = await client
          .from("colaboradores")
          .select("nome, empresas(razao_social)")
          .eq("id", card.dono_id)
          .single();
        if (col) {
          nomeDono = col.nome;
          if (col.empresas) {
            // @ts-ignore
            empresaNome = col.empresas.razao_social;
          }
        }
      } else {
        const { data: dep } = await client
          .from("dependentes")
          .select("nome, colaboradores(empresas(razao_social))")
          .eq("id", card.dono_id)
          .single();
        if (dep) {
          nomeDono = dep.nome;
          if (dep.colaboradores && dep.colaboradores.empresas) {
            // @ts-ignore
            empresaNome = dep.colaboradores.empresas.razao_social;
          }
        }
      }

      cardsFormatted.push({
        numero: card.numero_cartao.replace(/(\d{4})/g, "$1 ").trim(),
        dono: nomeDono,
        empresa: empresaNome,
        status: card.status,
      });
    }

    // 2. Criar documento PDF com pdf-lib
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Adiciona uma página padrão (tamanho Carta)
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();

    // Desenhar Cabeçalho do Relatório de Cartões
    page.drawText("Lote de Cartões de Benefício Gerados", {
      x: 50,
      y: height - 60,
      size: 20,
      font: helveticaBold,
      color: rgb(0.09, 0.12, 0.22), // Navy Dark
    });

    page.drawText(`Documento gerado em: ${new Date().toLocaleDateString("pt-BR")} - Total: ${cardsFormatted.length} cartões`, {
      x: 50,
      y: height - 80,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    let yPosition = height - 120;

    // Renderizar cada cartão como um retângulo estilizado (tipo crachá físico) no PDF
    for (let i = 0; i < cardsFormatted.length; i++) {
      const card = cardsFormatted[i];

      // Pula de página se passar da margem inferior
      if (yPosition < 150) {
        const newPage = pdfDoc.addPage([612, 792]);
        page.drawText("(Continuação)", { x: 50, y: 750, size: 10, font: helveticaFont });
        yPosition = 700;
      }

      // Fundo do cartão (layout retangular estilo dark/glass premium)
      page.drawRectangle({
        x: 50,
        y: yPosition - 110,
        width: 300,
        height: 110,
        borderColor: rgb(0.2, 0.4, 0.9), // Blue border
        borderWidth: 1.5,
        color: rgb(0.05, 0.07, 0.15), // Deep Navy dark background
      });

      // Detalhes estéticos - "Micro-chip" simbólico
      page.drawRectangle({
        x: 70,
        y: yPosition - 55,
        width: 35,
        height: 25,
        color: rgb(0.85, 0.7, 0.2), // Dourado
      });

      // Logotipo do Sistema de Cartão (Fictício: "ANTIGRAVITY BENEFÍCIOS")
      page.drawText("ANTIGRAVITY", {
        x: 230,
        y: yPosition - 30,
        size: 10,
        font: helveticaBold,
        color: rgb(0.9, 0.9, 0.9),
      });

      // Número do cartão
      page.drawText(card.numero, {
        x: 70,
        y: yPosition - 75,
        size: 14,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });

      // Nome do portador
      page.drawText(card.dono.toUpperCase(), {
        x: 70,
        y: yPosition - 92,
        size: 9,
        font: helveticaFont,
        color: rgb(0.8, 0.8, 0.8),
      });

      // Nome da empresa
      page.drawText(card.empresa, {
        x: 70,
        y: yPosition - 102,
        size: 8,
        font: helveticaFont,
        color: rgb(0.6, 0.6, 0.6),
      });

      // Status
      page.drawText(card.status.toUpperCase(), {
        x: 280,
        y: yPosition - 102,
        size: 8,
        font: helveticaBold,
        color: card.status === "ativo" ? rgb(0.2, 0.8, 0.2) : rgb(0.8, 0.2, 0.2),
      });

      yPosition -= 140; // Espaçamento para o próximo cartão no layout
    }

    const pdfBytes = await pdfDoc.save();

    // 3. Fazer upload do arquivo PDF para o Bucket do Supabase Storage
    const fileName = `lote_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`;
    
    // Tentamos fazer o upload no bucket 'cartoes-pdfs'
    const { data: uploadData, error: uploadError } = await client.storage
      .from("cartoes-pdfs")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      // Se der erro por falta do bucket, podemos simplesmente retornar o PDF em base64 ou simular o upload
      throw new Error(`Erro ao enviar PDF para Storage: ${uploadError.message}`);
    }

    // Gerar URL pública do PDF
    const { data: urlData } = client.storage
      .from("cartoes-pdfs")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: urlData.publicUrl,
        fileName,
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
