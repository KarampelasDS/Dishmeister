import { ImageResponse } from "@vercel/og";
export const config = {
  runtime: "edge",
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const recipeBucketUrl = process.env.VITE_SUPABASE_RECIPE_BUCKET_URL || "";
const fallbackFoodImage =
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=900&q=85";

function LogoMark({ size = 64 }: { size?: number }) {
  const iconSize = Math.round(size * 0.56);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: "linear-gradient(135deg, #f97316, #ef4444, #ec4899)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 18px 34px rgba(249, 115, 22, 0.32)",
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
        <line x1="6" y1="17" x2="18" y2="17" />
      </svg>
    </div>
  );
}

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
    const isGenericCard =
      !recipeId && !title && !author && !imageUrl && !difficulty;

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

    if (isGenericCard) {
      return new ImageResponse(
        (
          <div
            style={{
              height: "100%",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #fff7ed 0%, #fff 48%, #f8fafc 100%)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -180,
                right: -100,
                width: 460,
                height: 460,
                borderRadius: 230,
                background: "rgba(239, 68, 68, 0.12)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -210,
                left: -90,
                width: 520,
                height: 520,
                borderRadius: 260,
                background: "rgba(249, 115, 22, 0.13)",
              }}
            />

            <div
              style={{
                width: 1030,
                height: 500,
                display: "flex",
                background: "#ffffff",
                border: "1px solid #fed7aa",
                borderRadius: 28,
                overflow: "hidden",
                boxShadow: "0 28px 80px rgba(15, 23, 42, 0.12)",
              }}
            >
              <div
                style={{
                  width: 460,
                  height: "100%",
                  display: "flex",
                  position: "relative",
                  overflow: "hidden",
                  background: "#f8fafc",
                }}
              >
                <img
                  src={fallbackFoodImage}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(90deg, rgba(0,0,0,0.08), rgba(0,0,0,0))",
                  }}
                />
              </div>

              <div
                style={{
                  width: 570,
                  padding: "54px 56px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <LogoMark size={70} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: 42,
                        fontWeight: 900,
                        color: "#111827",
                        lineHeight: 1,
                      }}
                    >
                      Dishmeister
                    </span>
                    <span
                      style={{
                        fontSize: 18,
                        color: "#ef4444",
                        fontWeight: 700,
                        marginTop: 8,
                      }}
                    >
                      Recipes worth sharing
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <h1
                    style={{
                      fontSize: 58,
                      fontWeight: 900,
                      color: "#0f172a",
                      lineHeight: 1.05,
                      margin: 0,
                      letterSpacing: "-1px",
                    }}
                  >
                    Discover, cook, and share better recipes.
                  </h1>
                  <p
                    style={{
                      fontSize: 24,
                      color: "#64748b",
                      lineHeight: 1.35,
                      margin: "22px 0 0",
                    }}
                  >
                    Build your cookbook, follow chefs, and save the dishes you want to make next.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    color: "#334155",
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  <LogoMark size={38} />
                  dishmeister.com
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
    }

    title = title || "Discover Delicious Recipes";
    author = author || "Dishmeister";

    if (!imageUrl || imageUrl.includes("/null") || imageUrl === "") {
      imageUrl = fallbackFoodImage;
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
                  objectFit: "cover",
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
                {difficulty && (
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
                )}
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
                <LogoMark size={40} />
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
