import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";

// ==================================================
// PROTECTED ROUTES
// ==================================================

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/workspace(.*)",
]);

// ==================================================
// CLERK MIDDLEWARE
// ==================================================

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;

  // Protect dashboard and workspace pages.
  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  // API authentication is checked separately inside
  // each API route. Do not bypass those checks here.
  if (
    pathname.startsWith("/api/boards") &&
    process.env.NODE_ENV === "development"
  ) {
    console.debug(
      `[Clerk middleware] ${request.method} ${pathname}`
    );
  }
});

// ==================================================
// NEXT.JS 16 PROXY CONFIGURATION
// ==================================================

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};