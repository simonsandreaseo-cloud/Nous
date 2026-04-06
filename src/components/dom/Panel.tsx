// src/components/dom/Panel.tsx
export default function Panel({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return (
        <div
            className={`relative p-4 border-[0.5px] border-cyan-400/20 bg-white/5 backdrop-blur-md text-xs tracking-widest text-cyan-700/80 ${className}`}
            style={{
                // Corte diagonal en la esquina inferior derecha
                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)'
            }}
        >
            <div className="absolute top-0 right-0 w-1 h-1 bg-cyan-400" />
            {children}
        </div>
    );
}
