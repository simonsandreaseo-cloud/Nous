const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const componentsDir = path.join(__dirname, 'components');

const fieldsToCheck = {
  projects: ['budget_settings', 'scraper_settings', 'ga4_connected', 'ga4_property_id', 'ga4_account_id', 'ga4_account_email', 'google_refresh_token', 'gsc_access_token', 'gsc_expiration'],
  tasks: ['associated_url', 'secondary_url', 'tracking_metrics', 'locked_by', 'locked_until', 'research_dossier', 'outline_structure', 'quality_checklist', 'semantic_refs']
};

const results = {};
Object.values(fieldsToCheck).flat().forEach(f => results[f] = false);

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      walk(file);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(file, 'utf8');
      Object.keys(results).forEach(f => {
        if (!results[f] && content.includes(f)) {
          results[f] = true;
        }
      });
    }
  });
}

walk(srcDir);
walk(componentsDir);

console.log("Usage of specific fields in codebase:");
console.table(results);
