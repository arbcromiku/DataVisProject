#!/usr/bin/env bun

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { serve } from 'bun';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = __dirname;

const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Serve static files
    let filePath = join(publicDir, pathname === '/' ? 'index.html' : pathname);
    
    try {
      const file = Bun.file(filePath);
      const exists = await file.exists();
      
      if (exists) {
        const contentType = getContentType(filePath);
        const headers = {
          ...corsHeaders,
          'Content-Type': contentType,
        };
        
        // Add extra CORS headers for JSON/GeoJSON files
        if (contentType.includes('json') || contentType.includes('geojson')) {
          headers['Access-Control-Allow-Origin'] = '*';
          headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
        }
        
        return new Response(file, { headers });
      }
    } catch (error) {
      // File not found or other error
    }

    // SPA routing fallback - serve index.html for non-file routes
    if (!pathname.includes('.')) {
      try {
        const indexFile = Bun.file(join(publicDir, 'index.html'));
        return new Response(indexFile, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html',
          },
        });
      } catch (error) {
        // Index file not found
      }
    }

    // 404 response
    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders,
    });
  },
});

console.log(`🚀 DataVisProject server running on http://localhost:3000`);

function getContentType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const types = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'geojson': 'application/geo+json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
  };
  return types[ext] || 'text/plain';
}