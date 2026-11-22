// SCIP - Clerk configuration check (no secrets printed)
import 'dotenv/config';
import { createClerkClient } from '@clerk/backend';

const sk = process.env.CLERK_SECRET_KEY || '';
const pk = process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

console.log('secret_present=' + Boolean(sk));
console.log('publishable_present=' + Boolean(pk));

if (pk.includes('_')) {
  const encoded = pk.split('_').slice(2).join('_');
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    console.log('frontend_api=' + decoded.replace(/\$$/, ''));
  } catch { console.log('publishable_decode=ERROR'); }
}

try {
  const res = await fetch('https://api.clerk.com/v1/users?limit=1', {
    headers: { Authorization: `Bearer ${sk}`, 'Content-Type': 'application/json' }
  });
  if (res.ok) {
    const body: any = await res.json();
    console.log('clerk_backend_api=OK sampleUsers=' + (Array.isArray(body) ? body.length : 0));
  } else {
    const text = await res.text();
    console.log('clerk_backend_api=ERROR status=' + res.status + ' ' + text.slice(0, 160));
  }
} catch (e: any) {
  console.log('clerk_backend_api=ERROR ' + String(e?.message || e).slice(0, 200));
}