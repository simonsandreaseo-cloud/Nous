import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

/**
 * Initializes and returns the FFmpeg instance.
 * Uses single-threaded core to avoid COEP/COOP header requirements which break cross-origin images.
 */
export async function getFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
    if (ffmpeg) {
        if (onProgress) {
            ffmpeg.on('progress', ({ progress }) => {
                onProgress(Math.round(progress * 100));
            });
        }
        return ffmpeg;
    }

    ffmpeg = new FFmpeg();

    if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
            onProgress(Math.round(progress * 100));
        });
    }

    try {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        console.log("FFmpeg loaded successfully");
    } catch (error) {
        console.error("Error loading FFmpeg:", error);
        throw new Error("No se pudo cargar el motor de compresión de video.");
    }

    return ffmpeg;
}

/**
 * Utility to fetch and convert to Blob URL to bypass CORS issues on some CDNs
 */
async function toBlobURL(url: string, mimeType: string): Promise<string> {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    const blob = new Blob([buf], { type: mimeType });
    return URL.createObjectURL(blob);
}

/**
 * Compresses a video file to MP4 (H.264) format using FFmpeg.wasm.
 * H.264 is used because VP9 encoding in WASM is too memory intensive and causes "memory access out of bounds" crashes.
 * @param file The original video file
 * @param onProgress Callback for compression progress (0-100)
 * @returns A File object containing the compressed MP4 video
 */
export async function compressVideo(file: File, onProgress?: (progress: number) => void): Promise<File> {
    const ffmpegInstance = await getFFmpeg(onProgress);

    const inputName = 'input' + (file.name.substring(file.name.lastIndexOf('.')) || '.mp4');
    const outputName = 'output.mp4';

    // Write the file to FFmpeg's virtual filesystem
    await ffmpegInstance.writeFile(inputName, await fetchFile(file));

    console.log(`Starting compression for ${file.name} to MP4/H.264...`);
    
    // Execute FFmpeg command
    // -c:v libx264: H.264 video codec (much faster and less memory-intensive than VP9)
    // -preset veryfast: Optimize for speed and low memory usage
    // -crf 28: Constant Rate Factor (23 is default, 28 is good for web compression)
    // -c:a aac: AAC audio codec (standard for MP4)
    // -b:a 128k: Audio bitrate
    // -vf scale='min(1280,iw)':-2 : Scale to max 720p width, keeping aspect ratio
    await ffmpegInstance.exec([
        '-i', inputName,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-vf', "scale='min(1280,iw)':-2",
        '-movflags', '+faststart', // Optimize for web streaming
        outputName
    ]);

    // Read the result
    const data = await ffmpegInstance.readFile(outputName);
    const compressedBlob = new Blob([data], { type: 'video/mp4' });
    
    // Clean up virtual filesystem
    await ffmpegInstance.deleteFile(inputName);
    await ffmpegInstance.deleteFile(outputName);

    // Create a new File object
    const cleanBaseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    return new File([compressedBlob], `${cleanBaseName}.mp4`, { type: 'video/mp4' });
}
