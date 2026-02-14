/**
 * Test 1.3: Frontend Design System Tests
 * Based on design_system.md (Lavender Nights Theme)
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_ROOT = join(__dirname, '..');
const CSS_PATH = join(FRONTEND_ROOT, 'src', 'index.css');

describe('Frontend Structure', () => {
    it('should have src/index.css file', () => {
        expect(existsSync(CSS_PATH)).toBe(true);
    });

    it('should have src/App.tsx file', () => {
        expect(existsSync(join(FRONTEND_ROOT, 'src', 'App.tsx'))).toBe(true);
    });
});

describe('Design System CSS Variables', () => {
    let cssContent: string;

    beforeAll(() => {
        cssContent = readFileSync(CSS_PATH, 'utf-8');
    });

    describe('Background Colors', () => {
        it('should define --bg-primary: #0d0a1a', () => {
            expect(cssContent).toContain('--bg-primary');
            expect(cssContent).toMatch(/--bg-primary:\s*#0d0a1a/);
        });

        it('should define --bg-secondary: #1a1528', () => {
            expect(cssContent).toContain('--bg-secondary');
            expect(cssContent).toMatch(/--bg-secondary:\s*#1a1528/);
        });

        it('should define --bg-tertiary: #251e38', () => {
            expect(cssContent).toContain('--bg-tertiary');
            expect(cssContent).toMatch(/--bg-tertiary:\s*#251e38/);
        });
    });

    describe('Accent Colors', () => {
        it('should define --accent-primary: #8b5cf6', () => {
            expect(cssContent).toContain('--accent-primary');
            expect(cssContent).toMatch(/--accent-primary:\s*#8b5cf6/);
        });

        it('should define --accent-primary-light: #c4b5fd', () => {
            expect(cssContent).toContain('--accent-primary-light');
        });
    });

    describe('Status Colors', () => {
        const statusColors = [
            { name: '--status-new', value: '#f472b6' },
            { name: '--status-saved', value: '#a78bfa' },
            { name: '--status-generated', value: '#6ee7b7' },
            { name: '--status-applied', value: '#fdba74' },
            { name: '--status-expired', value: '#9ca3af' },
            { name: '--status-discarded', value: '#fca5a5' },
        ];

        statusColors.forEach(({ name, value }) => {
            it(`should define ${name}: ${value}`, () => {
                expect(cssContent).toContain(name);
                expect(cssContent).toMatch(new RegExp(`${name}:\\s*${value}`));
            });
        });
    });

    describe('Text Colors', () => {
        it('should define --text-primary: #faf5ff', () => {
            expect(cssContent).toMatch(/--text-primary:\s*#faf5ff/);
        });

        it('should define --text-secondary: #b8b8d0', () => {
            expect(cssContent).toMatch(/--text-secondary:\s*#b8b8d0/);
        });

        it('should define --text-muted: #8888a8', () => {
            expect(cssContent).toMatch(/--text-muted:\s*#8888a8/);
        });
    });

    describe('Border Radius', () => {
        const radii = [
            { name: '--radius-sm', value: '12px' },
            { name: '--radius-md', value: '16px' },
            { name: '--radius-lg', value: '20px' },
            { name: '--radius-xl', value: '24px' },
        ];

        radii.forEach(({ name, value }) => {
            it(`should define ${name}: ${value}`, () => {
                expect(cssContent).toMatch(new RegExp(`${name}:\\s*${value}`));
            });
        });
    });

    describe('Layout Tokens', () => {
        it('should define --sidebar-width: 280px', () => {
            expect(cssContent).toMatch(/--sidebar-width:\s*280px/);
        });

        it('should define --header-height: 64px', () => {
            expect(cssContent).toMatch(/--header-height:\s*64px/);
        });
    });

    describe('Transitions', () => {
        it('should define --transition-fast', () => {
            expect(cssContent).toContain('--transition-fast');
        });

        it('should define --transition-normal', () => {
            expect(cssContent).toContain('--transition-normal');
        });
    });
});

describe('Font Configuration', () => {
    it('should import Nunito font', () => {
        const indexHtml = readFileSync(join(FRONTEND_ROOT, 'index.html'), 'utf-8');
        expect(indexHtml).toContain('Nunito');
    });

    it('should import JetBrains Mono font', () => {
        const indexHtml = readFileSync(join(FRONTEND_ROOT, 'index.html'), 'utf-8');
        expect(indexHtml).toContain('JetBrains+Mono');
    });
});
