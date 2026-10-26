import { Category, Rule } from './types';

/**
 * Normaliza um texto para busca determinística:
 * Remove acentos, caracteres especiais e converte para maiúsculas
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Sugere categoria com base nas regras cadastradas e no texto informado
 */
export function suggestCategory(
  description: string,
  rules: Rule[],
  categories: Category[]
): { category: Category; rule: Rule } | null {
  if (!description || description.trim().length < 2) return null;

  const normalizedInput = normalizeText(description);

  for (const rule of rules) {
    if (!rule.isActive) continue;

    const normalizedKeyword = normalizeText(rule.keyword);
    let isMatch = false;

    if (rule.matchType === 'exact') {
      isMatch = normalizedInput === normalizedKeyword;
    } else {
      isMatch = normalizedInput.includes(normalizedKeyword);
    }

    if (isMatch) {
      const category = categories.find((c) => c.id === rule.categoryId && c.isActive);
      if (category) {
        return { category, rule };
      }
    }
  }

  return null;
}
