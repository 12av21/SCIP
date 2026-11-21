// Test-only stand-in for `@clerk/backend`.
//
// `verifyToken(token)` returns `{ sub: token }`. Tests mint a token per user via
// `tokenFor(user)` = `user.clerkUserId ?? "clerk:" + user.id`, and the test setup
// links every seed user to `clerk:<id>` in the isolated temp DB so
// `getUserByClerkId(sub)` resolves. This lets the real auth middleware run
// unchanged while exercising role/permission logic over HTTP.
//
// Never import this outside tests.
export async function verifyToken(token) {
  return { sub: String(token) };
}