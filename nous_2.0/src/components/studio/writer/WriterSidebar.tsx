'use client';

// Modular Imports
import { StatusBadge } from './SidebarCommon';
import { useWriterActions } from './useWriterActions';
import { GenerateTab } from './GenerateTab';
import { SEOTab } from './SEOTab';
import { AssistantTab } from './AssistantTab';
import { ResearchTab } from './ResearchTab';
import { ExportTab } from './ExportTab';

/**
 * REFACTORING STATUS: 70% Complete
 * PENDING TASKS FOR JULES:
 * 1. [FIX LINT]: Property names 'status' and 'sidebarTab' were changed in the store to 'statusMessage' and 'activeSidebarTab'.
 *    - Current code uses 'statusMessage' and 'activeSidebarTab' in most places, but verify setters.
 * 2. [MEDIA TAB]: Implement the MediaTab component for image generation & management.
 * 3. [HANDLERS]: The 'handleExportWP' and 'handleSaveCloud' handlers are currently stubs. Move them to a service or implement here.
 * 4. [UX]: Add transitions between tabs (Framer Motion recommended).
 */
export default function WriterSidebar() {
