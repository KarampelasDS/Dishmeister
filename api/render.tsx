export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const host = req.headers.get("host") || "dishmeister.vercel.app";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  // Fetch the static index.html from the deployment
  const response = await fetch(`${baseUrl}/index.html`);
  if (!response.ok) {
    return new Response("Failed to load base template", { status: 500 });
  }

  let html = await response.text();

  if (id) {
    const ogImageUrl = `${baseUrl}/api/og?recipe=${id}`;
    
    // Inject dynamic OG image
    html = html.replace(
      /<meta property="og:image" content="\/api\/og" \/>/g,
      `<meta property="og:image" content="${ogImageUrl}" />`
    );
    
    // Inject dynamic Twitter image
    html = html.replace(
      /<meta property="twitter:image" content="\/api\/og" \/>/g,
      `<meta property="twitter:image" content="${ogImageUrl}" />`
    );

    // Optional: You could also fetch the recipe title here to update the og:title
    // but for now, we'll focus on the image as requested.
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, s-maxage=3600",
    },
  });
}
