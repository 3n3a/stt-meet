// src/index.js — stt-meet Worker

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

        // Chunked base64 encoding — avoids stack overflow from spread on large arrays
        const base64 = toBase64(audio);

        const result = await env.AI.run("@cf/openai/whisper-large-v3-turbo", {
          audio: base64,
          task: "transcribe",
          vad_filter: true,
        });

        return json(result);
      } catch (err) {
        return json({ error: String(err?.message || err), stack: err?.stack }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};

function toBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
