import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { isSafeRedirectUrl } from './security';

describe('isSafeRedirectUrl', () => {
    beforeAll(() => {
        // Mock window.location for tests
        vi.stubGlobal('window', {
            location: {
                origin: 'http://localhost:3000',
                hostname: 'localhost'
            }
        });
    });

    afterAll(() => {
        vi.unstubAllGlobals();
    });

    it('should allow relative URLs', () => {
        expect(isSafeRedirectUrl('/path/to/page')).toBe(true);
        expect(isSafeRedirectUrl('?query=param')).toBe(true);
        expect(isSafeRedirectUrl('#hash')).toBe(true);
    });

    it('should allow explicitly allowlisted domains', () => {
        expect(isSafeRedirectUrl('https://vibejam.cc')).toBe(true);
        expect(isSafeRedirectUrl('https://vibejam.cc/portal/2026')).toBe(true);
        expect(isSafeRedirectUrl('http://vibejam.cc/foo')).toBe(true);
    });

    it('should allow subdomains of allowlisted domains', () => {
        expect(isSafeRedirectUrl('https://sub.vibejam.cc/something')).toBe(true);
        expect(isSafeRedirectUrl('https://a.b.vibejam.cc')).toBe(true);
    });

    it('should block non-http/https protocols', () => {
        expect(isSafeRedirectUrl('javascript:alert(1)')).toBe(false);
        expect(isSafeRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
        expect(isSafeRedirectUrl('file:///etc/passwd')).toBe(false);
    });

    it('should block arbitrary external domains', () => {
        expect(isSafeRedirectUrl('https://evil.com')).toBe(false);
        expect(isSafeRedirectUrl('http://attacker.com/steal-data')).toBe(false);
    });

});
