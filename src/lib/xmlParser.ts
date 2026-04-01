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

export function parseCrystalReportsXML(xmlContent: string): ParsedClient[] {
    const $ = cheerio.load(xmlContent, { xmlMode: true });
    const clientsMap = new Map<string, ParsedClient>();

    // Try to find the data structure
    $('Details').each((_i, el) => {
        const fields = $(el).find('Field, Section, Text');
        const values: string[] = [];

        fields.each((_j, field) => {
            const text = $(field).text().trim();
            if (text) values.push(text);
        });

        // Parse values based on Crystal Reports structure
        if (values.length >= 4) {
            const clientId = values[0] || '';
            const clientName = values[1] || clientId;
            const referencia = values[2] || '';
            const nome = values[3] || '';
            const quantidade = parseFloat(values[4] || '0') || 0;
            const unidade = values[5] || 'UN';

            if (!clientId || !referencia) return;

            if (!clientsMap.has(clientId)) {
                clientsMap.set(clientId, {
                    id: clientId,
                    name: clientName,
                    items: [],
                    totalItems: 0,
                });
            }

            const client = clientsMap.get(clientId)!;
            client.items.push({ referencia, nome, quantidadeEsperada: quantidade, unidade });
            client.totalItems += quantidade;
        }
    });

    // Fallback: try table-based format
    if (clientsMap.size === 0) {
        const rows = $('Row, TR, row');
        let currentClient: ParsedClient | null = null;

        rows.each((_i, el) => {
            const cells: string[] = [];
            $(el).children().each((_j, cell) => {
                cells.push($(cell).text().trim());
            });

            if (cells.length >= 3) {
                // Check if this is a client header row
                if (cells[0] && !cells[0].match(/^\d/) && cells.length <= 3) {
                    currentClient = {
                        id: cells[0],
                        name: cells[1] || cells[0],
                        items: [],
                        totalItems: 0,
                    };
                    clientsMap.set(cells[0], currentClient);
                } else if (currentClient && cells.length >= 4) {
                    const quantidade = parseFloat(cells[2] || '0') || 0;
                    currentClient.items.push({
                        referencia: cells[0],
                        nome: cells[1],
                        quantidadeEsperada: quantidade,
                        unidade: cells[3] || 'UN',
                    });
                    currentClient.totalItems += quantidade;
                }
            }
        });
    }

    return Array.from(clientsMap.values());
}
