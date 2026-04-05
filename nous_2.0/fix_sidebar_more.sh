#!/bin/bash

# Give sidebar proper dark text colors so it matches Serper style sidebars
# Wait, Serper sidebar has dark background. Let's make it dark text on dark background?
# Actually Serper has a dark theme overall. The user wants the Serper layout, but with the "light theme".
# The user said: "quiero que imitemos este estilo, el SERPER, pero con nuestro tema claro... mantengamos nuestro icono, nuestro boton de contraer y como se ve la foto del usuario"

# Let's adjust the Sidebar to have a light bg instead of dark, as they want "nuestro tema claro".
sed -i 's/bg-\[#0f111a\]/bg-white/g' /app/nous_2.0/src/components/contents/ContentsSidebar.tsx
sed -i 's/border-slate-800\/50/border-slate-200/g' /app/nous_2.0/src/components/contents/ContentsSidebar.tsx
