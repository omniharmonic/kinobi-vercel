import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Type definitions (mirrored from frontend for self-containment)
type ChoreStatus = 'good' | 'warning' | 'urgent' | 'overdue';

interface Chore {
  id: string;
  name: string;
  icon: string;
  cycleDuration: number;
  lastCompleted?: number;
}

interface Config {
  warningThreshold: number;
  dangerThreshold: number;
  telegramChatId?: string;
}

// Helper to calculate a chore's current status
function getChoreStatus(chore: Chore, config: Config): ChoreStatus {
    if (!chore.lastCompleted) {
        return 'good';
    }

    const now = Date.now();
    const totalCycleMillis = chore.cycleDuration * 60 * 60 * 1000;
    const elapsedMillis = now - chore.lastCompleted;

    const warningTime = totalCycleMillis * (config.warningThreshold / 100);
    const urgentTime = totalCycleMillis * (config.dangerThreshold / 100);

    if (elapsedMillis >= totalCycleMillis) return 'overdue';
    if (elapsedMillis >= urgentTime) return 'urgent';
    if (elapsedMillis >= warningTime) return 'warning';
    
    return 'good';
}

// Selects a "cheeky" message based on the status transition
function getTransitionMessage(choreName: string, choreIcon: string, from: ChoreStatus | undefined, to: ChoreStatus): string | null {
    const icon = `${choreIcon} `;
    switch (to) {
        case 'warning':
            if (from === 'good') {
                const messages = [
                    `Just a heads up, ${choreName} is looking a bit neglected.`,
                    `${choreName} is starting to feel lonely. Maybe pay it a visit?`,
                    `The clock is ticking on ${choreName}...`
                ];
                return icon + messages[Math.floor(Math.random() * messages.length)];
            }
            return null;
        case 'urgent':
            if (from === 'warning') {
                const messages = [
                    `Okay, it's getting serious with ${choreName}. Time to take action!`,
                    `${choreName} is pleading for attention!`,
                    `We've reached critical levels of undone-ness for ${choreName}.`
                ];
                return icon + "🔥 " + messages[Math.floor(Math.random() * messages.length)];
            }
            return null;
        case 'overdue':
            if (from === 'urgent') {
                const messages = [
                    `IT'S OVERDUE! ${choreName} has been officially abandoned.`,
                    `Sound the alarms! ${choreName} is now overdue.`,
                    `We may have a situation here. ${choreName} is past its due date.`
                ];
                return icon + "🚨 " + messages[Math.floor(Math.random() * messages.length)];
            }
            return null;
        default:
            return null;
    }
}

// Helper to call the Telegram API
async function callTelegramApi(method: string, params: object) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error('TELEGRAM_BOT_TOKEN is not set.');
        return;
    }
    const url = `https://api.telegram.org/bot${token}/${method}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. Secure the endpoint
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // 2. Get all syncIds
        const allSyncIds = await kv.smembers('kinobi:all_sync_ids');

        for (const syncId of allSyncIds) {
            const data: any = await kv.get(`kinobi:${syncId}`);
            const config = data?.config as Config;
            const chores = data?.chores as Chore[];

            // 3. Check if notifications are enabled for this instance
            if (!config || !config.telegramChatId || !chores || chores.length === 0) {
                continue;
            }

            const lastKnownStatusesKey = `kinobi:${syncId}:chore_statuses`;
            const lastKnownStatuses: Record<string, ChoreStatus> = (await kv.get(lastKnownStatusesKey)) || {};
            const newStatuses: Record<string, ChoreStatus> = {};

            for (const chore of chores) {
                const currentStatus = getChoreStatus(chore, config);
                newStatuses[chore.id] = currentStatus;

                const lastStatus = lastKnownStatuses[chore.id];
                
                // 4. Check for any status transition and send a notification
                if (currentStatus !== lastStatus) {
                    const message = getTransitionMessage(chore.name, chore.icon, lastStatus, currentStatus);
                    if (message) {
                        await callTelegramApi('sendMessage', {
                            chat_id: config.telegramChatId,
                            text: message,
                        });
                    }
                }
            }
            
            // 5. Update the last known statuses for the next run
            await kv.set(lastKnownStatusesKey, newStatuses);
        }

        res.status(200).json({ success: true, message: `Checked ${allSyncIds.length} instances.` });

    } catch (error: any) {
        console.error('Error in cron job:', error);
        res.status(500).json({ success: false, error: error.message });
    }
} 