import { store } from '../state';
import { formatCurrency, formatDateBR, getTodayIso } from '../formatters';
import { getFixedExpenseStatusForMonth } from '../components/FixedExpensesView';
import { FixedExpense } from '../types';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const STORAGE_KEY = 'financa2_fixed_reminders_v1';

export interface DueFixedAlertItem {
  fixed: FixedExpense;
  yearMonth: string;
  dueDateIso: string;
  daysUntilDue: number;
  status: 'overdue' | 'due_soon';
}

export class FixedReminderService {
  private intervalId: number | null = null;

  /**
   * Retorna todos os gastos fixos não pagos que já estão a <= 2 dias do vencimento (ou vencidos)
   * considerando o mês selecionado ou o mês atual.
   */
  public getAlertableFixedExpenses(referenceMonth?: string): DueFixedAlertItem[] {
    const todayIso = getTodayIso();
    const currentYearMonth = todayIso.slice(0, 7);
    const monthsToCheck = new Set<string>([currentYearMonth]);
    if (referenceMonth) monthsToCheck.add(referenceMonth);

    const activeFixed = store.getFixedExpenses().filter((f) => f.isActive);
    const alerts: DueFixedAlertItem[] = [];

    for (const ym of monthsToCheck) {
      for (const fixed of activeFixed) {
        const info = getFixedExpenseStatusForMonth(fixed, ym, todayIso);
        if (info.status === 'overdue' || info.status === 'due_soon') {
          alerts.push({
            fixed,
            yearMonth: ym,
            dueDateIso: info.dueDateIso,
            daysUntilDue: info.daysUntilDue,
            status: info.status
          });
        }
      }
    }

    // Ordena vencidos primeiro
    return alerts.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  private getLastNotifiedMap(): Record<string, number> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveLastNotifiedMap(map: Record<string, number>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      // Ignora erro de quota
    }
  }

  /**
   * Verifica se há algum custo fixo (a partir de 2 dias antes do vencimento ou vencido)
   * cujo último lembrete ocorreu há 6 horas ou mais.
   */
  public checkAndTriggerSixHourReminders(onTriggerBanner: (items: DueFixedAlertItem[]) => void): void {
    const alertItems = this.getAlertableFixedExpenses(store.getSelectedMonth());
    if (alertItems.length === 0) return;

    const now = Date.now();
    const map = this.getLastNotifiedMap();
    const dueForNotification: DueFixedAlertItem[] = [];

    for (const item of alertItems) {
      const key = `${item.fixed.id}::${item.yearMonth}`;
      const lastTime = map[key] || 0;
      if (now - lastTime >= SIX_HOURS_MS) {
        dueForNotification.push(item);
        map[key] = now;
      }
    }

    if (dueForNotification.length > 0) {
      this.saveLastNotifiedMap(map);
      this.sendNativeNotification(dueForNotification);
      onTriggerBanner(alertItems);
    }
  }

  private sendNativeNotification(items: DueFixedAlertItem[]): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const first = items[0];
    const title =
      items.length === 1
        ? `⏰ Lembrete de Vencimento: ${first.fixed.name}`
        : `⏰ ${items.length} Gastos Fixos próximos ou vencidos`;

    const body = items
      .slice(0, 3)
      .map((i) => {
        const statusTxt =
          i.daysUntilDue < 0
            ? `VENCIDO (${formatDateBR(i.dueDateIso)})`
            : i.daysUntilDue === 0
              ? 'Vence HOJE'
              : `Vence em ${i.daysUntilDue} dia(s)`;
        return `• ${i.fixed.name}: ${formatCurrency(i.fixed.amountCents)} (${statusTxt})`;
      })
      .join('\n');

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.svg' });
      } catch {
        // Fallback silencioso em browsers móveis
      }
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          try {
            new Notification(title, { body, icon: '/favicon.svg' });
          } catch {
            // Fallback
          }
        }
      });
    }
  }

  public startDaemon(onTriggerBanner: (items: DueFixedAlertItem[]) => void): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }

    // Verifica imediatamente ao iniciar
    setTimeout(() => {
      this.checkAndTriggerSixHourReminders(onTriggerBanner);
    }, 600);

    // Verifica periodicamente (a cada 5 minutos checa se a janela de 6h já venceu)
    this.intervalId = window.setInterval(() => {
      this.checkAndTriggerSixHourReminders(onTriggerBanner);
    }, 5 * 60 * 1000);

    // Também verifica sempre que o usuário traz o app de volta ao foco no celular
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkAndTriggerSixHourReminders(onTriggerBanner);
      }
    });
  }
}

export const reminderService = new FixedReminderService();

