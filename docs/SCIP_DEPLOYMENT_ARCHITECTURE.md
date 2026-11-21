# Deployment Architecture
- Frontend: Vite build → static hosting (nginx/CDN)
- Backend: Express (Node.js) → container/VM
- DB: JSON file (single instance) or MongoDB (opt-in)
- AI: TS deterministic (built-in), optional Gemini/Python
- No horizontal scaling with JSON DB (file lock)
EOF