import NeuralWriter from '@/components/tools/NeuralWriter/NeuralWriter';

export default function WriterPage() {
    return (
        <div className="min-h-screen w-full bg-slate-950 flex flex-col relative overflow-hidden">
            {/* Background Ambience handled by global Layout or R3F, but fallback here just in case */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-slate-950 to-slate-950 pointer-events-none" />

            <main className="flex-1 w-full relative z-10">
                <NeuralWriter />
            </main>
        </div>
    );
}
