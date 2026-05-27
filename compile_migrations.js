const fs = require('fs');
const path = require('path');

function compile() {
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    const allMigrationsFile = path.join(__dirname, 'supabase', 'all_migrations.sql');

    console.log(`Reading migration files from ${migrationsDir}...`);
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort(); // Alphabetic sort guarantees chronological order

    console.log(`Found ${files.length} migration files.`);
    let concatenatedSql = '';

    for (const file of files) {
        console.log(`Adding ${file}...`);
        const filePath = path.join(migrationsDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Remove UTF-8 Byte Order Mark if present
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }

        concatenatedSql += `\n\n-- ==========================================\n`;
        concatenatedSql += `-- MIGRATION: ${file}\n`;
        concatenatedSql += `-- ==========================================\n\n`;
        concatenatedSql += content;
        concatenatedSql += `\n`;
    }

    console.log(`Writing compiled migrations to ${allMigrationsFile}...`);
    fs.writeFileSync(allMigrationsFile, concatenatedSql, 'utf8');
    console.log(`Success! Written ${concatenatedSql.length} bytes to all_migrations.sql`);
}

compile();
