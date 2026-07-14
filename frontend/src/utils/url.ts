export function getBaseUrl(): string {
  // Check if we are in a browser environment
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side fallback hierarchy
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const url = process.env.NEXT_PUBLIC_APP_URL;
    return url.startsWith('http') ? url : `https://${url}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const url = process.env.NEXT_PUBLIC_SITE_URL;
    return url.startsWith('http') ? url : `https://${url}`;
  }
  
  if (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    const url = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
    return url.startsWith('http') ? url : `https://${url}`;
  }
  
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    const url = process.env.NEXT_PUBLIC_VERCEL_URL;
    return url.startsWith('http') ? url : `https://${url}`;
  }

  return 'https://trinetraedu-ai.com';
}

export function getBackendUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_FASTAPI_URL ||
    "http://127.0.0.1:8000";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
