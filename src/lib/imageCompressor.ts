/**
 * Compresses an image file on the client side and strips all EXIF metadata.
 * Stripping EXIF is achieved by drawing the image onto an HTML5 Canvas and
 * exporting only the pixel data to a new JPEG/PNG Blob.
 * 
 * @param file The original image file from the file input
 * @param maxWidth Max width in pixels (default 800)
 * @param maxHeight Max height in pixels (default 800)
 * @param quality Quality between 0.0 and 1.0 (default 0.8)
 * @returns A promise resolving to the compressed Blob
 */
export function compressImage(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Basic file type validation
    if (!file.type.startsWith("image/")) {
      reject(new Error("File is not a valid image format."));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not initialize 2D canvas context."));
          return;
        }

        // Draw image onto canvas - this process automatically strips EXIF headers
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas back to Blob
        // Convert to image/jpeg for photographs (maintains quality at smaller size)
        const mimeType = "image/jpeg";
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Image compression failed."));
            }
          },
          mimeType,
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error("Failed to render image file."));
      };
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read image file."));
    };
  });
}
