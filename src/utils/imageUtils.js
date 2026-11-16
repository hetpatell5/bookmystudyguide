import { BASE_URL, IMAGE_BASE_URL } from '../api';

const BACKEND_URL = BASE_URL;

export const getOptimizedImageUrl = (url, options = {}) => {
    if (!url || typeof url !== 'string') {
        return url;
    }

    // If it's already an absolute URL (http/https), return as is
    if (url.startsWith('http')) {
        // Special case: if it's a localhost URL, it might have been stored as an absolute path during testing
        if (url.includes('localhost:5002/uploads') || url.includes('localhost:5001/uploads')) {
            // Keep it for now, as it's a valid local path for dev
            return url;
        }
        
        // If it's an R2 URL and we want to optimize it later, we can add logic here.
        // For now, return absolute URLs as is.
        return url;
    }

    // Handle legacy relative paths (stored as /uploads/...)
    if (url.startsWith('/uploads') || url.startsWith('uploads')) {
        const path = url.startsWith('/') ? url : `/${url}`;
        // Use IMAGE_BASE_URL (R2) instead of backend URL
        return `${IMAGE_BASE_URL}${path}`;
    }

    // Fallback for anything else
    if (!url.includes('cloudinary.com')) {
        return url;
    }

    const {
        width,
        height,
        quality = 'auto',
        format = 'auto',
        crop = 'scale'
    } = options;

    // Split the URL to insert transformations
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;

    let transformations = `f_${format},q_${quality}`;

    if (width) transformations += `,w_${width}`;
    if (height) transformations += `,h_${height}`;
    if (crop) transformations += `,c_${crop}`;

    return `${parts[0]}/upload/${transformations}/${parts[1]}`;
};

/**
 * Generate srcset for responsive images
 */
export const getImageSrcSet = (url, widths = [320, 480, 768, 1024, 1440]) => {
    if (!url || typeof url !== 'string') return null;

    // For local images, we don't have a resizing proxy yet, so just return the original for all
    if (url.startsWith('/uploads') || url.startsWith('uploads')) {
        const fullUrl = getOptimizedImageUrl(url);
        return widths.map(w => `${fullUrl} ${w}w`).join(', ');
    }

    if (!url.includes('cloudinary.com')) return null;

    return widths
        .map(w => `${getOptimizedImageUrl(url, { width: w })} ${w}w`)
        .join(', ');
};
