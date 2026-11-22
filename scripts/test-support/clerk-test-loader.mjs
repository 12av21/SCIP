// Test-only ESM loader: redirects `@clerk/backend` to a local shim so HTTP
// integration tests can authenticate without a real Clerk instance or keys.
// This affects only the process that registers it (tests); production code and
// runtime behavior are unchanged.
const shimUrl = new URL('./clerk-test-shim.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@clerk/backend') {
    return { url: shimUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}