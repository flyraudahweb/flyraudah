/**
 * Extracts a cropped image from a File based on a bounding box and returns a new File object.
 *
 * @param file The original image File
 * @param cropBox Bounding box with x, y, width, height (values from 0 to 1 representing percentages)
 * @param fileName The output filename (default: 'passport-crop.jpg')
 * @param mimeType The output MIME type (default: 'image/jpeg')
 * @returns A Promise that resolves to the cropped File
 */
export async function autoCropImage(
    file: File,
    cropBox: { x: number; y: number; width: number; height: number },
    fileName = 'passport-crop.jpg',
    mimeType = 'image/jpeg'
): Promise<File> {
    return new Promise((resolve, reject) => {
        try {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);

                // Sanity check for valid cropBox
                if (!cropBox || typeof cropBox.x !== 'number') {
                    return reject(new Error('Invalid cropBox'));
                }

                const sx = cropBox.x * img.width;
                const sy = cropBox.y * img.height;
                const sWidth = cropBox.width * img.width;
                const sHeight = cropBox.height * img.height;

                // Apply a small padding to the bounding box to capture a bit more of the head/shoulders
                const padding = 0.2; // 20% padding around the detected face
                const px = Math.max(0, sx - sWidth * padding);
                const py = Math.max(0, sy - sHeight * padding * 1.5); // More padding above the head
                const pWidth = Math.min(img.width - px, sWidth * (1 + padding * 2));
                const pHeight = Math.min(img.height - py, sHeight * (1 + padding * 2.5));

                const canvas = document.createElement('canvas');
                canvas.width = pWidth;
                canvas.height = pHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Failed to get 2d context for canvas'));
                }

                ctx.drawImage(img, px, py, pWidth, pHeight, 0, 0, pWidth, pHeight);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        return reject(new Error('Canvas toBlob failed'));
                    }
                    const croppedFile = new File([blob], fileName, { type: mimeType });
                    resolve(croppedFile);
                }, mimeType, 0.9);
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Failed to load image for cropping'));
            };

            img.src = objectUrl;
        } catch (err) {
            reject(err);
        }
    });
}
