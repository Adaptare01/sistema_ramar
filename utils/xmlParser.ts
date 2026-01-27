import { ClientData, InvoiceItem } from "../types";

export const parseCrystalReportsXML = (xmlContent: string): ClientData[] => {
  console.log("--- INÍCIO DO PARSER XML (V4 - Regex Hybrid) ---");
  
  // 1. Limpeza e Parse inicial para estrutura macro
  const cleanXml = xmlContent
    .replace(/xmlns="[^"]*"/g, "")
    .replace(/xmlns:[a-zA-Z0-9]+="[^"]*"/g, "");

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(cleanXml, "text/xml");
  
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Erro critico no XML: " + parserError.textContent);
  }

  const clients: ClientData[] = [];
  const clientGroups = Array.from(xmlDoc.getElementsByTagName("FormattedAreaPair"))
                            .filter(node => node.getAttribute("Level") === "1");
  
  console.log(`Clientes encontrados: ${clientGroups.length}`);

  clientGroups.forEach((clientGroup, idx) => {
    // --- Identificação do Cliente (Mantida via DOM pois funcionou) ---
    const allValues = Array.from(clientGroup.getElementsByTagName("Value"));
    let clientNameRaw = "";
    for (const val of allValues) {
        if (val.textContent && val.textContent.includes("Cliente:")) {
            clientNameRaw = val.textContent;
            break;
        }
    }

    if (!clientNameRaw) return;
    const clientMatch = clientNameRaw.match(/Cliente:\s*(\d+)\s*-\s*(.*)/);
    if (!clientMatch) return;

    const clientId = clientMatch[1];
    const clientName = clientMatch[2];
    console.log(`[${clientId}] Processando ${clientName}...`);

    const items: InvoiceItem[] = [];

    // --- Busca de Detalhes (Level 5) ---
    // Seleciona todos os nós Level 5 dentro deste grupo de cliente
    const groupAreaPairs = Array.from(clientGroup.getElementsByTagName("FormattedAreaPair"));
    const details = groupAreaPairs.filter(d => d.getAttribute("Level") === "5");

    console.log(`  -> Blocos de detalhes encontrados: ${details.length}`);

    details.forEach((detail, detailIdx) => {
        // --- ESTRATÉGIA REGEX EM STRING (Solicitada) ---
        // Converte o nó inteiro para string para buscar padrões independentemente da estrutura de árvore
        const htmlContent = detail.outerHTML; 
        
        // 1. Extração da Quantidade
        let quantity = 0;
        let unit = "UN";
        
        // Regex para Quantidade: Tenta achar <ObjectName>QUANTIDADE...</ObjectName> ... <Value>12.00</Value>
        // Ou via Atributo ObjectName="QUANTIDADE..."
        const qtyRegexes = [
            /<ObjectName>QUANTIDADE(?:1)?<\/ObjectName>[\s\S]*?<Value>(.*?)<\/Value>/i,
            /ObjectName="QUANTIDADE(?:1)?"[\s\S]*?<Value>(.*?)<\/Value>/i,
            /FieldName="[^"]*QUANTIDADE[^"]*"[\s\S]*?<Value>(.*?)<\/Value>/i
        ];

        let qtyRaw = null;
        for (const regex of qtyRegexes) {
            const match = htmlContent.match(regex);
            if (match && match[1]) {
                qtyRaw = match[1];
                break;
            }
        }

        if (qtyRaw) {
            quantity = parseFloat(qtyRaw.replace(",", "."));
        }

        // 2. Extração do Produto (Text7)
        // Regex para Produto: Tenta achar ObjectName="Text7" ... TextValue="..."
        let refAndName = "";
        
        const prodRegexes = [
            // Tag based TextValue
            /<ObjectName>Text7<\/ObjectName>[\s\S]*?<TextValue>(.*?)<\/TextValue>/i,
            // Attribute based TextValue
            /ObjectName="Text7"[\s\S]*?TextValue="([^"]*)"/i,
            // Tag based Value (fallback)
            /<ObjectName>Text7<\/ObjectName>[\s\S]*?<Value>(.*?)<\/Value>/i,
             // Attribute based Value (fallback)
            /ObjectName="Text7"[\s\S]*?<Value>(.*?)<\/Value>/i
        ];

        for (const regex of prodRegexes) {
             const match = htmlContent.match(regex);
             if (match) {
                 // match[1] é o primeiro grupo de captura. 
                 // Se o regex tiver alternância não capturante no início, ajusta-se, mas aqui são simples.
                 refAndName = match[1] || "";
                 if(refAndName) break;
             }
        }
        
        // Log para debug de falhas
        if (detailIdx < 3) { // Logar apenas os primeiros para não poluir
             console.log(`    [Item ${detailIdx}] QtyRaw: "${qtyRaw}" -> ${quantity}, ProdRaw: "${refAndName}"`);
        }

        if (quantity > 0 && refAndName) {
             // Limpa HTML entities simples se houver
             refAndName = refAndName.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

             const itemMatch = refAndName.match(/^(\d+)\s+-\s+(.*)$/);
             if (itemMatch) {
                 const ref = itemMatch[1];
                 const nome = itemMatch[2];

                 const existing = items.find(i => i.referencia === ref);
                 if (existing) {
                     existing.quantidadeEsperada += quantity;
                 } else {
                     items.push({
                         referencia: ref,
                         nome: nome,
                         quantidadeEsperada: quantity,
                         unidade: unit
                     });
                 }
             } else {
                 console.warn(`    [Item ${detailIdx}] Formato de produto inválido: ${refAndName}`);
             }
        }
    });

    if (items.length > 0) {
        clients.push({
            id: clientId,
            name: clientName,
            items: items,
            totalItems: items.reduce((acc, i) => acc + i.quantidadeEsperada, 0)
        });
        console.log(`  -> Total itens válidos no cliente: ${items.length}`);
    } else {
        console.warn(`  -> NENHUM ITEM EXTRAÍDO PARA O CLIENTE ${clientId}`);
    }
  });

  return clients;
};