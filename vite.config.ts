import { execSync } from "node:child_process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function readCommitHash(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __COMMIT_HASH__: JSON.stringify(readCommitHash()),
  },
  build: {
    rollupOptions: {
      output: {
        // Every visual's property registry (200-450 properties each) was
        // landing in one ~700KB chunk, so editing/regenerating one visual's
        // registry busted the browser cache for all ten. Split each into
        // its own chunk instead — still all loaded eagerly today (every
        // visual is visible by default), but they cache independently and
        // load in parallel rather than as one blocking chunk.
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
          const libMatch = id.match(/[\\/]app[\\/]lib[\\/]([A-Za-z]+)\.ts$/);
          if (libMatch) {
            const name = libMatch[1];
            if (name === "properties" || name === "theme" || name === "chromeProperties") {
              return "lib-shared";
            }
            return `registry-${name.replace(/Properties$/, "")}`;
          }
        },
      },
    },
  },
});
