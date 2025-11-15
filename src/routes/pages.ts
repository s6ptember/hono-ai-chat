/**
 * Page Routes
 * Serves HTML pages
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Bindings } from '../types/index.ts';
import { indexHtml } from '../templates/index.html.ts';

const pages = new Hono<{ Bindings: Bindings }>();

/**
 * GET /
 * Main application page
 */
pages.get('/', (c: Context) => {
  return c.html(indexHtml);
});

export default pages;
