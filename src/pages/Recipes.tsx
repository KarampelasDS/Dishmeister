import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router";

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  author_id: string;
};

const PAGE_SIZE = 10;

function Recipes() {
  const navigate = useNavigate();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchRecipes = async () => {
    setLoading(true);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("recipes")
      .select("id, title, description, created_at, author_id")
      .order("created_at", { ascending: false })
      .range(from, to);

    setLoading(false);

    if (error) {
      console.error(error.message);
      return;
    }

    setRecipes(data);
    setHasMore(data.length === PAGE_SIZE);
  };

  useEffect(() => {
    fetchRecipes();
  }, [page]);

  return (
    <div style={{ maxWidth: 720 }}>
      <h1>Recipes</h1>

      <button onClick={() => navigate("/recipes/new")}>Create recipe</button>

      {loading && <p>Loading...</p>}

      {!loading && recipes.length === 0 && <p>No recipes yet.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {recipes.map((recipe) => (
          <li
            key={recipe.id}
            style={{
              border: "1px solid #ddd",
              padding: 16,
              marginBottom: 12,
              cursor: "pointer",
            }}
            onClick={() => navigate(`/recipes/${recipe.id}`)}
          >
            <h3>{recipe.title}</h3>

            {recipe.description && <p>{recipe.description}</p>}

            <small>{new Date(recipe.created_at).toLocaleDateString()}</small>
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>

        <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

export default Recipes;
