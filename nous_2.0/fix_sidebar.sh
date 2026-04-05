#!/bin/bash
sed -i 's/shrink-0 flex flex-col z-20 transition-all duration-300 ease-in-out glass-panel border-hairline rounded-\[32px\] overflow-hidden shadow-sm/shrink-0 flex flex-col z-20 transition-all duration-300 ease-in-out bg-[#0f111a] border-r border-slate-800\/50 overflow-hidden/g' /app/nous_2.0/src/components/contents/ContentsSidebar.tsx

# Also fix the inner backgrounds that were white/40
sed -i 's/bg-white\/40//g' /app/nous_2.0/src/components/contents/ContentsSidebar.tsx
sed -i 's/bg-white\/30//g' /app/nous_2.0/src/components/contents/ContentsSidebar.tsx
sed -i 's/text-slate-400/text-slate-400/g' /app/nous_2.0/src/components/contents/ContentsSidebar.tsx # just placeholder
