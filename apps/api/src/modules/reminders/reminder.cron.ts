import cron from 'node-cron';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger/logger.js';
import { runReminders } from './reminder.service.js';

/** Starts the daily reminder job when REMINDERS_ENABLED=true. Called from server.ts only, never from tests. */
export function startReminderJob() {
  if (!env.remindersEnabled) return undefined;
  return cron.schedule(env.remindersCron, () => {
    runReminders().catch((error) => logger.error({ error }, 'reminder run failed'));
  });
}
