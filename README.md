# Kore Essentials — storefront demo

A responsive dark-mode storefront built with React, Vite, Tailwind CSS v4, Framer Motion, and Lucide icons.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

### 1. Frontend (React + Vite)
```bash
npm install
npm run dev
```

### 2. Backend (FastAPI + Groq API Chatbot)
```bash
pip install -r backend/requirements.txt
npm run backend
# or: python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

For a production frontend build:

```bash
npm run build
npm run preview
```


## Included interactions

- Sticky navigation with a responsive mobile menu
- Scroll-reveal product cards and hover/tap motion
- Add-to-bag controls, item quantities, subtotal, and a cart drawer
- Floating customer-support chat with spring open/close animation, preset questions, message input, typing indicator, and sample replies
- Email newsletter form with basic client-side validation and success feedback
- Reduced-motion preference support and keyboard focus styles

## Before launch

This is a front-end storefront demo. The checkout button is deliberately not connected to a payment service; chat replies are sample responses; product prices/content are sample data. Connect a commerce backend, real customer support, shipping/returns policy pages, analytics, privacy/consent handling, and production product imagery before deploying for real sales.

Product and hero photography is loaded from Unsplash URLs; the browser needs internet access for those images and Google Fonts.
