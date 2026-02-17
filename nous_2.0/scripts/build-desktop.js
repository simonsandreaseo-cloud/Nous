const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiDir = path.join(__dirname, '../src/app/api');
const apiBackup = path.join(__dirname, '../src/app/api_hide');

// 1. Hide API routes (Vercel needs them, Tauri hates them in export)
if (fs.existsSync(apiDir)) {
    console.log('📦 Hiding API routes for Desktop Build...');
    fs.renameSync(apiDir, apiBackup);
}

try {
    // 2. Run Next.js Build with TAURI_BUILD flag
    console.log('🚀 Building Next.js for Desktop (Static Export)...');

    // Set env var for this process
    process.env.TAURI_BUILD = 'true';

    // Run build
    execSync('next build', { stdio: 'inherit', env: { ...process.env, TAURI_BUILD: 'true' } });

    console.log('✅ Build Success!');
} catch (error) {
    console.error('❌ Build Failed:', error);
    process.exit(1);
} finally {
    // 3. Restore API routes no matter what
    if (fs.existsSync(apiBackup)) {
        console.log('♻️ Restoring API routes...');
        fs.renameSync(apiBackup, apiDir);
    }
}
