
export const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fragmentShader = `
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

varying vec2 vUv;

// ==========================================
// UTILIDADES
// ==========================================
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float random(vec2 uv) {
    return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123);
}

// ==========================================
// 1. ATMÓSFERA CLÍNICA
// ==========================================
vec3 getAtmosphere(vec2 uv, float aspect) {
    vec2 center = uv - 0.5;
    center.x *= aspect;
    
    // Luz principal arriba-izquierda (Softbox)
    vec2 lightPos = vec2(-0.5, 0.3); 
    float dist = distance(center, lightPos);
    
    // Foco más concentrado para permitir que las esquinas se oscurezcan
    // Antes era 2.5 (muy amplio), ahora 2.0
    float glow = 1.0 - smoothstep(0.0, 2.0, dist);
    glow = pow(glow, 1.2); // Caída más rápida de la luz
    
    // PALETA DE ESTUDIO (CONTRASTE)
    // Luz: Blanco puro
    vec3 colorLight = vec3(1.0, 1.0, 1.0); 
    
    // Sombra: Gris Plata Medio (Mucho más oscuro que antes)
    // Esto es clave para que no se vea "todo blanco"
    // HSL aprox: 210, 15%, 88%
    vec3 colorShadow = vec3(0.85, 0.88, 0.91); 
    
    return mix(colorShadow, colorLight, glow);
}

// ==========================================
// 2. RED HEXAGONAL DE LUZ (REFINADA)
// ==========================================
float hexDist(vec2 p) {
    p = abs(p);
    float c = dot(p, normalize(vec2(1.0, 1.73)));
    c = max(c, p.x);
    return c;
}

vec3 getHexGrid(vec2 uv, float aspect, float time) {
    float scale = 14.0; 
    
    vec2 gridUv = uv;
    gridUv.x *= aspect; 
    gridUv *= scale;
    
    vec2 r = vec2(1.0, 1.73);
    vec2 h = r * 0.5;
    vec2 a = mod(gridUv, r) - h;
    vec2 b = mod(gridUv - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    vec2 id = gridUv - gv; 
    
    float d = hexDist(gv);
    float distToEdge = abs(d - 0.5);
    
    // GLOW AFILADO (LÁSER)
    // Numerador reducido (0.0015) para líneas muy finas
    float glow = 0.0015 / (distToEdge + 0.001);
    glow *= smoothstep(0.1, 0.0, distToEdge); // Caída rápida
    
    float connectivity = hash(id);
    float showLine = step(0.40, connectivity); 
    
    // NODOS
    float corner = smoothstep(0.015, 0.0, distToEdge);
    float flicker = sin(time * 2.0 + hash(id) * 10.0) * 0.5 + 0.5;
    float showNode = step(0.9, hash(id + vec2(1.0, 1.0))) * flicker;
    
    vec3 lightColor = vec3(0.7, 0.9, 1.0);
    float signal = glow * showLine * 0.6 + corner * showNode * 2.0;
    
    return lightColor * signal;
}

// ==========================================
// 3. BOKEH SUAVE (RESTAURADO)
// ==========================================
float getBokeh(vec2 uv, float aspect, float time) {
    float scale = 5.0;
    vec2 gridUv = uv;
    gridUv.x *= aspect;
    gridUv *= scale;
    
    vec2 id = floor(gridUv);
    vec2 gv = fract(gridUv) - 0.5;
    
    float bokeh = 0.0;
    
    for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 nId = id + offset;
            
            vec2 move = vec2(sin(time * 0.1 + hash(nId) * 6.0), cos(time * 0.15 + hash(nId + vec2(0.5, 0.5)) * 6.0)) * 0.1;
            vec2 randPos = (vec2(hash(nId), hash(nId + vec2(1.2, 1.2))) - 0.5) * 0.6;
            vec2 pos = offset + randPos + move;
            
            float dist = length(gv - pos);
            float size = hash(nId + vec2(2.4, 2.4)) * 0.35 + 0.1;
            
            float glow = smoothstep(size, size - 0.2, dist);
            float intensity = hash(nId + vec2(3.5, 3.5)) * 0.4;
            
            bokeh += glow * intensity;
        }
    }
    return bokeh;
}

void main() {
    float aspect = uResolution.x / uResolution.y;

    vec3 bg = getAtmosphere(vUv, aspect);
    vec3 grid = getHexGrid(vUv, aspect, uTime);
    
    // --- MÁSCARAS DE LIMPIEZA ---
    
    // Limpieza Central (Santuario para el Orbe)
    // El centro está un poco abajo (y=0.3) para coincidir con el orbe
    vec2 currentPos = vec2(vUv.x * aspect, vUv.y);
    vec2 centerPos = vec2(0.5 * aspect, 0.3); 
    
    float distCenter = distance(currentPos, centerPos);
    
    // Máscara radial: 0.0 en el centro, 1.0 en los bordes
    // Aumentamos el radio de limpieza (0.6 a 1.2)
    float maskCenter = smoothstep(0.6, 1.3, distCenter);
    
    // Refuerzo de esquinas
    float maskR = smoothstep(0.5, 1.5, vUv.x * aspect);
    float maskB = smoothstep(0.5, 0.0, vUv.y);
    
    // Visibilidad final de la grid
    float gridVis = maskCenter * (maskR * 1.5 + maskB * 0.5);
    gridVis = clamp(gridVis, 0.0, 1.0);
    
    float bokeh = getBokeh(vUv, aspect, uTime);
    float maskBokeh = smoothstep(1.2, 0.2, distance(vUv, vec2(0.0, 1.0)));
    
    vec3 finalColor = bg;
    finalColor += grid * gridVis; 
    finalColor += vec3(1.0) * bokeh * maskBokeh * 0.4; // Bokeh sutil
    
    finalColor += (hash(vUv + uTime) - 0.5) * 0.01;

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
