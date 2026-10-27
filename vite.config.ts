/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  /**
   * `.env` has to be loaded by hand here.
   *
   * Vite reads `.env` files into `import.meta.env` for the *client*, and does
   * nothing to `process.env` in this file — so `process.env.VITE_API_PROXY_TARGET`
   * was always undefined, the proxy silently fell back to localhost:8000, and
   * every request came back as a non-JSON 500 from a dev server with nothing
   * behind it. `loadEnv` is the documented way to read them in the config.
   *
   * The third argument is the prefix filter; `"VITE_"` is the default and is
   * passed explicitly so it is obvious that is what decides which keys load.
   */
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    /* Without this, a same-origin `/api/v1/...` call hits the dev server, which
     * 404s with an HTML page — and the app reports "Not found" when the real
     * problem is that no backend is listening. Set VITE_API_PROXY_TARGET to
     * where the backend actually is; it defaults to a local one. */
    proxy: {
      "/api/v1": {
        target: env.VITE_API_PROXY_TARGET || "http://localhost:8000",
        changeOrigin: true,
        /* Says which target refused, instead of a bare 500 with no body. */
        configure: (proxy) => {
          proxy.on("error", (error, _req, res) => {
            const target = env.VITE_API_PROXY_TARGET || "http://localhost:8000";
            console.error(`[alva] proxy to ${target} failed:`, error.message);
            if ("writeHead" in res && !res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  detail: `The dev proxy could not reach ${target}. Check VITE_API_PROXY_TARGET in .env, then restart the dev server.`,
                })
              );
            }
          });
        },
      },
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@radix-ui/react-slot",
      "@radix-ui/react-dialog",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-toast",
      "border-beam",
      "thinking-orbs",
      "voice-glow",
      "next-themes",
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
    restoreMocks: true,
    /**
     * Five seconds is not enough under load.
     *
     * These are `userEvent` tests: every keystroke is a real event with its
     * own microtask flush, so a form with a dozen fields is hundreds of
     * them. Run alone they finish in two seconds; run alongside forty other
     * files on a busy machine they tip over the default, and a different
     * test fails each time. That is a scheduling problem being reported as a
     * product one, which is worse than a slow suite.
     */
    testTimeout: 20000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/annotation/**", "src/components/annotators/workspace/**"],
    },
  },
  };
});
