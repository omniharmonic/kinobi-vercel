import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// A simple API client for Telegram
async function callTelegramApi(method: string, params: object) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${token}/${method}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const update = req.body;
        console.log('Received Telegram update:', update);

        if (update.message) {
            const message = update.message;
            const text = message.text || '';
            const chatId = message.chat.id;

            if (text.startsWith('/start')) {
                await handleStartCommand(chatId);
            } else if (text.startsWith('/help')) {
                await handleHelpCommand(chatId);
            } else if (text.startsWith('/log')) {
                await handleLogCommand(chatId);
            } else if (/^\d{6}$/.test(text)) {
                await handleLinkingToken(text, chatId);
            } else {
                await callTelegramApi('sendMessage', {
                    chat_id: chatId,
                    text: "I don't understand that command. Try /help for a list of things I can do.",
                });
            }
        } else if (update.callback_query) {
            const callbackQuery = update.callback_query;
            const data = callbackQuery.data || '';
            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;

            if (data.startsWith('log_chore_')) {
                const choreId = data.replace('log_chore_', '');
                await handleChoreSelection(chatId, choreId, messageId);
            } else if (data.startsWith('log_tender_')) {
                const [choreId, tenderId] = data.replace('log_tender_', '').split('_');
                await handleTenderSelection(chatId, choreId, tenderId, messageId);
            }
        }
        
        res.status(200).json({ status: 'ok' });

    } catch (error: any) {
        console.error('Error processing Telegram update:', error);
        res.status(200).json({ status: 'error', message: error.message });
    }
}

async function findSyncIdByTelegramUserId(userId: number): Promise<string | null> {
    const allSyncIds = await kv.smembers('kinobi:all_sync_ids');
    for (const syncId of allSyncIds) {
        const data: any = await kv.get(`kinobi:${syncId}`);
        if (data && data.config && data.config.telegramUserId === userId) {
            return syncId;
        }
    }
    return null;
}

async function handleLogCommand(chatId: number) {
    const syncId = await findSyncIdByTelegramUserId(chatId);

    if (!syncId) {
        await callTelegramApi('sendMessage', {
            chat_id: chatId,
            text: "Your Telegram account is not linked yet. Please get a code from the app's settings and send it to me.",
        });
        return;
    }

    const data: any = await kv.get(`kinobi:${syncId}`);
    const chores = data.chores || [];

    if (chores.length === 0) {
        await callTelegramApi('sendMessage', {
            chat_id: chatId,
            text: "You have no chores to log. Add some in the app's settings first.",
        });
        return;
    }

    const keyboard = {
        inline_keyboard: chores.map((chore: any) => ([{
            text: `${chore.icon} ${chore.name}`,
            callback_data: `log_chore_${chore.id}`
        }]))
    };

    await callTelegramApi('sendMessage', {
        chat_id: chatId,
        text: 'Which chore did you complete?',
        reply_markup: keyboard,
    });
}

async function handleChoreSelection(chatId: number, choreId: string, messageId: number) {
    const syncId = await findSyncIdByTelegramUserId(chatId);
    if (!syncId) {
        await callTelegramApi('editMessageText', { chat_id: chatId, message_id: messageId, text: 'Error: Could not find your linked account.' });
        return;
    }

    const data: any = await kv.get(`kinobi:${syncId}`);
    const tenders = data.tenders || [];
    const chore = (data.chores || []).find((c: any) => c.id === choreId);

    if (!chore) {
        await callTelegramApi('editMessageText', { chat_id: chatId, message_id: messageId, text: 'Oops! That chore no longer exists. Try /log again.', reply_markup: {} });
        return;
    }

    if (tenders.length === 0) {
        await callTelegramApi('editMessageText', { chat_id: chatId, message_id: messageId, text: 'You need to add at least one "tender" (person) in the app settings first.', reply_markup: {} });
        return;
    }

    const keyboard = {
        inline_keyboard: tenders.map((tender: any) => ([{
            text: tender.name,
            callback_data: `log_tender_${choreId}_${tender.id}`
        }]))
    };

    await callTelegramApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: `You tended: ${chore.icon} ${chore.name}\n\nWho are you?`,
        reply_markup: keyboard,
    });
}

async function handleTenderSelection(chatId: number, choreId: string, tenderId: string, messageId: number) {
    const syncId = await findSyncIdByTelegramUserId(chatId);
    if (!syncId) {
        await callTelegramApi('editMessageText', { chat_id: chatId, message_id: messageId, text: 'Error: Could not find your linked account.' });
        return;
    }

    const data: any = await kv.get(`kinobi:${syncId}`);
    const chore = (data.chores || []).find((c:any) => c.id === choreId);
    const tender = (data.tenders || []).find((t:any) => t.id === tenderId);

    if (chore && tender) {
        const timestamp = Date.now();
        chore.lastCompleted = timestamp;
        chore.lastTender = tender.name;
        
        const historyEntry = {
            id: `hist_${timestamp}_${chore.id}`,
            chore: chore.name, 
            tender: tender.name,
            timestamp: timestamp,
            points: chore.points,
            notes: "Logged via Telegram",
        };

        if (!data.history) data.history = [];
        data.history.unshift(historyEntry);
        if (data.history.length > 100) {
            data.history.pop();
        }
        
        await kv.set(`kinobi:${syncId}`, data);
        
        await callTelegramApi('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: `✅ Success! Logged that ${tender.name} tended ${chore.name}.`,
            reply_markup: {},
        });
    } else {
        await callTelegramApi('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: '❌ An error occurred. The chore or tender may have been deleted. Please try again with /log.',
            reply_markup: {},
        });
    }
}

async function handleLinkingToken(token: string, chatId: number) {
    try {
        const allSyncIds = await kv.smembers('kinobi:all_sync_ids');
        let linkEstablished = false;

        for (const syncId of allSyncIds) {
            const data: any = await kv.get(`kinobi:${syncId}`);
            if (data && data.config) {
                const { telegramLinkingToken, telegramLinkingTokenTimestamp } = data.config;
                
                // Check if token matches and is not expired (e.g., within 10 minutes)
                if (telegramLinkingToken === token) {
                    const now = Date.now();
                    const tenMinutes = 10 * 60 * 1000;
                    if (now - (telegramLinkingTokenTimestamp || 0) < tenMinutes) {
                        // Success! Link the account.
                        data.config.telegramUserId = chatId;
                        data.config.telegramLinkingToken = undefined; // Clear the token
                        data.config.telegramLinkingTokenTimestamp = undefined;
                        
                        await kv.set(`kinobi:${syncId}`, data);
                        
                        await callTelegramApi('sendMessage', {
                            chat_id: chatId,
                            text: '✅ Success! Your Telegram account has been linked to this Kinobi instance.',
                        });
                        linkEstablished = true;
                        break; // Exit loop once found
                    }
                }
            }
        }

        if (!linkEstablished) {
            await callTelegramApi('sendMessage', {
                chat_id: chatId,
                text: '❌ Invalid or expired linking code. Please generate a new one from the app settings.',
            });
        }
    } catch (error) {
        console.error('Error in handleLinkingToken:', error);
        // Inform the user of an internal error
        await callTelegramApi('sendMessage', {
            chat_id: chatId,
            text: 'An internal error occurred. Please try again later.',
        });
    }
}

async function handleStartCommand(chatId: number) {
    const text = `Welcome to the Kinobi Bot! 👋

Here's how to get started:
1.  **Link your account:** Get a 6-digit code from the Kinobi web app's settings page and send it to me.
2.  **Log chores:** Use the /log command to record completed chores.

For more details, use the /help command.`;

    await callTelegramApi('sendMessage', {
        chat_id: chatId,
        text: text,
    });
}

async function handleHelpCommand(chatId: number) {
    const text = `*Kinobi Bot Help*

*Commands*
-   \`/start\`: Shows the welcome message.
-   \`/log\`: Starts the interactive process to log a completed chore.
-   \`/help\`: Shows this help message.

*Linking Your Account*
To use the \`/log\` command, you must first link your Telegram account to your Kinobi instance.
1.  Open the Kinobi web application.
2.  Go to the Settings page.
3.  Under "Telegram Notifications", click "Generate Linking Code".
4.  Send the 6-digit code you receive to me in a message.

*Notifications*
If a "Channel ID" is set in the web app's settings, this bot will send a notification to that channel whenever a chore becomes overdue.`;

    await callTelegramApi('sendMessage', {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
    });
} 