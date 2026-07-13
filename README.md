# 🚀 Multi-Tenant Loan Journey System

A high-performance, **configuration-driven** loan application engine built with Next.js 14+. This system allows multiple financial organizations (tenants) to run unique, branded loan journeys using a single, unified codebase.

---

## ✨ Key Features

- **Multi-Tenancy**: Dynamic routing using `[orgSlug]` (e.g., `/cosmos`, `/hdfc`) that automatically applies organization-specific branding, logos, and API logic.
- **Config-Driven UI**: Forms are built at runtime from JSON definitions. Adding a field or a step requires zero code changes.
- **Step Registry Pattern**: Decouples specialized UI logic (like OTP/Captcha) from the core routing engine.
- **Reactive Sidebar**: A real-time `VerticalProgressBar` that tracks user completion across dynamic steps.
- **Zustand State Management**: A lightweight "Single Source of Truth" for all form data and progress navigation.
- **Premium UX/UI**: Built with Tailwind CSS, Framer Motion animations, and a focus on accessibility and speed.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **State Management**: Zustand
- **Styling**: Tailwind CSS / CSS Modules
- **Validation**: Zod (planned)
- **Animation**: Lucide Icons / Framer Motion
- **Language**: TypeScript

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Node.js 18+** installed on your machine.

### 2. Installation
Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd <project-folder>
npm install
```

### 3. Run the Development Server
Start the local server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 📖 Usage & Navigation

To view a specific bank's journey, use the following URL pattern:
`http://localhost:3000/[orgSlug]/[journeyType]`

### Examples:
- **Cosmos Bank (Personal Loan)**: `http://localhost:3000/cosmos/personal`
- **Cosmos Bank (Home Loan)**: `http://localhost:3000/cosmos/home`
- **HDFC Bank (Personal Loan)**: `http://localhost:3000/hdfc/personal`

---

## 📂 Project Structure

- **`/app/(public)/[orgSlug]/[journeyType]`**: The dynamic hub for all journey routes.
- **`/app/_components/journey/`**: Core journey logic including the `StepRenderer` and `AuthStep`.
- **`/app/_config/`**: The "Blueprints" — where all bank metadata and field definitions live.
- **`/app/_store/`**: Global state management (Zustand).
- **`/app/docs/`**: Internal developer documentation and onboarding guides.

---

## 📝 Documentation
For a deep dive into the architecture and working logic, please refer to the internal docs:

1. [System Architecture](./app/docs/journey/1-architecture.md)
2. [Data Flow & Lifecycle](./app/docs/journey/2-working.md)

---

## 🤝 Contributing
For adding new fields, organizations, or journey types, please follow the guidelines in the **Architecture Documentation** to ensure the multi-tenant engine remains clean and maintainable.
