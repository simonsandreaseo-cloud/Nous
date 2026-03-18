const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiDir = path.join(__dirname, '../src/app/api');
const eslintConfig = path.join(__dirname, '../.eslintrc.json');
const eslintBackup = path.join(__dirname, '../.eslintrc.json.bak');

console.log('🚧 Starting Desktop Build Process...');

function toggleApiRoutes(hide) {
    if (!fs.existsSync(apiDir)) return;

    const files = [];
    function findRoutes(dir) {
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                findRoutes(filePath);
            } else if (hide && file === 'route.ts') {
                files.push(filePath);
            } else if (!hide && file === 'route.ts_disabled') {
                files.push(filePath);
            }
        });
    }

    findRoutes(apiDir);

    files.forEach(file => {
        const newPath = hide ? file + '_disabled' : file.replace('_disabled', '');
        console.log(`📦 ${hide ? 'Hiding' : 'Restoring'} ${path.relative(apiDir, file)}...`);
        try {
            fs.renameSync(file, newPath);
        } catch (e) {
            console.error(`⚠️ Failed to ${hide ? 'hide' : 'restore'} ${file}: ${e.message}`);
        }
    });
}

function safeRename(src, dest) {
    if (!fs.existsSync(src)) return;
    try {
        console.log(`📦 Moving ${path.basename(src)} to ${path.basename(dest)}...`);
        fs.renameSync(src, dest);
    } catch (e) {
        console.warn(`⚠️ Rename failed for ${src}, it might be already renamed or locked.`);
    }
}

try {
    // 1. Hide API routes by renaming files (avoiding directory lock issues)
    toggleApiRoutes(true);

    // 2. Disable ESLint temporarily
    safeRename(eslintConfig, eslintBackup);

    // 2.5. Remove "use server" from image-actions.ts for static export compatibility
    const imageActionsPath = path.join(__dirname, '../src/app/node-tasks/image-actions.ts');
    let imageActionsContent = '';
    if (fs.existsSync(imageActionsPath)) {
        console.log('📦 Removing "use server" from image-actions.ts for desktop build...');
        imageActionsContent = fs.readFileSync(imageActionsPath, 'utf8');
        fs.writeFileSync(imageActionsPath, imageActionsContent.replace(/"use server";/g, '// "use server" removed for desktop build'), 'utf8');
    }

    // 3. Run Next.js Build with TAURI_BUILD flag
    console.log('🚀 Building Next.js for Desktop (Static Export)...');

    // Set env var for this process
    process.env.TAURI_BUILD = 'true';

    // Run build using npx to ensure local binary is found
    execSync('npx next build', { stdio: 'inherit', env: { ...process.env, TAURI_BUILD: 'true' } });

    console.log('✅ Build Success!');

} catch (error) {
    console.error('❌ Build Failed:', error);
    process.exit(1);

} finally {
    // 4. Restore API routes
    toggleApiRoutes(false);

    // 5. Restore ESLint config
    safeRename(eslintBackup, eslintConfig);

    // 6. Restore "use server" link in image-actions.ts
    const imageActionsPath = path.join(__dirname, '../src/app/node-tasks/image-actions.ts');
    if (fs.existsSync(imageActionsPath)) {
        const content = fs.readFileSync(imageActionsPath, 'utf8');
        if (content.includes('// "use server" removed for desktop build')) {
            console.log('📦 Restoring "use server" in image-actions.ts...');
            fs.writeFileSync(imageActionsPath, content.replace(/\/\/ "use server" removed for desktop build/g, '"use server";'), 'utf8');
        }
    }
}
