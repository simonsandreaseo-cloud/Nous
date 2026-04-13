"use client";
import { use } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamic Imports for focused views
const GeneralSettingsView = dynamic(() => import("@/components/settings/GeneralSettingsView"), { 
    loading: () => <ToolLoading name="General" /> 
});
const TeamSettings = dynamic(() => import("@/components/settings/agency/TeamSettingsView").then(mod => mod.TeamSettings), { 
    loading: () => <ToolLoading name="Equipo" /> 
});
const IntegrationsView = dynamic(() => import("@/components/settings/IntegrationsView"), { 
    loading: () => <ToolLoading name="Integraciones" /> 
});
const InventoryView = dynamic(() => import("@/components/settings/InventoryView"), { 
    loading: () => <ToolLoading name="Inventario" /> 
});
const ToolsSettingsView = dynamic(() => import("@/components/settings/ToolsSettingsView"), { 
    loading: () => <ToolLoading name="Herramientas" /> 
});
const BillingView = dynamic(() => import("@/components/settings/BillingView"), { 
    loading: () => <ToolLoading name="Presupuesto" /> 
});

function ToolLoading({ name }: { name: string }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center py-20 grayscale opacity-40">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" strokeWidth={2.5} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Cargando {name}...</p>
        </div>
    );
}

export default function SettingSectionPage({ params }: { params: Promise<{ section: string }> }) {
    const { section } = use(params);

    switch (section) {
        case "general": return <GeneralSettingsView />;
        case "team": return <TeamSettings />;
        case "integrations": return <IntegrationsView />;
        case "inventory": return <InventoryView />;
        case "tools": return <ToolsSettingsView />;
        case "billing": return <BillingView />;
        default: return <GeneralSettingsView />;
    }
}
