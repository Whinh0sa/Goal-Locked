export const isSafeRedirectUrl = (url: string): boolean => {
    try {
        // Base URL is required to parse relative URLs
        const parsed = new URL(url, window.location.origin);

        // Ensure protocol is HTTP or HTTPS
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
        }

        const allowedDomains = ['vibejam.cc'];

        // Allow relative URLs (same origin) or allowed domains
        // Need to check hostname because when using relative URLs it matches the current window location
        const isSameOrigin = parsed.hostname === window.location.hostname;

        // Check if the domain is explicitly allowed or is a subdomain of an allowed domain
        const isAllowedDomain = allowedDomains.some(
            d => parsed.hostname === d || parsed.hostname.endsWith('.' + d)
        );

        return isSameOrigin || isAllowedDomain;
    } catch {
        // If URL parsing fails, it's unsafe
        return false;
    }
};
