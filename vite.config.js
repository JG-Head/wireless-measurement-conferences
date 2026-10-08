import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { readFileSync } from "node:fs";

const repoBase = "/wireless-measurement-conferences/";

function previewBase() {
  return {
    name: "preview-base",
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url || "";
        if (url === repoBase || url.startsWith(repoBase)) {
          const rest = url.slice(repoBase.length - 1);
          req.url = rest.startsWith("/") ? rest : `/${rest}`;
        }
        next();
      });
    }
  };
}

function serveSourceData() {
  const files = {
    "/data/conferences.json": "data/conferences.json",
    "/data/affinity.json": "data/affinity.json"
  };
  return {
    name: "serve-source-data",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || "").split("?")[0];
        const file = files[path];
        if (!file) return next();
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(readFileSync(file));
      });
    }
  };
}

export default defineConfig(({ command }) => ({
  plugins: [vue(), serveSourceData(), previewBase()],
  base: command === "build" ? repoBase : "/",
  build: {
    outDir: "docs",
    emptyOutDir: true
  }
}));
