# Design: Link Strategy Matrix

## Architecture Decisions

### 1. Database Upsert Mechanism
- We need to insert custom URLs into the `project_urls` table without duplicating existing entries that the web crawler (or Google Search Console sync) might have found.
- The `project_urls` table currently has `id`, `project_id`, `url`, `title`, `type`, `category`, `top_query`, `strategic_score`.
- We will rely on Supabase's `upsert` functionality.
- We must ensure a unique constraint exists on `(project_id, url)`. If it does not exist, we must create a migration to add it, or handle deduplication via an RPC or in-memory before insertion. (We will verify this constraint during the apply phase).

### 2. RCP Context Augmentation
- In `src/lib/services/writer/research/index.ts`, the RCP currently fetches unique categories using `supabase.rpc('get_unique_categories')`.
- We will load `project.settings.link_strategy.per_content_type[task.content_type]` and apply its rules:
    - **Filter**: If `strict_mode`, we filter `combinedUnits` locally before feeding it to Gemini.
    - **Sort**: If not strict, we apply multipliers. Since the RPC `get_semantic_inventory_matches_v3` currently does the matching inside postgres and orders by a combination of factors, we cannot easily modify the RPC without risking other systems. Instead, we will take the top 120 results, and re-sort them locally in TypeScript:
        `unit.score = (unit.score || 1) * (strategy.category_priorities[unit.category] || 5) / 5`
    - **Prompt Injection**: We will append a specific prompt block to the "Arquitecto de Silos SEO" giving explicit instructions to favor the high priority categories and VIP URLs.

### 3. Component Structure
- `src/components/settings/project/ProjectLinkStrategyView.tsx`: Main container. Fetches `project_urls` distinct categories and planned content types.
- `src/components/settings/project/LinkStrategyEditor.tsx`: Detailed editor for a specific content type (right panel of the master-detail view).
- `src/components/settings/project/SmartURLUploaderModal.tsx`: The CSV/XLSX uploader modal, using `xlsx` and `papaparse` similar to the existing `SmartUploaderModal`.

### 4. Data Flow for Settings Save
Settings are saved to the project table via the existing `updateProject` function from `useProjectStore`.
```typescript
const strategy = { ...activeProject.settings?.link_strategy };
strategy.per_content_type[currentType] = updatedConfig;
await updateProject(activeProject.id, {
  settings: {
    ...activeProject.settings,
    link_strategy: strategy
  }
});
```
