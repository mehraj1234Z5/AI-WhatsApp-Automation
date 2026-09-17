export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve static SPA assets from frontend/dist
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      if (response.status === 404 && !url.pathname.startsWith('/api')) {
        // Fallback to index.html for React Router SPA routes
        const indexRequest = new Request(new URL('/index.html', request.url), request);
        return env.ASSETS.fetch(indexRequest);
      }
      return response;
    }

    return new Response('AI WhatsApp Automation Frontend Asset Worker is running.', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
