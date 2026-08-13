# StudyHub ✨

A modern, interactive study portal built specifically for Generation Z students, featuring a sleek UI and powerful learning tools.

## 🚀 Features

- Modern and responsive user interface using Tailwind CSS
- Interactive components powered by shadcn/ui and Radix UI
- Beautiful icons from Lucide React
- Smooth animations with Framer Motion

## 🛠️ Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite+ https://viteplus.dev/
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui + Radix UI
- **Icons:** Lucide React
- **Animations:** Framer Motion

## 📦 Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/beckheck/gen-z-study-portal.git
   cd gen-z-study-portal
   ```

2. Install dependencies:

   ```sh
   vp install
   ```

3. Start the development server:

   ```sh
   vp dev
   ```

## 🔧 Scripts

- `vp dev` - Start development server
- `vp build` - Build for production
- `vp preview` - Preview production build

## 🌍 GitHub Pages Deployment

The web app is an installable PWA. Pushing to `main` triggers the [release workflow](.github/workflows/release.yml), which builds and deploys to GitHub Pages.

### First-time setup

1. Go to **Settings -> Pages** in the repository.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the Actions tab).

The app is available at `https://<owner>.github.io/gen-z-study-portal/`.

## 💻 System Requirements

- Node.js 22 or later
- Modern web browser (Chrome, Firefox, Safari, Edge)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
