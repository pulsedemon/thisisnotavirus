import { defineConfig } from "vite";
import { resolve } from "path";
import { glob } from "glob";
import { readFileSync, existsSync } from "fs";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig(() => {
  const virusTargets = glob.sync("viruses/*/").flatMap((dir) => {
    const name = dir.split("/")[1];
    const base = dir.replace(/\/$/, "");
    const targets: { src: string; dest: string }[] = [];
    if (existsSync(`${base}/images.json`)) {
      targets.push({ src: `${base}/images.json`, dest: `viruses/${name}` });
    }
    if (existsSync(`${base}/images`)) {
      targets.push({
        src: `${base}/images/**`,
        dest: `viruses/${name}/images`,
      });
    }
    if (existsSync(`${base}/explosions`)) {
      targets.push({
        src: `${base}/explosions/**`,
        dest: `viruses/${name}/explosions`,
      });
    }
    const extraFiles = glob.sync(
      `${base}/*.{png,webp,gif,jpg,jpeg,svg,mp3,mp4,webm,ogg}`,
    );
    if (extraFiles.length > 0) {
      targets.push({
        src: `${base}/*.{png,webp,gif,jpg,jpeg,svg,mp3,mp4,webm,ogg}`,
        dest: `viruses/${name}`,
      });
    }
    return targets;
  });

  return {
    // Multi-page app setup
    appType: "mpa",
    // Enable TypeScript support
    esbuild: {
      target: "es2020",
    },

    // CSS preprocessing
    css: {
      preprocessorOptions: {
        scss: {
          // Add any global SCSS variables/mixins here if needed
        },
      },
    },

    // Plugin configuration
    plugins: [
      // Dev-only guard to prevent serving build artifacts
      {
        name: "block-build-artifacts-in-dev",
        apply: "serve",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (
              req.url &&
              (req.url.startsWith("/build") || req.url.startsWith("/dist"))
            ) {
              res.statusCode = 404;
              res.end("Not Found");
              return;
            }
            next();
          });
        },
      },
      // Virus URL redirect middleware
      {
        name: "virus-redirect",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url;
            const secFetchDest = req.headers["sec-fetch-dest"];

            // Only redirect browser navigation requests, not iframe/embed requests
            if (
              url &&
              url.match(/^\/viruses\/([^/]+)\/?$/) &&
              secFetchDest !== "iframe"
            ) {
              const virusName = url.match(/^\/viruses\/([^/]+)\/?$/)?.[1];
              if (virusName && virusName !== "lab") {
                const redirectUrl = `/?virus=${virusName}`;
                res.writeHead(302, { Location: redirectUrl });
                res.end();
                return;
              }
            }
            next();
          });
        },
      },
      // Official plugin for copying static assets
      viteStaticCopy({
        targets: [
          { src: "css/reset.css", dest: "css" },
          { src: "images/*", dest: "images" },
          ...virusTargets,
        ],
      }),
      // Custom plugin to handle .hbs files
      {
        name: "handlebars-loader",
        transform(code: string, id: string) {
          if (id.endsWith(".hbs")) {
            const template = readFileSync(id, "utf-8");
            return `export default function() { return ${JSON.stringify(template)}; }`;
          }
          return null;
        },
      },
    ],

    // Development server configuration
    server: {
      port: 5174,
      open: true,
      // Ensure virus directories are served correctly in development
      fs: {
        strict: true,
      },
    },

    // Build configuration
    build: {
      // Output to dist instead of build
      outDir: "dist",

      // Generate source maps
      sourcemap: true,

      // Multi-entry build configuration
      rollupOptions: {
        input: [
          resolve(__dirname, "index.html"),
          ...glob
            .sync("./viruses/*/index.html")
            .map((p) => resolve(__dirname, p)),
        ],
        output: {
          // Keep the same naming pattern as webpack
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]",
        },
      },

      // Target modern browsers (since we removed legacy support)
      target: "es2020",
    },

    // Define global variables (equivalent to webpack.DefinePlugin)
    define: {
      "process.env.API_BASE_URL": JSON.stringify(
        process.env.API_BASE_URL || "",
      ),
    },

    // Resolve configuration
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".json"],
    },
  };
});
