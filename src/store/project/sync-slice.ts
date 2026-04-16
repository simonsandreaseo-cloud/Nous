import { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';
import { ProjectStore, SyncActions } from './types';
import { NotificationService } from '@/lib/services/notifications';

export const createSyncSlice: StateCreator<ProjectStore, [], [], SyncActions> = (set, get) => ({
    syncGscData: async (siteUrl, startDate, endDate) => {
        const active = get().activeProject;
        if (!active) return;

        set({ isLoading: true });
        console.log(`Syncing GSC data for ${siteUrl} from ${startDate} to ${endDate}`);

        const { error } = await supabase
            .from('gsc_daily_metrics')
            .upsert([{
                project_id: active.id,
                date: startDate,
                clicks: 0,
                impressions: 0,
                ctr: 0,
                position: 0,
                updated_at: new Date().toISOString()
            }], { onConflict: 'project_id,date' });

        if (error) {
            NotificationService.error('Error sincronizando GSC', error.message);
        } else {
            NotificationService.success('Datos GSC sincronizados (placeholder)');
        }

        set({ isLoading: false });
    },

    syncProjectInventory: async (projectId, siteUrl) => {
        set({ isLoading: true });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No hay sesión activa.");

            const response = await fetch('/api/gsc/sync-urls', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ projectId })
            });

            const result = await response.json();
            if (!response.ok) {
                if (result.error?.includes('invalid authentication credentials') || response.status === 401) {
                    throw new Error("Conexión con Google Search Console expirada. Por favor, vuelve a vincular tu cuenta.");
                }
                throw new Error(result.error || "Error al sincronizar con GSC");
            }

            NotificationService.success('Inventario sincronizado', `${result.count} URLs procesadas.`);
            return result.count;
        } catch (error: any) {
            NotificationService.error('Fallo en sincronización', error.message);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchProjectInventory: async (projectId) => {
        const { data, error } = await supabase
            .from('project_urls')
            .select('url, title, category, top_query, strategic_score')
            .eq('project_id', projectId);
            
        if (error) {
            console.error('[fetchProjectInventory] Error:', error);
            // If it's a 400, it's likely a missing column. Fallback to basic select.
            if (error.code === 'PGRST204' || error.code === '42703') {
                const { data: fallbackData } = await supabase
                    .from('project_urls')
                    .select('url, category')
                    .eq('project_id', projectId);
                return fallbackData || [];
            }
            return [];
        }
        return data || [];
    },
});
