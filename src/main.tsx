import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const authProvider = (import.meta.env.VITE_AUTH_PROVIDER || 'clerk').toLowerCase();

if (authProvider !== 'native') {
  const { Clerk } = await import("@clerk/clerk-js");
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("Add your VITE_CLERK_PUBLISHABLE_KEY to the .env file");
  }
  const clerkDomain = atob(publishableKey.split("_")[2]).slice(0, -1);
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load @clerk/ui bundle"));
    document.head.appendChild(script);
  });
  const clerk = new Clerk(publishableKey);
  await clerk.load({ ui: { ClerkUI: (window as any).__internal_ClerkUICtor } });
  (window as any).__scip_clerk__ = clerk;
}

createRoot(document.getElementById('root')!).render(<App />);
