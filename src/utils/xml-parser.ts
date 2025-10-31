import { parseString } from 'xml2js';
import { promisify } from 'util';
import fs from 'fs/promises';

export const parseXmlStringAsync = promisify(parseString);

export async function parseXmlFile(filePath: string): Promise<any> {
  const xmlContent = await fs.readFile(filePath, 'utf-8');
  return parseXmlStringAsync(xmlContent);
}

export function extractSpiritNames(xmlData: any): Map<string, string> {
  const spiritNameMap = new Map<string, string>();
  
  if (!xmlData?.resources?.string) {
    return spiritNameMap;
  }

  // Find all string entries that start with "name_" and store their Chinese translations
  xmlData.resources.string.forEach((entry: any) => {
    if (entry?.$?.name?.startsWith('name_')) {
      const englishName = entry.$.name.replace('name_', '');
      const chineseName = entry._;
      if (englishName && chineseName) {
        spiritNameMap.set(englishName, chineseName);
      }
    }
  });

  return spiritNameMap;
}