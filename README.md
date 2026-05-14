# CVision

An intelligent web application that helps users analyze and improve their resumes using AI. Built with real-time feedback, PDF parsing capabilities, and state-of-the-art UI.

**Live Demo**: [https://jsm-ai-resume-analyzer-82-ls5u8.puter.site/](https://jsm-ai-resume-analyzer-82-ls5u8.puter.site/)

## Features

- **Resume Upload**: Easily upload your resume via a drag-and-drop interface (`react-dropzone`).
- **PDF Extraction**: Extracts text directly from your resume securely in the browser using `pdfjs-dist`.
- **AI Analysis**: Get instantaneous, actionable feedback tailored to your resume's content.
- **Modern UI**: Polished, responsive design utilizing TailwindCSS.
- **Fast Navigation**: Fluid user experience managed by React Router v7 and Zustand for efficient state management.
- **Client & Server Integration**: Full-stack capabilities utilizing React Router's modern architecture.

## Tech Stack

- **Framework**: [React Router v7](https://reactrouter.com/) (formerly Remix)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **PDF Processing**: `pdfjs-dist`
- **TypeScript**: First-class support for end-to-end type safety.

## Getting Started

### Prerequisites

Ensure you have Node.js (v22 or later) and npm installed.

### Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### Development

Start the development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production-ready optimized build:

```bash
npm run build
```

To run the production server:

```bash
npm run start
```

## Docker Deployment

This application includes a `Dockerfile` for easy containerization.

```bash
# Build the Docker image
docker build -t cvision .

# Run the container
docker run -p 3000:3000 cvision
```

## Project Structure

```
├── app/
│   ├── components/  # Reusable UI components
│   ├── lib/         # Utility functions and shared logic
│   ├── routes/      # Application routes (upload, resume feedback, auth, etc.)
│   └── root.tsx     # Root entry point
├── public/          # Static assets
└── build/           # Compiled server and client build files
```

## License

This project is licensed under the MIT License.

