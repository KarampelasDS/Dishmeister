import { useState } from "react";
import { supabase } from "../supabase";

function CreateRecipe() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");

  const [preparationMinutes, setPreparationMinutes] = useState<number | "">("");
  const [cookingTimeMinutes, setCookingTimeMinutes] = useState<number | "">("");
  const [servings, setServings] = useState<number | "">("");

  const [loading, setLoading] = useState(false);

  const submitRecipe = async () => {
    const trimmedTitle = title.trim();
    const trimmedIngredients = ingredients.trim();
    const trimmedInstructions = instructions.trim();

    if (
      !trimmedTitle ||
      !trimmedIngredients ||
      !trimmedInstructions ||
      preparationMinutes === "" ||
      cookingTimeMinutes === "" ||
      servings === ""
    ) {
      alert("All required fields must be filled");
      return;
    }

    if (preparationMinutes <= 0 || cookingTimeMinutes < 0 || servings <= 0) {
      alert("Preparation time and servings must be greater than 0");
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      alert("You must be logged in");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("recipes").insert({
      author_id: user.id,
      title: trimmedTitle,
      preparation_minutes: preparationMinutes,
      cooking_time_minutes: cookingTimeMinutes,
      servings,
      country_of_origin: countryOfOrigin.trim() || null,
      description: description.trim() || null,
      ingredients: trimmedIngredients,
      instructions: trimmedInstructions,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    // reset form
    setTitle("");
    setDescription("");
    setIngredients("");
    setInstructions("");
    setCountryOfOrigin("");
    setPreparationMinutes("");
    setCookingTimeMinutes("");
    setServings("");

    alert("Recipe created");
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Create Recipe</h1>

      <input
        type="text"
        placeholder="Title *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        type="number"
        placeholder="Preparation time (minutes) *"
        value={preparationMinutes}
        min={1}
        onChange={(e) =>
          setPreparationMinutes(
            e.target.value === "" ? "" : Number(e.target.value),
          )
        }
      />

      <input
        type="number"
        placeholder="Cooking time (minutes) *"
        value={cookingTimeMinutes}
        min={0}
        onChange={(e) =>
          setCookingTimeMinutes(
            e.target.value === "" ? "" : Number(e.target.value),
          )
        }
      />

      <input
        type="number"
        placeholder="Servings *"
        value={servings}
        min={1}
        onChange={(e) =>
          setServings(e.target.value === "" ? "" : Number(e.target.value))
        }
      />

      <input
        type="text"
        placeholder="Country of origin (optional)"
        value={countryOfOrigin}
        onChange={(e) => setCountryOfOrigin(e.target.value)}
      />

      <textarea
        placeholder="Ingredients (one per line) *"
        value={ingredients}
        onChange={(e) => setIngredients(e.target.value)}
        rows={6}
      />

      <textarea
        placeholder="Instructions *"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        rows={8}
      />

      <button onClick={submitRecipe} disabled={loading}>
        {loading ? "Saving..." : "Create Recipe"}
      </button>
    </div>
  );
}

export default CreateRecipe;
