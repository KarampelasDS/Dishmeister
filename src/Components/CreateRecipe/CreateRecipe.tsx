import { useRef, useState, useEffect } from "react";
import { supabase } from "../../supabase";
import Button from "../Button/Button";
import styles from "./CreateRecipe.module.css";

import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import PhotoEditor from "../PhotoEditor/PhotoEditor";

type Category = {
  id: string;
  name: string;
};

countries.registerLocale(en);

const countryOptions = Object.entries(
  countries.getNames("en", { select: "official" }),
)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const difficultyOptions = ["Easy", "Medium", "Hard"] as const;

const timeUnits = ["Min", "Hrs", "Sec"] as const;

type Difficulty = (typeof difficultyOptions)[number];
type TimeUnit = (typeof timeUnits)[number];

function CreateRecipe() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState<string | null>(null);

  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");

  const [preparationTime, setPreparationTime] = useState<number | "">("");
  const [preparationUnit, setPreparationUnit] = useState<TimeUnit>("Min");

  const [cookingTime, setCookingTime] = useState<number | "">("");
  const [cookingUnit, setCookingUnit] = useState<TimeUnit>("Min");

  const [servings, setServings] = useState<number>(4);

  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [instructions, setInstructions] = useState<string[]>([""]);

  const [loading, setLoading] = useState(false);

  const [previewImage, setPreviewImage] = useState<string | null>(
    "https://images.unsplash.com/photo-1521388825798-fec41108def2?auto=format&fit=crop&w=1400&q=80",
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });

      if (!error && data) {
        setCategories(data);
      }
    };

    fetchCategories();
  }, []);

  /* ---------------- INGREDIENTS ---------------- */

  const addIngredient = () => setIngredients([...ingredients, ""]);

  const updateIngredient = (index: number, value: string) => {
    const copy = [...ingredients];
    copy[index] = value;
    setIngredients(copy);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length === 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  /* ---------------- INSTRUCTIONS ---------------- */

  const addInstruction = () => setInstructions([...instructions, ""]);

  const updateInstruction = (index: number, value: string) => {
    const copy = [...instructions];
    copy[index] = value;
    setInstructions(copy);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length === 1) return;
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  /* ---------------- IMAGE PICKER ---------------- */
  useEffect(() => {
    if (!imageFile) {
      if (previewImage) URL.revokeObjectURL(previewImage);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewImage(url);

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg"];

    if (!allowedTypes.includes(file.type)) {
      alert("Only PNG and JPEG files are allowed.");
      e.target.value = "";
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert("Image must be under 5MB.");
      e.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    if (previewImage.startsWith("blob:")) {
      URL.revokeObjectURL(previewImage);
    }

    e.target.value = "";
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFileKey((k) => k + 1);
    setPhotoEditorOpen(true);
    setPreviewImage(objectUrl);
    setImageFile(file);
  };

  /* ---------------- SUBMIT ---------------- */

  const submitRecipe = async () => {
    const hasEmptyIngredient = ingredients.some((i) => !i.trim());
    const hasEmptyInstruction = instructions.some((i) => !i.trim());

    if (hasEmptyIngredient) {
      alert("All ingredient fields must be filled in.");
      return;
    }

    if (hasEmptyInstruction) {
      alert("All instruction steps must be filled in.");
      return;
    }

    const cleanedIngredients = ingredients.map((i) => i.trim());
    const cleanedInstructions = instructions.map((i) => i.trim());

    if (
      !title.trim() ||
      cleanedIngredients.length === 0 ||
      cleanedInstructions.length === 0 ||
      preparationTime === "" ||
      cookingTime === "" ||
      !categoryId
    ) {
      alert("All required fields must be filled");
      return;
    }

    if (!imageFile) {
      alert("Recipe image is required.");
      return;
    }

    if (
      Number(preparationTime) <= 0 ||
      Number(cookingTime) < 0 ||
      servings <= 0
    ) {
      alert("Invalid numeric values");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in");
      setLoading(false);
      return;
    }

    const fileExt = imageFile.name.split(".").pop();
    const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(filePath, imageFile, { upsert: false });

    if (uploadError) {
      alert(uploadError.message);
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("recipes").insert({
      author_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      country_of_origin: countryOfOrigin,
      difficulty,
      category_id: categoryId,
      preparation_time: Number(preparationTime),
      preparation_unit: preparationUnit,
      cooking_time: Number(cookingTime),
      cooking_unit: cookingUnit,
      servings,
      ingredients: cleanedIngredients,
      instructions: cleanedInstructions,
      image_url: filePath,
    });

    setLoading(false);

    if (error) {
      await supabase.storage.from("recipe-images").remove([filePath]);

      alert(error.message);
      setLoading(false);
      return;
    }

    alert("Recipe created");
    setTitle("");
    setDescription("");
    setIngredients([""]);
    setInstructions([""]);
    setImageFile(null);
    setPreviewImage(
      "https://images.unsplash.com/photo-1521388825798-fec41108def2?auto=format&fit=crop&w=1400&q=80",
    );
    setCategoryId("");
    setPreparationTime("");
    setCookingTime("");
    setServings(4);
  };

  return (
    <>
      <div className={styles.page}>
        <div className={styles.card}>
          {/* HEADER */}
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Create New Recipe</h1>
            <div className={styles.headerIcon} aria-hidden="true">
              +
            </div>
          </div>

          {/* IMAGE */}
          <div className={styles.section}>
            <label className={styles.label}>
              Recipe Name <span className={styles.required}>*</span>
            </label>

            <div
              className={styles.imageUpload}
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openFilePicker();
              }}
            >
              <img src={previewImage} alt="Recipe preview" />

              {/* Hover overlay */}
              <div className={styles.imageOverlay}>
                <div className={styles.overlayInner}>
                  <div className={styles.overlayIcon} aria-hidden="true">
                    🖼️
                  </div>
                  <div className={styles.overlayText}>
                    Click to upload image
                  </div>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg"
              className={styles.hiddenFileInput}
              onChange={onFilePicked}
            />
          </div>

          {/* NAME */}
          <div className={styles.section}>
            <label className={styles.label}>
              Recipe Name <span className={styles.required}>*</span>
            </label>

            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Creamy Carbonara"
            />
          </div>

          {/* DESCRIPTION */}
          <div className={styles.section}>
            <label className={styles.label}>
              Description <span className={styles.required}>*</span>
            </label>

            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your recipe..."
            />
          </div>

          {/* GRID: TIME + DIFFICULTY + CATEGORY */}
          <div className={styles.grid3}>
            <div className={styles.timeGroup}>
              <label className={styles.label}>
                Prep Time <span className={styles.required}>*</span>
              </label>

              <div className={styles.timeInputWrapper}>
                <input
                  type="number"
                  value={preparationTime}
                  min={1}
                  onChange={(e) =>
                    setPreparationTime(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                />
                <select
                  value={preparationUnit}
                  onChange={(e) =>
                    setPreparationUnit(e.target.value as TimeUnit)
                  }
                >
                  {timeUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.timeGroup}>
              <label className={styles.label}>
                Cook Time <span className={styles.required}>*</span>
              </label>

              <div className={styles.timeInputWrapper}>
                <input
                  type="number"
                  value={cookingTime}
                  min={0}
                  onChange={(e) =>
                    setCookingTime(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                />
                <select
                  value={cookingUnit}
                  onChange={(e) => setCookingUnit(e.target.value as TimeUnit)}
                >
                  {timeUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={styles.label}>
                Servings<span className={styles.required}>*</span>
              </label>

              <div className={styles.stepper}>
                <button
                  type="button"
                  onClick={() => setServings(Math.max(1, servings - 1))}
                  aria-label="Decrease servings"
                >
                  –
                </button>
                <span>{servings}</span>
                <button
                  type="button"
                  onClick={() => setServings(servings + 1)}
                  aria-label="Increase servings"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className={styles.grid2}>
            <div>
              <label className={styles.label}>
                Difficulty <span className={styles.required}>*</span>
              </label>

              <select
                className={styles.select}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                {difficultyOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={styles.label}>
                Category <span className={styles.required}>*</span>
              </label>

              <select
                className={styles.select}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* COUNTRY */}
          <div className={styles.section}>
            <label className={styles.label}>Country of origin</label>
            <select
              className={styles.select}
              value={countryOfOrigin ?? ""}
              onChange={(e) => setCountryOfOrigin(e.target.value || null)}
            >
              <option value="">Select country</option>
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* INGREDIENTS */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <label className={styles.label}>
                Ingredients <span className={styles.required}>*</span>
              </label>

              <button
                type="button"
                onClick={addIngredient}
                className={styles.addLink}
              >
                + Add Ingredient
              </button>
            </div>

            {ingredients.map((ingredient, index) => (
              <div key={index} className={styles.dynamicRow}>
                <input
                  className={styles.input}
                  value={ingredient}
                  onChange={(e) => updateIngredient(index, e.target.value)}
                  placeholder={`Ingredient ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className={styles.removeBtn}
                  aria-label="Remove ingredient"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* INSTRUCTIONS */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <label className={styles.label}>
                Instructions <span className={styles.required}>*</span>
              </label>

              <button
                type="button"
                onClick={addInstruction}
                className={styles.addLink}
              >
                + Add Step
              </button>
            </div>

            {instructions.map((instruction, index) => (
              <div key={index} className={styles.dynamicRow}>
                <div className={styles.stepIndex}>{index + 1}</div>
                <textarea
                  className={styles.textarea}
                  value={instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  placeholder={`Step ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeInstruction(index)}
                  className={styles.removeBtn}
                  aria-label="Remove instruction"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* FOOTER */}
          <div className={styles.footer}>
            <Button
              text={loading ? "Saving..." : "Publish Recipe"}
              isActive={!loading}
              backgroundColor="linear-gradient(135deg,#f97316,#ef4444)"
              textColor="#fff"
              onButtonClick={submitRecipe}
              outline="0px"
            />
          </div>
        </div>
      </div>
      {photoEditorOpen && imageFile && (
        <PhotoEditor
          mode={"recipe"}
          key={fileKey}
          onClose={() => setPhotoEditorOpen(false)}
          onSave={async (canvas) => {
            if (!canvas) return;

            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, "image/png", 0.9),
            );

            if (!blob) return;

            const file = new File([blob], "avatar.png", {
              type: "image/png",
            });

            setImageFile(file);
            setPhotoEditorOpen(false);
          }}
          onChangePhoto={() => fileInputRef.current?.click()}
          imageFile={imageFile}
        />
      )}
    </>
  );
}

export default CreateRecipe;
