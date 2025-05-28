# MocPulse - AI-Powered Mock Interview Platform

<div align="center">

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-4-646CFF.svg)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-9-orange.svg)](https://firebase.google.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

## 🚀 Overview

MocPulse is a cutting-edge mock interview platform that leverages artificial intelligence to provide personalized interview practice experiences. Built with modern web technologies, it offers a comprehensive solution for job seekers to improve their interview skills through realistic simulations and instant feedback.

## ✨ Key Features

- 🤖 **AI-Powered Interviews**: Dynamic question generation based on job role and experience level
- 📊 **Smart CV Analysis**: Automated resume parsing and skill assessment
- 🎥 **Real-time Interview Recording**: Video and audio recording with playback capabilities
- 📈 **Performance Analytics**: Detailed insights and progress tracking
- 🔒 **Secure Authentication**: Firebase-powered user authentication and data protection
- 💡 **Instant Feedback**: AI-generated feedback on interview responses
- 📱 **Responsive Design**: Seamless experience across all devices
- 🎯 **Customizable Sessions**: Multiple interview types and difficulty levels

## 🛠️ Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Backend & Auth**: Firebase
- **Styling**: TailwindCSS + Shadcn/UI
- **State Management**: React Context + Custom Hooks
- **Testing**: Jest + React Testing Library
- **CI/CD**: GitHub Actions

## 📁 Project Structure

```bash
src/
├── components/    # Reusable UI components
├── routes/        # Application routes and pages
├── layouts/       # Layout components
├── config/        # Configuration files
├── handlers/      # Auth and other handlers
├── lib/           # Utility functions
├── provider/      # Context providers
├── types/         # TypeScript type definitions
└── scripts/       # Helper scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- pnpm 7.x or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Muhammad-Waleed-Khalil/MocPulse-FYP.git
   cd MocPulse-FYP
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in your Firebase configuration details in the `.env` file.

4. Start the development server:
   ```bash
   pnpm dev
   ```

5. Build for production:
   ```bash
   pnpm build
   ```

## 🔧 Environment Configuration

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 🌟 Core Features

### Interview Simulation
- Real-time video recording and playback
- AI-powered question generation
- Dynamic difficulty adjustment
- Multiple interview formats (Technical, Behavioral, etc.)

### Analytics Dashboard
- Performance metrics and trends
- Skill gap analysis
- Interview history tracking
- Personalized improvement suggestions

### CV Management
- Automated CV parsing
- Skill extraction and analysis
- Job role matching
- Improvement recommendations

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add YourFeature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Firebase](https://firebase.google.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Shadcn/UI](https://ui.shadcn.com/)

---

<div align="center">
Made with ❤️ by Muhammad Waleed Khalil
</div>
