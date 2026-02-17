/**
 * Applies a logo watermark to a base64 image.
 * @param base64Image The source image (base64 string)
 * @param logoUrl The logo image (base64 string or object URL)
 * @returns Promise resolving to a new base64 string with watermark
 */
export const applyWatermark = async (
    base64Image: string,
    logoUrl: string
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
        }

        const mainImage = new Image();
        mainImage.crossOrigin = "anonymous";

        mainImage.onload = () => {
            canvas.width = mainImage.width;
            canvas.height = mainImage.height;

            // Draw main image
            ctx.drawImage(mainImage, 0, 0);

            const logo = new Image();
            logo.crossOrigin = "anonymous";

            logo.onload = () => {
                // Calculate logo size (e.g., 15% of the main image width)
                const logoWidth = mainImage.width * 0.15;
                const scaleFactor = logoWidth / logo.width;
                const logoHeight = logo.height * scaleFactor;

                // Position: Bottom right corner with padding
                const padding = mainImage.width * 0.03;
                const x = mainImage.width - logoWidth - padding;
                const y = mainImage.height - logoHeight - padding;

                // Draw shadow/glow for transparency visibility
                ctx.save();
                ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                // Draw logo
                ctx.globalAlpha = 0.9;
                ctx.drawImage(logo, x, y, logoWidth, logoHeight);

                ctx.restore();
                ctx.globalAlpha = 1.0;

                // Return result
                resolve(canvas.toDataURL('image/png'));
            };

            logo.onerror = (err) => {
                console.warn("Failed to load logo for watermark, returning original image", err);
                resolve(base64Image);
            };

            logo.src = logoUrl;
        };

        mainImage.onerror = (err) => {
            reject(err);
        };

        mainImage.src = base64Image;
    });
};
