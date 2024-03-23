import { serve } from "bun";

const port = 3000;

serve({
  port,
  fetch: async (req) => {
    const url = new URL(req.url);
    console.log(req.method, url.pathname, url.search);

    const bod = await req.text();
    bod && console.log("Body: ", bod);

    return new Response(`hello from localhost:${port}`);
  },
});

console.log(`Serving app at http://localhost:${port}`);
