# 📝 Examination Portal

A full‑stack, multi‑role web application for managing and taking exams online. Built with Next.js, TypeScript, Prisma, and Tailwind CSS.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-ORM-green) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8) ![License](https://img.shields.io/badge/license-MIT-purple)

---

## ✨ Features

- **Role‑based dashboards** – separate interfaces for Admins, Examiners, and Students.
- **AI‑powered bulk import** – paste raw question text and let the AI (or built‑in regex parser) auto‑generate structured questions.
- **Question builder** – supports Multiple Choice, True/False, and Short Answer types.
- **Timed exams** – full‑screen test environment with countdown timer, auto‑save, and auto‑submit.
- **Auto‑grading** – instant scoring for objective questions; manual grading for short answers.
- **Results & analytics** – detailed student performance views and global admin reports.
- **Modern UI** – responsive, dark mode, toast notifications, and clean design with shadcn/ui.

---

## 🛠️ Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Frontend    | Next.js 14 (App Router), React 18, TypeScript   |
| Styling     | Tailwind CSS, shadcn/ui, next‑themes            |
| Backend     | Next.js API Routes / Server Actions             |
| Database    | PostgreSQL + Prisma ORM                         |
| Auth        | NextAuth.js (Credentials)                       |
| Validation  | Zod + react‑hook‑form                           |
| AI          | OpenAI (GPT-4o mini) for question parsing       |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (local or cloud)
- An OpenAI API key (optional – for AI parsing, falls back to regex)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd examination-portal
