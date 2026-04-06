const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const componentsDir = path.join(__dirname, 'components');

const tablesToCheck = [
  'user_connections', 'task_artifacts_legacy', 'sitemap_urls', 'projects_legacy',
  'profiles', 'contents', 'office_states', 'project_invites', 'avatars',
  'blog_viz_projects', 'messages', 'project_members_legacy', 'ga4_daily_metrics',
  'seo_reports', 'notifications', 'content_history'
];

const results = {};
tablesToCheck.forEach(t => results[t] = false);

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
      tablesToCheck.forEach(t => {
        if (!results[t] && content.includes(t)) {
          results[t] = true;
        }
      });
    }
  });
}

walk(srcDir);
walk(componentsDir);

console.log("Usage of suspect tables in codebase:");
console.table(results);
