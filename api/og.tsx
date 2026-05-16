import { ImageResponse } from "@vercel/og";
export const config = {
  runtime: "edge",
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const recipeBucketUrl = process.env.VITE_SUPABASE_RECIPE_BUCKET_URL || "";

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    if (!supabaseUrl || !supabaseKey) {
      return new ImageResponse(
        (
          <div style={{ padding: 40, backgroundColor: 'white', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ color: 'red' }}>Configuration Missing</h1>
            <p>Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel Environment Variables.</p>
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    let title = searchParams.get("title");
    let author = searchParams.get("author");
    let imageUrl = searchParams.get("image");
    let difficulty = searchParams.get("difficulty");
    const recipeId = searchParams.get("recipe");

    if (recipeId) {
      // Use fetch instead of the heavy Supabase client for Edge compatibility
      const res = await fetch(
        `${supabaseUrl}/rest/v1/recipes?id=eq.${recipeId}&select=title,difficulty,image_url,profiles(display_name,username)`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      
      const data = await res.json();
      const recipe = data?.[0];

      if (recipe) {
        title = recipe.title;
        difficulty = recipe.difficulty;
        if (recipe.image_url) {
          imageUrl = `${recipeBucketUrl}${recipe.image_url}`;
        }
        
        const profile = Array.isArray(recipe.profiles) ? recipe.profiles[0] : recipe.profiles;
        author = profile?.display_name || profile?.username || "Chef";
      }
    }

    title = title || "Discover Delicious Recipes";
    author = author || "Dishmeister";
    difficulty = difficulty || "Medium";
    
    if (!imageUrl || imageUrl.includes("/null") || imageUrl === "") {
      imageUrl = "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80";
    }

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
            backgroundImage: "linear-gradient(to bottom right, #f8fafc, #e2e8f0)",
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
              borderRadius: 200,
              background: "linear-gradient(135deg, #ff7a18, #af002d)",
              opacity: 0.1,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "1000px",
              height: "500px",
              backgroundColor: "white",
              borderRadius: "24px",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              position: "relative",
            }}
          >
            {/* Left side: Image */}
            <div 
              style={{ 
                display: "flex", 
                width: "450px", 
                height: "100%", 
                overflow: "hidden",
                backgroundColor: "#f1f5f9",
                position: "relative"
              }}
            >
              <img
                src={imageUrl}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            </div>

            {/* Right side: Content */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "550px",
                padding: "40px",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    backgroundColor: difficulty === "Easy" ? "#dcfce7" : difficulty === "Hard" ? "#fee2e2" : "#ffedd5",
                    color: difficulty === "Easy" ? "#166534" : difficulty === "Hard" ? "#991b1b" : "#9a3412",
                    fontSize: "16px",
                    fontWeight: "bold",
                    marginBottom: "16px",
                  }}
                >
                  {difficulty}
                </div>
                <h1
                  style={{
                    fontSize: "42px",
                    fontWeight: "900",
                    color: "#0f172a",
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  {title}
                </h1>
                <div style={{ display: "flex", fontSize: "22px", color: "#64748b", marginTop: "12px" }}>
                  by <span style={{ color: "#ef4444", fontWeight: "bold", marginLeft: "6px" }}>{author}</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: "linear-gradient(135deg, #ff7a18, #af002d)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "12px",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
                <span style={{ fontSize: "22px", fontWeight: "bold", color: "#0f172a" }}>Dishmeister</span>
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
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
  }
}
