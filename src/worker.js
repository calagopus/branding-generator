/** @typedef {{ ASSETS: { fetch: (req: Request | URL | string) => Promise<Response> } }} Env */

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/healthz") {
      return Response.json({ status: "ok", service: "calagopus-brander" });
    }

    if (url.pathname === "/api/mascots") {
      const res = await env.ASSETS.fetch(new URL("/mascots/manifest.json", url));
      if (!res.ok) return new Response("manifest not found", { status: 502 });
      const body = await res.text();
      return new Response(body, {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=300",
          "access-control-allow-origin": "*",
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
