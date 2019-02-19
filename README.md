# Baneksbot

Bot for getting aneks from https://vk.com/baneks

## Installation

```bash
yarn
```

## Develompent

```bash
yarn start-dev
```

## Production start

```bash
yarn build
yarn start
```

## Testing

```bash
yarn test
```

## Available commands

`/anek` - Get random anek

`/top_day` - Get most popular anek per 24 hours

`/top_week` - Get most popular anek per 7 days

`/top_month` - Get most popular anek per 30 days

`/top_ever` - Get most popular anek of all time

`/subscribe` - Subscribe to new aneks broadcast

`/unsubscribe` - Unsubscribe from new aneks broadcast

## Code overview

### Models

All available models are located in `models` directory

### Telegram

All telegram based logic is located in `telegram.ts` file. Here you can find all available types
and almost all methods which are used in this bot.

### VK

This model contains all types and methods which are required for getting posts and comments from open groups.

### Bot

Here you can find all bot related logic

- Converting VK aneks to Telegram messages
- Converting VK attachments to Telegram attachments
- Helpers for creating inline and reply buttons.
- Events on messages, replies, inline queries etc.

Also this model contains `Express` middleware, which gets `Update` from webhook request
and add `user` and `message` fields into it.

### Network

This model is responsible for communicating with API and fulfilling multiple responses as one promise.

### Queue

This model takes care of creating requests queue for sending them with rates and limits of service.
e.g. Telegram has rates/limits of 1 message per second for private messages and 30 messages per second for 
broadcasting. This model creates queues with configuration via config and helps you not caring about
delays and limits of sending per second.

Each request has hidden fields for operating queue:

- `_key`: Unique key of queue (e.g. for private messages)
- `_rule`: Rule name of queue, which is described in config
- `_getRetry`: function for getting retry timeout in case if you get 429 error

Every request in bot goes through this model.

## Helpers

Directory `helpers` contains bot specific helpers and functions which contains

### Commands

This file describes all available commands and events in bots.
It's kinda entry point for all bot communications.

## DB updater

This daemon starts as a child process in order to not disturb main thread when you're broadcasting aneks or updating all database.

## BotAPI

File `botApi.ts` joins all models and daemons and allows communicating between them.

## Contribution

Feel free to contribute and create pull requests. I'll really appreciate 
every your change to make this bot better.
