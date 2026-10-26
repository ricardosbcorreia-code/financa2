// Utilitários de formatação brasileiros de acordo com as regras de integridade

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

/**
 * Converte valor inteiro em centavos para string monetária em Real (R$)
 * Ex: 12590 -> "R$ 125,90"
 */
export function formatCurrency(cents: number): string {
  return BRL_FORMATTER.format(cents / 100);
}

/**
 * Converte string digitada pelo usuário para centavos inteiros
 * Ex: "125,90" -> 12590, "125.90" -> 12590, "R$ 125,90" -> 12590
 */
export function parseCurrencyInput(value: string): number {
  if (!value) return 0;
  // Remove R$, espaços e pontos de milhar, troca vírgula decimal por ponto
  const clean = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Formata data ISO (YYYY-MM-DD) para padrão brasileiro DD/MM/AAAA
 */
export function formatDateBR(dateIso: string): string {
  if (!dateIso) return '';
  const [year, month, day] = dateIso.split('-');
  if (!year || !month || !day) return dateIso;
  return `${day}/${month}/${year}`;
}

/**
 * Retorna o nome amigável do mês e ano em português
 * Ex: "2026-10" -> "Outubro de 2026"
 */
export function formatMonthYearBR(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mIndex = parseInt(month, 10) - 1;
  return `${months[mIndex] || month} de ${year}`;
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD
 */
export function getTodayIso(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adiciona meses a uma data YYYY-MM-DD
 */
export function addMonthsIso(dateIso: string, monthsToAdd: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const date = new Date(y, m - 1 + monthsToAdd, d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
