const PRODUCTS = {
  'baguette': { id: 'BG-BAG', name: 'Baguette', baseDough: 'BG1', conversion: 3 },
  'bollito': { id: 'BO-BOL', name: 'Bollito', baseDough: 'BO1' },
  'bollo': { id: 'BO-BOL', name: 'Bollito', baseDough: 'BO1' },
  'molde': { id: 'BO-MOL', name: 'Molde Brioche', baseDough: 'BO1' },
  'hamburguesa': { id: 'BO-HAM', name: 'Hamburguesa Bollito', baseDough: 'BO1' },
  'palanqueta': { id: 'BO-BRI', name: 'Palanqueta Brioche', baseDough: 'BO1' },
  'dulce': { id: 'DU-DUL', name: 'Dulce', baseDough: 'DU1' },
  'integral': { id: 'IN-INT', name: 'Integral', baseDough: 'IN1', conversion: 6 },
  'negra': { id: 'NE-NEG', name: 'Negra', baseDough: 'NE1', conversion: 6 },
  'orégano': { id: 'OR-ORE', name: 'Orégano', baseDough: 'OR1', conversion: 6 },
  'oregano': { id: 'OR-ORE', name: 'Orégano', baseDough: 'OR1', conversion: 6 },
  'gordano': { id: 'OR-ORE', name: 'Orégano', baseDough: 'OR1', conversion: 6 },
  'gengano': { id: 'OR-ORE', name: 'Orégano', baseDough: 'OR1', conversion: 6 },
  'gegano': { id: 'OR-ORE', name: 'Orégano', baseDough: 'OR1', conversion: 6 },
  'tocino': { id: 'OR-TOC', name: 'Tocino', baseDough: 'OR1' },
  'semilla': { id: 'SE-SEM', name: 'Semilla', baseDough: 'SE1', conversion: 6 },
  'remilla': { id: 'SE-SEM', name: 'Semilla', baseDough: 'SE1', conversion: 6 },
  'campesino': { id: 'CA-CAM', name: 'Campesino', baseDough: 'CA1', conversion: 3 },
  'camp': { id: 'CA-CAM', name: 'Campesino', baseDough: 'CA1', conversion: 3 },
  'panecook': { id: 'CA-PAN', name: 'Panecook', baseDough: 'CA1' },
  'focaccia': { id: 'FO-POR', name: 'Focaccia', baseDough: 'FO1' },
  'megas': { id: 'FO-COM', name: 'Focaccia Completa', baseDough: 'FO1' },
  'mega': { id: 'FO-COM', name: 'Focaccia Completa', baseDough: 'FO1' },
  'holiday': { id: 'BO-BOL', name: 'Bollito (Holiday)', baseDough: 'BO1' },
  'holday': { id: 'BO-BOL', name: 'Bollito (Holiday)', baseDough: 'BO1' }
};

function findProductInLine(line) {
  const lower = line.toLowerCase();
  const productKeys = Object.keys(PRODUCTS).sort((a, b) => b.length - a.length);
  
  for (const key of productKeys) {
    if (lower.includes(key)) {
      return { key, product: PRODUCTS[key] };
    }
  }
  return null;
}

function parseQuantity(line) {
  const result = { base: 0, small: 0, half: 0 };
  
  const baseMatch = line.match(/^(\d+)/);
  if (baseMatch) result.base = parseInt(baseMatch[1]);
  
  const smallMatch = line.match(/(\d+)\s*[pP]\b/);
  if (smallMatch) result.small = parseInt(smallMatch[1]);
  
  const halfMatch = line.match(/\((\d*)\s*\/\s*2\)/);
  if (halfMatch && halfMatch[1]) result.half = parseInt(halfMatch[1]);
  else if (line.toLowerCase().includes('/2')) result.half = 1;
  
  return result;
}

function parseFullText(ocrText) {
  const fullText = ocrText.join('\n');
  const results = [];
  const seen = new Set();
  
  const lines = fullText.split('\n').filter(l => l.trim().length > 0);
  
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.length < 2) continue;
    
    const found = findProductInLine(trimmed);
    if (!found) continue;
    
    const { product } = found;
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    
    const qty = parseQuantity(trimmed);
    
    results.push({
      productId: product.id,
      productName: product.name,
      qtyPlanned: qty.base,
      qtyProduced: qty.base,
      qtySmall: qty.small,
      qtyHalf: qty.half,
      originalText: trimmed
    });
  }
  
  return results;
}

function extractDate(textArray) {
  const fullText = textArray.join(' ').toLowerCase();
  
  const datePatterns = [
    /(\d{1,2})[\s\.]*(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*[\s\.]*(\d{2,4})/i,
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/,
    /s[áa]bado[\s]+(\d{1,2})[\s\.]*(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*[\s\.]*(\d{2,4})/i,
    /domingo[\s]+(\d{1,2})[\s\.]*(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*[\s\.]*(\d{2,4})/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      let day, month, year;
      
      if (match[2] && /ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/i.test(match[2])) {
        day = match[1];
        const months = { ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06', jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12' };
        month = months[match[2].toLowerCase().substring(0, 3)];
        year = match[3].length === 2 ? '20' + match[3] : match[3];
      } else if (match[3]) {
        day = match[1];
        month = match[2].padStart(2, '0');
        year = match[3].length === 2 ? '20' + match[3] : match[3];
      }
      
      if (day && month && year) {
        return `${year}-${month}-${day.padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function parseProductionText(ocrText) {
  const fullTextArray = ocrText.filter(t => t && t.trim().length > 0);
  
  return {
    date: extractDate(fullTextArray),
    products: parseFullText(ocrText),
    rawText: fullTextArray
  };
}

module.exports = { parseProductionText, PRODUCTS };
