# Lamp

[English](README.md) | [简体中文](./doc/README_zh-CN.md) | [Official Website](https://www.shaloong.com/lamp/)

This is an editor for writer, which is developed by Shaloong. We hope your creation is as free as using the Aladdin lamp to fulfill your wishes.

Shaloong is not a formal company now, just an organization for fun. Sometimes I will write some interesting things and public in the name of Shaloong. If you are interested in Shaloong, you can visit [our official website](https://www.shaloong.com/).

## Installation

For Windows, MacOS and Linux, you can download the release and install.

## Development

Launch both the Vite dev server (port 1086) and the Electron shell with one command:

```bash
pnpm run dev:desktop
```

If you prefer to run them separately you still can:

1. `pnpm run dev -- --port 1086`
2. `pnpm run auto-start`

## Distribution

`pnpm run dist` wraps everything with electron-builder and produces a regular installer; once installed, users launch Lamp like any other desktop app.

## AI configuration

Open **Settings → AI 接口** inside Lamp to set the base URL and API key for your provider. The values are securely persisted to `config.json`, so you only need to enter them once per machine.
