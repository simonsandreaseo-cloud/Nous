const fs = require('fs');
const path = require('path');

function createBitmap(width, height, colorCheck) {
    const headerSize = 54;
    const rowSize = Math.floor((24 * width + 31) / 32) * 4;
    const pixelArraySize = rowSize * height;
    const totalSize = headerSize + pixelArraySize;

    const buffer = Buffer.alloc(totalSize);

    // BMP Header
    buffer.write('BM', 0);
    buffer.writeUInt32LE(totalSize, 2);
    buffer.writeUInt32LE(54, 10); // Offset

    // DIB Header
    buffer.writeUInt32LE(40, 14); // Header size
    buffer.writeUInt32LE(width, 18);
    buffer.writeUInt32LE(height, 22);
    buffer.writeUInt16LE(1, 26); // Planes
    buffer.writeUInt16LE(24, 28); // Bit count (RGB)
    buffer.writeUInt32LE(pixelArraySize, 34); // Image size

    // Pixels (BGR format, creating a simple gradient/pattern)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const offset = 54 + (height - 1 - y) * rowSize + x * 3;

            let b, g, r;
            if (colorCheck === 'sidebar') {
                // Dark sidebar with gradient
                // Top is darker, bottom lighter cyan/blue
                const ratio = y / height;
                b = Math.floor(20 + 40 * ratio); // Blue
                g = Math.floor(20 + 20 * ratio); // Green
                r = 10; // Red (dark)

                // Add a "grid" line every 50 pixels
                if (y % 50 === 0 || x % 50 === 0) {
                    b = 60; g = 60; r = 60;
                }
            } else {
                // Header (lighter or white with logo placeholder)
                b = 240; g = 240; r = 240; // Light gray
                // Simple border
                if (y < 2 || y > height - 3 || x < 2 || x > width - 3) {
                    b = 0; g = 0; r = 0;
                }
            }

            buffer.writeUInt8(b, offset);
            buffer.writeUInt8(g, offset + 1);
            buffer.writeUInt8(r, offset + 2);
        }
    }

    return buffer;
}

const iconsDir = path.join(__dirname, '../src-tauri/icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate Sidebar (164x314)
const sidebarBuffer = createBitmap(164, 314, 'sidebar');
fs.writeFileSync(path.join(iconsDir, 'sidebar.bmp'), sidebarBuffer);
console.log('Generated sidebar.bmp');

// Generate Header (150x57)
const headerBuffer = createBitmap(150, 57, 'header');
fs.writeFileSync(path.join(iconsDir, 'header.bmp'), headerBuffer);
console.log('Generated header.bmp');
