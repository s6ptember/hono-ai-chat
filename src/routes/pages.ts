/**
 * Page Routes
 * Serves HTML pages
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Bindings } from '../types/index.ts';
import { readFileSync } from 'fs';
import { join } from 'path';

const pages = new Hono<{ Bindings: Bindings }>();

/**
 * GET /
 * Main application page
 */
pages.get('/', (c: Context) => {
  return c.html(getHomePage());
});

/**
 * Home page HTML loaded from external file
 */
function getHomePage(): string {
  try {
    // Try to read the HTML file from the public directory
    const htmlPath = join(process.cwd(), 'public', 'index.html');
    const htmlContent = readFileSync(htmlPath, 'utf-8');
    return htmlContent;
  } catch (error) {
    // Fallback if file cannot be read
    console.error('Error reading HTML file:', error);
    return '<html><body><h1>Error loading page</h1></body></html>';
  }
}

export default pages;
