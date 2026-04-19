// src/index.js — stt-meet Worker
// - POST /transcribe  -> Whisper transcription
// - everything else   -> static assets from ./public

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/transcribe") {
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
      }
      if (request.method !== "POST") {
        return json({ error: "POST audio bytes to /transcribe" }, 405);
      }

      try {
        const audio = new Uint8Array(await request.arrayBuffer());
        if (audio.byteLength === 0) {
          return json({ error: "empty body" }, 400);
        }

        const result = await env.AI.run("@cf/openai/whisper-large-v3-turbo", {
          audio: [...audio],
          task: "transcribe",
          vad_filter: true,
        });

        return json(result);
      } catch (err) {
        return json({ error: String(err?.message || err) }, 500);
      }
    }

    // Fall through to static assets (index.html, etc.)
    return env.ASSETS.fetch(request);
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
