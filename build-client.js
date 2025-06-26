import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('🔨 Building Kinobi client for Vercel...');

try {
  // Compile TypeScript
  console.log('📦 Compiling TypeScript...');
  execSync('npx tsc src/main.tsx --outDir public --target ES2020 --module ES2020 --jsx react-jsx --lib ES2020,DOM --moduleResolution node --allowSyntheticDefaultImports --esModuleInterop', { stdio: 'inherit' });

  // Read the compiled JS
  const compiledJs = readFileSync('public/main.js', 'utf8');

  // Create a simple wrapper that works with our HTML setup
  const wrappedJs = `
(function() {
  'use strict';
  
  // React and React-Router-DOM are loaded via CDN
  const React = window.React;
  const ReactDOM = window.ReactDOM;
  const ReactRouterDOM = window.ReactRouterDOM;
  
  // Re-export for our compiled code
  window.React = React;
  window.ReactDOM = ReactDOM;
  
  ${compiledJs}
})();
`;

  // Write the final app.js
  writeFileSync('public/app.js', wrappedJs);
  
  console.log('✅ Client build complete!');
  console.log('📁 Files created:');
  console.log('   - public/app.js (compiled client)');
  console.log('   - public/index.html (entry point)');
  console.log('   - public/manifest.json (PWA manifest)');
  console.log('   - public/sw.js (service worker)');
  console.log('   - public/kinobi_alpha.gif (logo)');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} 