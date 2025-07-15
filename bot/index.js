import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Get webapp URL from environment
const WEBAPP_URL = process.env.TELEGRAM_WEBAPP_URL || 'https://visionbones.app';

// Handle /start command - Launch the Mini App
bot.command('start', (ctx) => {
  const welcomeMessage = `Welcome to VisionBones! 🎯

Track your domino stats across all platforms in one place.

Click the button below to open the app:`;

  ctx.reply(welcomeMessage, {
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🎮 Open VisionBones',
          web_app: { url: WEBAPP_URL }
        }
      ]]
    }
  });
});

// Handle any text message - Always show the launch button
bot.on('text', (ctx) => {
  ctx.reply('Click the button below to open VisionBones:', {
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🎮 Open VisionBones',
          web_app: { url: WEBAPP_URL }
        }
      ]]
    }
  });
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('Sorry, something went wrong. Please try again.');
});

// Launch bot
bot.launch()
  .then(() => {
    console.log('VisionBones bot is running...');
    console.log(`Webapp URL: ${WEBAPP_URL}`);
  })
  .catch((err) => {
    console.error('Failed to launch bot:', err);
    process.exit(1);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));