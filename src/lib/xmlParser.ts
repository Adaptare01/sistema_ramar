import * as cheerio from 'cheerio';

export interface ParsedItem {
    referencia: string;
    nome: string;
    quantidadeEsperada: number;
    unidade: string;
}

export interface ParsedClient {
    id: string;
    name: string;
    items: ParsedItem[];
    totalItems: number;
}

/**
 * Parser para XML de Minuta de Carregamento gerado pelo Crystal Reports.
 *
 * Estrutura esperada do XML:
 *   FormattedAreaPair Level="1" Type="Group"   → 1 por CLIENTE
 *     ├── Header  → GRUPODES → "Cliente: 3877 - PADARIA BOM GOSTO LTDA"
 *     └── FormattedAreaPair Level="5" Type="Details"  → 1 por PRODUTO
 *           ├── QUANTIDADE → <Value>24.00</Value>
 *           ├── UNIDADE    → <Value>UN</Value>
 *           └── TextValue  → "03129 - ABSORVENTE NOTURNO..."
 */
export function parseCrystalReportsXML(xmlContent: string): ParsedClient[] {
    // Strip XML namespace declarations and prefixes to simplify cheerio CSS selectors
    const cleanedXml = xmlContent
        .replace(/xmlns(?::\w+)?\s*=\s*['"][^'"]*['"]/g, '')  // remove xmlns="..." and xmlns:xsi="..."
        .replace(/xsi:/g, '');                                  // remove xsi: prefix (xsi:type → type)

    const $ = cheerio.load(cleanedXml, { xmlMode: true });
    const clients: ParsedClient[] = [];

    // Each client is a Level="1" Group
    $('FormattedAreaPair[Level="1"][Type="Group"]').each((_i, clientEl) => {
        // ─── 1. Extract client info from the Group Header ───
        let clientInfo = '';

        $(clientEl)
            .children('FormattedArea[Type="Header"]')
            .find('FormattedReportObject')
            .each((_j, obj) => {
                const fieldName = $(obj).attr('FieldName') || '';
                if (fieldName.includes('GRUPODES')) {
                    clientInfo =
                        $(obj).find('FormattedValue').first().text().trim() ||
                        $(obj).find('Value').first().text().trim();
                }
            });

        if (!clientInfo) return;

        // Parse "Cliente: 3877 - PADARIA BOM GOSTO LTDA"
        const clientMatch = clientInfo.match(/Cliente:\s*(\S+)\s*-\s*(.+)/i);
        if (!clientMatch) return;

        const clientId = clientMatch[1].trim();
        const clientName = clientMatch[2].trim();

        // ─── 2. Extract product items from Level="5" Details ───
        const items: ParsedItem[] = [];
        let totalItems = 0;

        $(clientEl)
            .find('FormattedAreaPair[Level="5"][Type="Details"]')
            .each((_j, detailPair) => {
                const section = $(detailPair)
                    .find('FormattedSection[SectionNumber="0"]')
                    .first();

                let quantidade = 0;
                let unidade = 'UN';
                let produtoText = '';

                section.find('FormattedReportObject').each((_k, obj) => {
                    const fieldName = $(obj).attr('FieldName') || '';

                    if (fieldName.includes('QUANTIDADE')) {
                        const raw = $(obj).find('Value').first().text().trim();
                        quantidade = parseFloat(raw) || 0;
                    } else if (fieldName.includes('UNIDADE')) {
                        unidade = $(obj).find('Value').first().text().trim() || 'UN';
                    } else {
                        // Check for TextValue (product text in CTFormattedText elements)
                        const textVal = $(obj).find('TextValue').first().text().trim();
                        if (textVal) {
                            produtoText = textVal;
                        }
                    }
                });

                if (!produtoText || quantidade <= 0) return;

                // Parse "03129 - ABSORVENTE NOTURNO C/ ABAS CLINOFF LEVE 8 PAGUE 7 (12X1)"
                const itemMatch = produtoText.match(/^(\S+)\s*-\s*(.+)/);
                if (!itemMatch) return;

                items.push({
                    referencia: itemMatch[1].trim(),
                    nome: itemMatch[2].trim(),
                    quantidadeEsperada: quantidade,
                    unidade,
                });
                totalItems += quantidade;
            });

        if (items.length > 0) {
            clients.push({ id: clientId, name: clientName, items, totalItems });
        }
    });

    return clients;
}
