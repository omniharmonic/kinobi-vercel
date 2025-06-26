import 'dotenv/config';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/telegram` : process.argv[2];

if (!botToken) {
    console.error('Error: TELEGRAM_BOT_TOKEN is not defined in your environment variables.');
    process.exit(1);
}

if (!webhookUrl) {
    console.error('Error: Webhook URL not provided.');
    console.log('Usage: bun scripts/set-telegram-webhook.ts <YOUR_WEBHOOK_URL>');
    console.log('Alternatively, set VERCEL_URL environment variable.');
    process.exit(1);
}

async function setWebhook() {
    const apiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ["message", "callback_query"]
            }),
        });

        const result = await response.json();

        if (result.ok) {
            console.log('✅ Webhook set successfully!');
            console.log(`URL: ${webhookUrl}`);
            console.log(`Result: ${result.description}`);
        } else {
            console.error('❌ Failed to set webhook:');
            console.error(`Error ${result.error_code}: ${result.description}`);
        }
    } catch (error) {
        console.error('An unexpected error occurred:', error);
    }
}

setWebhook(); 