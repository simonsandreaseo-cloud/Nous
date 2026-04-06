const fs = require('fs');
const path = require('path');

// Helper to write BMP file (24-bit RGB)
function createSolidBMP(width, height, r, g, b, filename) {
    const padding = (4 - ((width * 3) % 4)) % 4; // Padding bytes per row
    const rowSize = (width * 3) + padding;
    const pixelArraySize = rowSize * height;
    const fileSize = 54 + pixelArraySize;

    const buffer = Buffer.alloc(fileSize);

    // 1. BMP Header (14 bytes)
    buffer.write('BM'); // Signature
    buffer.writeUInt32LE(fileSize, 2); // File size
    buffer.writeUInt32LE(0, 6); // Reserved
    buffer.writeUInt32LE(54, 10); // Offset to pixel array

    // 2. DIB Header (40 bytes - BITMAPINFOHEADER)
    buffer.writeUInt32LE(40, 14); // Header size
    buffer.writeInt32LE(width, 18); // Width
    buffer.writeInt32LE(height, 22); // Height (positive = bottom-up)
    buffer.writeUInt16LE(1, 26); // Planes
    buffer.writeUInt16LE(24, 28); // Bits per pixel (RGB)
    buffer.writeUInt32LE(0, 30); // Compression (BI_RGB)
    buffer.writeUInt32LE(pixelArraySize, 34); // Image size
    buffer.writeInt32LE(2835, 38); // HRes (72 DPI)
    buffer.writeInt32LE(2835, 42); // VRes (72 DPI)
    buffer.writeUInt32LE(0, 46); // Colors in palette
    buffer.writeUInt32LE(0, 50); // Important colors

    // 3. Pixel Array (Bottom-up BGR)
    let offset = 54;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Write BGR
            // Simple gradient logic: lighter at top (y near height)
            // But BMP is bottom-up, so y=0 is bottom

            // Let's do a vertical gradient
            // Bottom: Pure White (255, 255, 255)
            // Top: Very Light Gray (245, 245, 245)
            const factor = y / height;
            // Mixed color logic
            // actually, let's keep it solid white for ultimate Zen
            buffer.writeUInt8(b, offset++);
            buffer.writeUInt8(g, offset++);
            buffer.writeUInt8(r, offset++);
        }
        // Write padding
        for (let p = 0; p < padding; p++) {
            buffer.writeUInt8(0, offset++);
        }
    }

    const outputPath = path.join(__dirname, '../src-tauri/icons', filename);
    fs.writeFileSync(outputPath, buffer);
    console.log(`Generated ${filename} (${width}x${height})`);
}

// Sidebar: 164x314 (White #FFFFFF)
createSolidBMP(164, 314, 255, 255, 255, 'sidebar.bmp');

// Header: 150x57 (White #FFFFFF)
createSolidBMP(150, 57, 255, 255, 255, 'header.bmp');
