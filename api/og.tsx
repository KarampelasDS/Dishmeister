import { ImageResponse } from "@vercel/og";
import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "edge",
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const recipeBucketUrl = process.env.VITE_SUPABASE_RECIPE_BUCKET_URL || "";

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    let title = searchParams.get("title");
    let author = searchParams.get("author");
    let imageUrl = searchParams.get("image");
    let difficulty = searchParams.get("difficulty");
    const recipeId = searchParams.get("recipe");

    if (recipeId) {
      const { data: recipe, error } = await supabase
        .from("recipes")
        .select(`
          title,
          difficulty,
          image_url,
          profiles (
            display_name,
            username
          )
        `)
        .eq("id", recipeId)
        .single();

      if (!error && recipe) {
        title = recipe.title;
        difficulty = recipe.difficulty;
        imageUrl = `${recipeBucketUrl}${recipe.image_url}`;
        author = recipe.profiles?.display_name || recipe.profiles?.username || "Chef";
      }
    }

    title = title || "Discover Delicious Recipes";
    author = author || "Dishmeister";
    difficulty = difficulty || "Medium";
    imageUrl = imageUrl || "https://dishmeister.vercel.app/assets/pasta.jpg";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff",
            backgroundImage: "linear-gradient(to bottom right, #f8fafc, #f1f5f9)",
            fontFamily: "sans-serif",
          }}
        >
          {/* Background Decorative Element */}
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ff7a18, #af002d)",
              opacity: 0.1,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "90%",
              height: "80%",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              borderRadius: 32,
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
            }}
          >
            {/* Left side: Image */}
            <div style={{ display: "flex", width: "45%", height: "100%" }}>
              <img
                src={imageUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>

            {/* Right side: Content */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "55%",
                padding: "48px",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    padding: "8px 16px",
                    borderRadius: "99px",
                    backgroundColor: difficulty === "Easy" ? "#dcfce7" : difficulty === "Hard" ? "#fee2e2" : "#ffedd5",
                    color: difficulty === "Easy" ? "#166534" : difficulty === "Hard" ? "#991b1b" : "#9a3412",
                    fontSize: "18px",
                    fontWeight: "bold",
                    width: "fit-content",
                  }}
                >
                  {difficulty}
                </div>
                <h1
                  style={{
                    fontSize: "48px",
                    fontWeight: "900",
                    color: "#0f172a",
                    lineHeight: 1.1,
                    margin: 0,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {title}
                </h1>
                <p style={{ fontSize: "24px", color: "#64748b", margin: 0 }}>
                  by <span style={{ color: "#ef4444", fontWeight: "bold" }}>{author}</span>
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #ff7a18, #af002d)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
                <span style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a" }}>Dishmeister</span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
