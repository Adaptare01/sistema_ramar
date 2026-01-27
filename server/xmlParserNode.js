import * as cheerio from 'cheerio';

/**
 * Parses the Crystal Reports XML content using Cheerio (Node.js).
 * @param {string} xmlContent 
 * @returns {Array} List of clients with their items
 */
export const parseCrystalReportsXML = (xmlContent) => {
    console.log("--- INÍCIO DO PARSER XML (Server-Side Cheerio) ---");

    // Load XML into Cheerio with xml mode enabled
    const $ = cheerio.load(xmlContent, { xmlMode: true });

    const clients = [];

    // Find all FormattedAreaPair with Level="1" (Client Groups)
    const clientGroups = $('FormattedAreaPair[Level="1"]');
    console.log(`Clientes encontrados: ${clientGroups.length}`);

    clientGroups.each((_, element) => {
        const clientGroup = $(element);

        // --- Identificação do Cliente ---
        let clientNameRaw = "";

        // Search for "Cliente:" in Value tags within this group
        const values = clientGroup.find('Value');
        values.each((_, val) => {
            const text = $(val).text();
            if (text && text.includes("Cliente:")) {
                clientNameRaw = text;
                return false; // break loop
            }
        });

        if (!clientNameRaw) return;

        const clientMatch = clientNameRaw.match(/Cliente:\s*(\d+)\s*-\s*(.*)/);
        if (!clientMatch) return;

        const clientId = clientMatch[1];
        const clientName = clientMatch[2].trim();
        console.log(`[${clientId}] Processando ${clientName}...`);

        const items = [];

        // --- Busca de Detalhes (Level 5) ---
        // Cheerio find searches descendants. We need to be careful if structure is nested.
        // However, in the original code, it searched getElementsByTagName on the clientGroup node,
        // which implies searching ALL descendants.

        const details = clientGroup.find('FormattedAreaPair[Level="5"]');
        console.log(`  -> Blocos de detalhes encontrados: ${details.length}`);

        details.each((detailIdx, detailEl) => {
            const detail = $(detailEl);
            const htmlContent = $.html(detail); // Get string representation for Regex

            // 1. Extração da Quantidade
            let quantity = 0;
            let unit = "UN";

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
            let refAndName = "";
            const prodRegexes = [
                /<ObjectName>Text7<\/ObjectName>[\s\S]*?<TextValue>(.*?)<\/TextValue>/i,
                /ObjectName="Text7"[\s\S]*?TextValue="([^"]*)"/i,
                /<ObjectName>Text7<\/ObjectName>[\s\S]*?<Value>(.*?)<\/Value>/i,
                /ObjectName="Text7"[\s\S]*?<Value>(.*?)<\/Value>/i
            ];

            for (const regex of prodRegexes) {
                const match = htmlContent.match(regex);
                if (match) {
                    refAndName = match[1] || "";
                    if (refAndName) break;
                }
            }

            if (quantity > 0 && refAndName) {
                refAndName = refAndName.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

                const itemMatch = refAndName.match(/^(\d+)\s+-\s+(.*)$/);
                if (itemMatch) {
                    const ref = itemMatch[1];
                    const nome = itemMatch[2].trim();

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
        }
    });

    return clients;
};
