export function getBaseUrl(): string {
  // Check if we are in a browser environment
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side fallback hierarchy
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const url = process.env.NEXT_PUBLIC_SITE_URL;
    return url.startsWith('http') ? url : `https://${url}`;
  }
  
  if (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    const url = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
    return url.startsWith('http') ? url : `https://${url}`;
  }
  
  return 'http://localhost:3000';
}
