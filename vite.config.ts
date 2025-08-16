import { defineConfig } from 'vite';
import { resolve } from 'path';
import { glob } from 'glob';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import Handlebars from 'handlebars';

// Function to discover all virus entry points (same logic as webpack config)
async function getEntryPoints() {
  const jsFiles = await glob('./viruses/*/*.[jt]s');
  const entries: Record<string, string> = {};
  
  jsFiles.forEach((filepath) => {
    const filename = filepath.split('/').slice(-1)[0].split('.')[0];
    entries[filename] = resolve(__dirname, filepath);
  });
  
  // Add main entry point
  entries['main'] = resolve(__dirname, './main.ts');
  
  return entries;
}

export default defineConfig(async () => {
  const entries = await getEntryPoints();
  
  return {
    // Enable TypeScript support
    esbuild: {
      target: 'es2020'
    },
    
    // CSS preprocessing
    css: {
      preprocessorOptions: {
        scss: {
          // Add any global SCSS variables/mixins here if needed
        }
      }
    },
    
    // Plugin configuration
    plugins: [
      // Official plugin for copying static assets
      viteStaticCopy({
        targets: [
          {
            src: 'css/reset.css',
            dest: 'css'
          },
          {
            src: 'images/*',
            dest: 'images'
          },
          {
            src: 'viruses/*/images.json',
            dest: 'viruses'
          },
          {
            src: 'viruses/*/images/*',
            dest: 'viruses'
          },
          {
            src: 'viruses/*/explosions/*',
            dest: 'viruses'
          },
          {
            src: 'viruses/*/*.{png,webp,gif,jpg,jpeg}',
            dest: 'viruses'
          }
        ]
      }),
      // Custom plugin to handle .hbs files
      {
        name: 'handlebars-loader',
        transform(code: string, id: string) {
          if (id.endsWith('.hbs')) {
            // Read and compile the handlebars template
            const template = readFileSync(id, 'utf-8');
            const compiled = Handlebars.compile(template);
            // Return the compiled template as a function
            return `export default ${compiled.toString()};`;
          }
        }
      },
      // Custom plugin to copy virus HTML files to dist structure
      {
        name: 'copy-virus-html',
        apply: 'build', // Only run during build, not dev
        async closeBundle() {
          const virusFiles = await glob('./viruses/*/index.html');
          console.log('Found virus files:', virusFiles);
          
          virusFiles.forEach((htmlFile) => {
            // Extract virus name from path like ./viruses/buttons/index.html
            const pathParts = htmlFile.replace('./', '').split('/');
            const virusName = pathParts[1]; // viruses/NAME/index.html -> NAME
            console.log(`Processing virus: ${virusName} from ${htmlFile}`);
            
            const destDir = resolve(__dirname, 'dist/viruses', virusName);
            const destFile = resolve(destDir, 'index.html');
            
            try {
              mkdirSync(destDir, { recursive: true });
              
              // Read the original HTML and update script path to point to the built JS file
              let htmlContent = readFileSync(htmlFile, 'utf-8');
              
              // Replace the script source to point to the root-level built JS file
              htmlContent = htmlContent.replace(
                `src="/build/${virusName}.js"`,
                `src="/${virusName}.js" type="module"`
              );
              
              // Also handle potential variations and ensure type="module" is present
              htmlContent = htmlContent.replace(
                `/build/${virusName}.js`,
                `/${virusName}.js" type="module`
              );
              
              // Handle cases where type="module" might already exist
              htmlContent = htmlContent.replace(
                `src="/${virusName}.js" type="module" type="module"`,
                `src="/${virusName}.js" type="module"`
              );
              
              // Add virus-specific CSS file link before the closing </head> tag
              htmlContent = htmlContent.replace(
                '</head>',
                `    <link rel="stylesheet" href="/${virusName}.css" type="text/css" media="screen" />\n  </head>`
              );
              
              // Write the updated HTML
              writeFileSync(destFile, htmlContent);
              console.log(`✅ Copied virus HTML: ${virusName} -> ${destFile}`);
            } catch (error) {
              console.warn(`❌ Failed to copy ${htmlFile}:`, error);
            }
          });
        }
      }
    ],
    
    // Development server configuration
    server: {
      open: true,
      // Ensure virus directories are served correctly in development
      fs: {
        strict: false
      }
    },
    
    // Build configuration
    build: {
      // Output to dist instead of build
      outDir: 'dist',
      
      // Generate source maps
      sourcemap: true,
      
      // Multi-entry build configuration
      rollupOptions: {
        input: {
          // Include index.html as the main entry point
          index: resolve(__dirname, 'index.html'),
          // Add all virus entries
          ...Object.fromEntries(
            Object.entries(entries).filter(([key]) => key !== 'main')
          )
        },
        output: {
          // Keep the same naming pattern as webpack
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]'
        }
      },
      
      // Target modern browsers (since we removed legacy support)
      target: 'es2020'
    },
    
    // Define global variables (equivalent to webpack.DefinePlugin)
    define: {
      'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL || '')
    },
    
    // Resolve configuration
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json']
    }
  };
});
