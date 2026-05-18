import { useRef, useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { useAuth } from "../../Context/AuthProvider";
import Button from "../Button/Button";
import styles from "../CreateRecipe/CreateRecipe.module.css";

import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import PhotoEditor from "../PhotoEditor/PhotoEditor";
import { compressImage } from "../../utils/compressImage";
import {
  canDecodeImageFile,
  isSupportedImageFile,
  SUPPORTED_IMAGE_ACCEPT,
} from "../../utils/imageFileValidation";
import { getFriendlyErrorMessage } from "../../utils/errorUtils";
import { ChevronDown, ChevronUp } from "lucide-react";


const supabaseUrl = import.meta.env.VITE_SUPABASE_RECIPE_BUCKET_URL as string;

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
const TIME_INPUT_ERROR =
  "Enter times as a single whole number, like 35. Ranges like 30-35 and letters aren't supported.";
const timeInputControlKeys = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Enter",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

type Difficulty = (typeof difficultyOptions)[number];
type TimeUnit = (typeof timeUnits)[number];

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  preparation_time: number;
  cooking_time: number;
  servings: number;
  country_of_origin: string | null;
  image_url: string;
  difficulty: "Easy" | "Medium" | "Hard";
  preparation_unit: "Min" | "Hrs" | "Sec";
  cooking_unit: "Min" | "Hrs" | "Sec";
  like_count: number;
  dislike_count: number;
  current_user_reaction: "like" | "dislike" | null;
  is_saved: boolean;
  save_count: number;
  profiles: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  categories: {
    id: string;
    name: string;
  };
  ingredients: string[];
  instructions: string[];
};

interface EditRecipeProps {
  recipe: Recipe;
  onBack: () => void;
  onSaved: (updatedFields: Partial<Recipe>) => void;
}

function EditRecipe({ recipe, onBack, onSaved }: EditRecipeProps) {
  const { showError } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState(recipe.title);
  const [description, setDescription] = useState(recipe.description ?? "");
  const [countryOfOrigin, setCountryOfOrigin] = useState<string | null>(
    recipe.country_of_origin,
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(recipe.difficulty);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>(recipe.categories.id);
  const [preparationTime, setPreparationTime] = useState<number | "">(
    recipe.preparation_time,
  );
  const [preparationUnit, setPreparationUnit] = useState<TimeUnit>(
    recipe.preparation_unit,
  );
  const [cookingTime, setCookingTime] = useState<number | "">(
    recipe.cooking_time,
  );
  const [cookingUnit, setCookingUnit] = useState<TimeUnit>(recipe.cooking_unit);
  const [servings, setServings] = useState<number>(recipe.servings);
  const [ingredients, setIngredients] = useState<string[]>(recipe.ingredients);
  const [instructions, setInstructions] = useState<string[]>(
    recipe.instructions,
  );
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  // null means "no new image picked — keep existing"
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>(
    `${supabaseUrl}${recipe.image_url}`,
  );
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  const handleTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.ctrlKey ||
      e.metaKey ||
      timeInputControlKeys.has(e.key) ||
      /^[0-9]$/.test(e.key)
    ) {
      return;
    }

    e.preventDefault();
    showError(TIME_INPUT_ERROR);
  };

  const updateTimeField = (
    setter: React.Dispatch<React.SetStateAction<number | "">>,
    value: string,
  ) => {
    if (!/^\d*$/.test(value)) {
      showError(TIME_INPUT_ERROR);
      return;
    }

    setter(value === "" ? "" : Math.min(9999, Number(value)));
  };

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });

      if (!error && data) setCategories(data);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setPreviewImage(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  /* ---------------- INGREDIENTS ---------------- */

  const addIngredient = () => setIngredients([...ingredients, ""]);

  const updateIngredient = (index: number, value: string) => {
    const copy = [...ingredients];
    copy[index] = value;
    setIngredients(copy);
  };

  const moveIngredient = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= ingredients.length) return;

    const copy = [...ingredients];
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
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

  const moveInstruction = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= instructions.length) return;

    const copy = [...instructions];
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
    setInstructions(copy);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length === 1) return;
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  /* ---------------- IMAGE PICKER ---------------- */

  const openFilePicker = () => fileInputRef.current?.click();

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!isSupportedImageFile(file)) {
      showError("Only JPG, PNG, and WebP files are allowed.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showError("Image must be under 20MB.");
      return;
    }

    const canDecode = await canDecodeImageFile(file);
    if (!canDecode) {
      showError(
        "We couldn't read that image. Try exporting it as JPG, PNG, or WebP.",
      );
      return;
    }

    setFileKey((k) => k + 1);
    setImageFile(file);
    setPhotoEditorOpen(true);
  };

  /* ---------------- SUBMIT ---------------- */

  const submitEdit = async () => {
    const hasEmptyIngredient = ingredients.some((i) => !i.trim());
    const hasEmptyInstruction = instructions.some((i) => !i.trim());

    if (hasEmptyIngredient) {
      showError("All ingredient fields must be filled in.");
      return;
    }
    if (hasEmptyInstruction) {
      showError("All instruction steps must be filled in.");
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
      showError("All required fields must be filled");
      return;
    }

    const preparationNumber = Number(preparationTime);
    const cookingNumber = Number(cookingTime);

    if (
      !Number.isInteger(preparationNumber) ||
      !Number.isInteger(cookingNumber) ||
      preparationNumber <= 0 ||
      cookingNumber < 0 ||
      servings <= 0
    ) {
      showError(TIME_INPUT_ERROR);
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== recipe.profiles.id) {
      showError("You can only edit your own recipes.");
      setLoading(false);
      return;
    }

    let newImagePath: string | null = null;

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("recipe-images")
        .upload(filePath, imageFile, {
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) {
        showError(getFriendlyErrorMessage(uploadError));
        setLoading(false);
        return;
      }

      // track the new upload
      await supabase.from("storage_objects").insert({
        bucket: "recipe-images",
        path: filePath,
        uploaded_by: user.id,
      });

      newImagePath = filePath;
    }

    const updatedFields = {
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
      ...(newImagePath ? { image_url: newImagePath } : {}),
    };

    const { error } = await supabase
      .from("recipes")
      .update(updatedFields)
      .eq("id", recipe.id);

    if (error) {
      if (newImagePath) {
        await supabase.storage.from("recipe-images").remove([newImagePath]);
        await supabase
          .from("storage_objects")
          .delete()
          .eq("path", newImagePath);
      }
      showError(getFriendlyErrorMessage(error));
      setLoading(false);
      return;
    }

    if (newImagePath) {
      // mark new image as referenced
      await supabase
        .from("storage_objects")
        .update({ referenced: true })
        .eq("bucket", "recipe-images")
        .eq("path", newImagePath);

      // mark old image as unreferenced so the cron job cleans it up
      await supabase
        .from("storage_objects")
        .update({ referenced: false })
        .eq("bucket", "recipe-images")
        .eq("path", recipe.image_url);
    }

    setLoading(false);
    onSaved(updatedFields);
  };

  return (
    <>
      <div className={styles.page}>
        <div className={styles.card}>
          {/* HEADER */}
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Edit Recipe</h1>
            <div className={styles.headerIcon} aria-hidden="true">
              ✎
            </div>
          </div>

          {/* IMAGE */}
          <div className={styles.section}>
            <label className={styles.label}>Recipe Image</label>
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
              <div className={styles.imageOverlay}>
                <div className={styles.overlayInner}>
                  <div className={styles.overlayIcon} aria-hidden="true">
                    🖼️
                  </div>
                  <div className={styles.overlayText}>
                    Click to change image
                  </div>
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              key={fileKey}
              type="file"
              accept={SUPPORTED_IMAGE_ACCEPT}
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

          {/* GRID: TIME + SERVINGS */}
          <div className={styles.grid3}>
            <div className={styles.timeGroup}>
              <label className={styles.label}>
                Prep Time <span className={styles.required}>*</span>
              </label>
              <div className={styles.timeInputWrapper}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={preparationTime}
                  onKeyDown={handleTimeKeyDown}
                  onChange={(e) =>
                    updateTimeField(setPreparationTime, e.target.value)
                  }
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={cookingTime}
                  onKeyDown={handleTimeKeyDown}
                  onChange={(e) =>
                    updateTimeField(setCookingTime, e.target.value)
                  }
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
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
                Servings <span className={styles.required}>*</span>
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

          {/* DIFFICULTY + CATEGORY */}
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
                <option value={""}>Select category</option>
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
                <div className={styles.reorderControls}>
                  <button
                    type="button"
                    onClick={() => moveIngredient(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ingredient ${index + 1} up`}
                    title="Move up"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveIngredient(index, 1)}
                    disabled={index === ingredients.length - 1}
                    aria-label={`Move ingredient ${index + 1} down`}
                    title="Move down"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
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
                <div className={styles.reorderControls}>
                  <button
                    type="button"
                    onClick={() => moveInstruction(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move step ${index + 1} up`}
                    title="Move up"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveInstruction(index, 1)}
                    disabled={index === instructions.length - 1}
                    aria-label={`Move step ${index + 1} down`}
                    title="Move down"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
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
              text="Cancel"
              isActive={!loading}
              backgroundColor="transparent"
              textColor="var(--text-secondary)"
              onButtonClick={onBack}
              outline="1px solid var(--border)"
            />
            <Button
              text={loading ? "Saving..." : "Save Changes"}
              isActive={!loading}
              backgroundColor="linear-gradient(135deg,#f97316,#ef4444)"
              textColor="#fff"
              onButtonClick={submitEdit}
              outline="0px"
            />
          </div>
        </div>
      </div>

      {photoEditorOpen && imageFile && (
        <div className={styles.photoEditor}>
          <PhotoEditor
            mode={"recipe"}
            key={fileKey}
            onClose={() => {
              if (!compressing) setPhotoEditorOpen(false);
            }}
            onSave={async (canvas) => {
              if (!canvas) {
                showError("Image processing failed. Try a different image.");
                return;
              }

              const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, "image/png", 0.9),
              );
              if (!blob) {
                showError("Image processing failed. Try a different image.");
                return;
              }

              try {
                setCompressing(true);
                const raw = new File([blob], "recipe.png", { type: "image/png" });
                const compressed = await compressImage(raw, "recipe");

                setImageFile(compressed);
                setPhotoEditorOpen(false);
              } catch (err: any) {
                showError(
                  err.message || "Image processing failed. Try a different image.",
                );
              } finally {
                setCompressing(false);
              }
            }}
            onChangePhoto={() => {
              if (!compressing) fileInputRef.current?.click();
            }}
            onError={showError}
            imageFile={imageFile}
          />
        </div>
      )}
    </>
  );
}

export default EditRecipe;
