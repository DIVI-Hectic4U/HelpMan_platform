<div align="center">

# ⚡ HelpMan — Gamified AI Placement Preparation Platform

**Daily AI-curated coding problems delivered via Telegram. Level up with XP, streaks, and leaderboards.**

[![Built with Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-316192?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

## 🎯 Overview

**HelpMan** is an AI-powered placement preparation platform that automatically generates personalized daily coding tasks based on your Codeforces and LeetCode profiles. Tasks are delivered via Telegram and tracked with a gamification system including XP, streaks, ranks, and leaderboards.

### The Problem
- Students preparing for placements lack structured daily practice
- Existing platforms don't personalize problem selection to skill level
- No motivation system to maintain consistency during stressful seasons

### The Solution
- **AI Engine**: Gemini AI analyzes your ratings, weak topics, and history to generate 3 targeted problems daily
- **Telegram Delivery**: Receive tasks right where you chat using our Telegram Bot
- **Gamification**: XP with log-capped streak multipliers, rank progression (Bronze → Master), and competitive leaderboards

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Task Engine** | Gemini AI generates personalized daily problems from CF/LC |
| 📱 **Telegram Bot** | Quick daily delivery of tasks using `/daily` via Telegram |
| 🔥 **Streak System** | Log-capped multipliers reward consistency fairly |
| 🏆 **Rank Progression** | Progress from Bronze → Silver → Gold → Platinum → Master |
| 📊 **Dashboard** | Premium dark-mode UI with XP progress, stats, and tasks |
| 👥 **Leaderboard** | Top-3 podium + full ranking table |
| ⚙️ **Settings** | Profile, linked accounts, and difficulty preferences |
| 🛡️ **Admin Panel** | System stats, user management, and rank distribution |
| 🔒 **Security** | JWT auth, webhook signature verification, and rate limiting |
| 🗃️ **Audit Trail** | Every XP transaction is logged securely |

---

## 🏗 Architecture

HelpMan is built on a modern, decoupled architecture designed for scale and responsiveness. It utilizes a **Next.js frontend** for a dynamic user dashboard, and an **Express.js backend** acting as the central nervous system for API integrations, AI task generation, and the Telegram bot.

### System Flow

```mermaid
graph TD
    %% Clients
    User((Telegram User))
    Web((Web Dashboard User))
    
    %% Frontend
    subgraph Frontend [Next.js Application]
        Dashboard[User Dashboard]
        AdminPanel[Admin Panel]
    end
    
    %% Backend
    subgraph Backend [Express API Server]
        Webhook[Telegram Webhook]
        Tasks[Task Management]
        XP[XP & Gamification Engine]
    end
    
    %% External APIs
    subgraph External [External Services]
        Gemini[Google Gemini AI]
        TelegramAPI[Telegram API]
        CF_LC[Codeforces & LeetCode]
    end
    
    %% Database
    DB[(Neon PostgreSQL)]
    
    %% Connections
    User <-->|/daily, /status| TelegramAPI
    TelegramAPI <-->|Webhook POST| Webhook
    Web <-->|REST API| Backend
    
    Webhook --> Tasks
    Tasks --> Gemini
    Tasks --> CF_LC
    Tasks --> XP
    
    Backend <-->|Prisma ORM| DB
```

### How the Magic Works (The `/daily` Command)
1. **Trigger**: You send `/daily` to the Telegram Bot.
2. **Data Gathering**: The Express backend instantly fetches your live Codeforces and LeetCode ratings.
3. **AI Generation**: A structured prompt containing your ratings and weak topics is sent to **Google Gemini AI**.
4. **Processing**: Gemini returns 3 perfectly tailored coding problems. The backend validates this and securely stores it in **PostgreSQL**.
5. **Delivery**: The server formats the tasks into a rich message and delivers it back to you on Telegram.

---

<div align="center">

**Built with ❤️ by Divyanshu**

⚡ *Start your placement prep journey today!* ⚡

</div>
