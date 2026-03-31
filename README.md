# Vitalis AI 🧬

An AI-powered, in-silico drug discovery platform designed specifically for researchers, institutions, and students in Kenya and across Africa. 

---

## 🌍 The Mission
Historically, discovering life-saving drugs has taken 10+ years and billions of dollars in offshore labs. **Vitalis AI** is built to change the narrative. We bring computational drug discovery capabilities directly to local African researchers. By utilizing AI to predict molecular binding, screen virtual compounds, and analyze drug safety properties early, we make the drug discovery process **10x faster** and **1000x cheaper**.

## 🚀 Key Features

* **AI Virtual Screening**: Rapidly predict and calculate molecule binding affinity against your chosen protein targets.
* **Molecule Analyzer**: Interactively design, draw, and modify molecular structures. Uncover their properties immediately.
* **Africa-Focused**: Prioritizes treatments for diseases critically affecting the African continent, such as Malaria, Tuberculosis, and more.
* **Educational Classrooms**: Specific tools designed to help university students and educators learn drug discovery via practical, guided simulation tasks.
* **Subscription & Workspaces**: Fully integrated tier-based subscription limits, team workflows, and comprehensive usage tracking.

## 🏗️ Architecture Stack

This project is separated into a **Frontend** interface and a **Backend** server layer.

### Frontend
- **Framework:** React + Vite + TypeScript
- **Styling:** Tailwind CSS, shadcn-ui UI components
- **Purpose:** Handles the workspace dashboard, interactive tutorials, educational flows, and complex UI like the Molecule Analyzer.

### Backend
- **Framework:** Node.js + Express.js
- **Database:** MongoDB (using Mongoose)
- **Purpose:** Securely processes JWT Authentication, Stripe Subscriptions integrations, usage metering, and handles AI API bindings to molecule/prediction engines.

---

## 💻 Getting Started (Local Development)

### Prerequisites:
- **Node.js** & **npm** installed
- **MongoDB** running (either locally or via MongoDB Atlas)

### 1. Structure
Navigate into either the root (frontend) or `backend` folder depending on what you want to work on.

### 2. Run the Backend Server
```sh
cd backend
npm install

# Make sure you setup your .env file inside backend!
npm start
```
The backend server will typically start on `http://localhost:5000`.

### 3. Run the Frontend App
Open a new terminal session and navigate to the project root:
```sh
npm install
npm run dev
```
The frontend Vite server will be available on `http://localhost:8080` (or another port output by Vite).

---

## 🗺️ Project Status & Roadmap

Currently, Vitalis AI features a nearly 100% complete and robust backend boilerplate, while the frontend UI remains in a prototype phase using static mock data.

**Current Active Goals:**
1. **API Integration**: Connect the frontend to the backend so the UI is driven by live MongoDB data instead of hardcoded objects.
2. **Secure Payments & Auth**: Ensure Stripe subscription upgrades and JWT token authentication are verified accurately through the backend route barriers.
3. **UX Overhaul**: Modify the design and copy to strictly reflect our focus on the African health use-case.
