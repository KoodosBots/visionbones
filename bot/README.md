# VisionBones Bot

Minimal Telegram bot that launches the VisionBones Mini App.

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) on Telegram
2. Copy `.env.example` to `.env` and add your bot token
3. **Docker Deployment**: Run from project root with `docker-compose up -d`
4. **Local Development**: `npm install && npm start` (or `npm run dev`)

## Features

- Single purpose: Launch the VisionBones Mini App
- Responds to /start command
- Shows webapp button for any text message
- No complex logic or database

## Environment Variables

- `TELEGRAM_BOT_TOKEN` - Your bot token from BotFather
- `TELEGRAM_WEBAPP_URL` - URL of your deployed Mini App (https://your-domain.com)