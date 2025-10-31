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
      // 提取基础名称（去掉name_前缀）
      const englishName = entry.$.name.replace('name_', '');
      const chineseName = entry._;
      if (englishName && chineseName) {
        // 存储不带数字后缀的基础名称
        const baseEnglishName = englishName.replace(/_\d+$/, '');
        spiritNameMap.set(baseEnglishName, chineseName);
      }
    }
  });

  return spiritNameMap;
}