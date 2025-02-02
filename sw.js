let _decoderReady = new Promise(async resolve => {
  // FIXME: Doesn't work in Chrome yet.
  // const moduleDecl = await import('webp-decoder.js');
  // const imports = await moduleDecl.importWebPDecoder();

  importScripts("webp_wasm.js");
  importScripts("classic/webp-decoder.js");
  resolve(await fetchWebPDecoder());
});

function fetchWebPDecoderWithWorkarounds() {
  return _decoderReady;
}

async function supportsWebp() {
  if (!self.createImageBitmap) return false;

  const webpData =
    "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=";
  const blob = await fetch(webpData).then(r => r.blob());
  return createImageBitmap(blob).then(
    () => true,
    () => false
  );
}

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", async event => {
  if (event.request.method != "GET") return;
  if (!event.request.url.endsWith(".webp")) return;
  let canUseWebP = await supportsWebp();
  if (canUseWebP) return;
  event.respondWith(
    (async function() {
      try {
        const response = await fetch(event.request);
        const buffer = await response.arrayBuffer();

        const WebPDecoder = await fetchWebPDecoderWithWorkarounds();
        const decoder = new WebPDecoder(buffer);
        const blob = await decoder.decodeToBMP();

        return new Response(blob, {
          headers: { "content-type": "image/bmp", status: 200 }
        });
      } catch (err) {
        console.error(err);
      }

      return fetch(event.request);
    })()
  );
});
