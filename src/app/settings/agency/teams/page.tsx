"use client";

import { useState } from "react";
import { TeamSettings } from "@/components/settings/agency/TeamSettingsView";
import TeamDirectoryView from "@/components/settings/agency/TeamDirectoryView";
import { useProjectStore } from "@/store/useProjectStore";

export default function AgencyTeamsPage() {
    const { activeTeam } = useProjectStore();
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [view, setView] = useState<'directory' | 'settings'>('directory');

    const handleSelectTeam = (id: string) => {
        setSelectedTeamId(id);
        setView('settings');
    };

    if (view === 'settings' && (selectedTeamId || activeTeam?.id)) {
        return (
            <TeamSettings 
                teamId={selectedTeamId || activeTeam?.id || ""} 
                onBack={() => setView('directory')}
            />
        );
    }

    return <TeamDirectoryView onSelectTeam={handleSelectTeam} />;
}
