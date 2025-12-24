import activeWin from 'active-win';
import screenshot from 'screenshot-desktop';
import Jimp from 'jimp';

export async function getActiveWindowInfo() {
    try {
        const result = await activeWin();
        return result;
    } catch (error) {
        console.error('Error getting active window:', error);
        return null;
    }
}

export async function captureAndBlurScreen() {
    try {
        // Capture screen
        const imgBuffer = await screenshot({ format: 'png' });

        // Load with Jimp
        const image = await Jimp.read(imgBuffer);

        // Apply Blur (radius 10 is usually sufficient for privacy)
        image.blur(20);

        // Get buffer back
        const blurredBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

        return blurredBuffer;
    } catch (error) {
        console.error('Error capturing screen:', error);
        return null;
    }
}
