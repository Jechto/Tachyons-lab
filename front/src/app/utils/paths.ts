/**
 * Utility function to handle GitHub Pages base path
 * In production, prepends the GitHub Pages subdirectory
 * In development, returns the path as-is
 */
export function getAssetPath(path: string): string {
    // Remove leading slash if it exists to normalize the path
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    
    // In production build for GitHub Pages, prepend the base path
    if (process.env.NODE_ENV === 'production') {
        return `/Tachyons-lab/${normalizedPath}`;
    }
    
    // In development, use the path as-is
    return `/${normalizedPath}`;
}