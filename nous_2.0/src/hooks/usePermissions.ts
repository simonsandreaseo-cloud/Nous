import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProjectStore } from '@/store/useProjectStore';
import { CustomPermissions } from '@/types/project';

const DEFAULT_PERMISSIONS: CustomPermissions = {
    admin: false,
    create_delete: false,
    edit_all: false,
    take_edit_tasks: false,
    take_edit_contents: false,
    take_edit_reports: false,
    all_tools_access: false,
    monthly_tokens_limit: 0,
    tokens_used_this_month: 0,
};

export function usePermissions(projectId?: string) {
    const { activeProjectIds, projects } = useProjectStore();

    // Determine which project to check permissions against
    const targetProjectId = projectId || activeProjectIds[0];
    const targetProject = projects.find(p => p.id === targetProjectId);

    const [permissions, setPermissions] = useState<CustomPermissions>(DEFAULT_PERMISSIONS);
    const [role, setRole] = useState<'owner' | 'admin' | 'editor' | 'viewer' | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const checkPermissions = async () => {
            if (!targetProject?.id) {
                if (isMounted) setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user?.id) {
                    if (isMounted) setLoading(false);
                    return;
                }

                // If user is the project owner
                if (targetProject.user_id === session.user.id) {
                    if (isMounted) {
                        setRole('owner');
                        setPermissions({
                            admin: true,
                            create_delete: true,
                            edit_all: true,
                            take_edit_tasks: true,
                            take_edit_contents: true,
                            take_edit_reports: true,
                            all_tools_access: true,
                            monthly_tokens_limit: 0, // Unlimited
                            tokens_used_this_month: 0
                        });
                        setLoading(false);
                    }
                    return;
                }

                // Fetch member record
                const { data: memberData, error } = await supabase
                    .from('project_members')
                    .select('role, custom_permissions')
                    .eq('project_id', targetProject.id)
                    .eq('user_id', session.user.id)
                    .maybeSingle();

                if (error) throw error;

                if (isMounted) {
                    if (memberData) {
                        setRole(memberData.role);
                        const custom = memberData.custom_permissions as CustomPermissions;
                        if (custom && Object.keys(custom).length > 0) {
                            setPermissions(custom);
                        } else {
                            // Fallback based on text role if custom is empty
                            if (memberData.role === 'admin') {
                                setPermissions({
                                    admin: true,
                                    create_delete: true,
                                    edit_all: true,
                                    take_edit_tasks: true,
                                    take_edit_contents: true,
                                    take_edit_reports: true,
                                    all_tools_access: true,
                                });
                            }
                        }
                    }
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error fetching user permissions:", error);
                if (isMounted) setLoading(false);
            }
        };

        checkPermissions();

        return () => {
            isMounted = false;
        };
    }, [targetProject?.id]);

    const canCreateOrDelete = () => permissions.admin || permissions.create_delete;
    const canEditAny = () => permissions.admin || permissions.edit_all;
    const canTakeTasks = () => permissions.admin || permissions.take_edit_tasks;
    const canTakeContents = () => permissions.admin || permissions.take_edit_contents;
    const canTakeReports = () => permissions.admin || permissions.take_edit_reports;
    const canUseAllTools = () => permissions.admin || permissions.all_tools_access;
    const getTokensLimit = () => permissions.monthly_tokens_limit || 0;
    const getTokensUsed = () => permissions.tokens_used_this_month || 0;

    const hasTokens = (amount: number = 1) => {
        if (permissions.admin || !permissions.monthly_tokens_limit || permissions.monthly_tokens_limit === 0) return true;
        return (permissions.tokens_used_this_month || 0) + amount <= permissions.monthly_tokens_limit;
    };

    const consumeTokens = async (amount: number = 1) => {
        if (permissions.admin || !permissions.monthly_tokens_limit || permissions.monthly_tokens_limit === 0) return true;
        if (!hasTokens(amount)) return false;

        const newUsed = (permissions.tokens_used_this_month || 0) + amount;
        const newCustom = { ...permissions, tokens_used_this_month: newUsed };

        // Optimistic update
        setPermissions(newCustom);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id && targetProject?.id) {
                await supabase
                    .from('project_members')
                    .update({ custom_permissions: newCustom })
                    .eq('project_id', targetProject.id)
                    .eq('user_id', session.user.id);
            }
            return true;
        } catch (e) {
            console.error("Failed to consume tokens:", e);
            // Revert on error
            setPermissions(permissions);
            return false;
        }
    };

    return {
        permissions,
        role,
        loading,
        canCreateOrDelete,
        canEditAny,
        canTakeTasks,
        canTakeContents,
        canTakeReports,
        canUseAllTools,
        getTokensLimit,
        getTokensUsed,
        hasTokens,
        consumeTokens
    };
}
