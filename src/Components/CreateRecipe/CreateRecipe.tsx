import { useRef, useState, useEffect } from "react";
import { supabase } from "../../supabase";
import Button from "../Button/Button";
import styles from "./CreateRecipe.module.css";

import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import PhotoEditor from "../PhotoEditor/PhotoEditor";
import { useLocalDraft } from "../../Hooks/useLocalDraft";
import { compressImage } from "../../utils/compressImage";
import SuccessModal from "../SuccessModal/SuccessModal";
import ErrorModal from "../ErrorModal/ErrorModal";

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

const DRAFT_KEY = "dishmeister:create-recipe-draft";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521388825798-fec41108def2?auto=format&fit=crop&w=1400&q=80";

const defaultDraft = {
  title: "",
  description: "",
  countryOfOrigin: null as string | null,
  difficulty: "Medium" as Difficulty,
  categoryId: "",
  preparationTime: "" as number | "",
  preparationUnit: "Min" as TimeUnit,
  cookingTime: "" as number | "",
  cookingUnit: "Min" as TimeUnit,
  servings: 4,
  ingredients: [""],
  instructions: [""],
  savedImageBase64: null as string | null, // persisted across navigation
};

function CreateRecipe() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [draft, setDraft] = useLocalDraft(DRAFT_KEY, defaultDraft);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // imageFile is the in-memory File object (not persisted).
  // On mount, if there's a savedImageBase64 in the draft, we reconstruct a
  // preview from it. If the user picks a new image, we update both.
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>(
    draft.savedImageBase64 ?? FALLBACK_IMAGE,
  );
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorModal, setErrorModal] = useState({ open: false, message: "" });

  const setField = <K extends keyof typeof defaultDraft>(
    key: K,
    value: (typeof defaultDraft)[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

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

  /* ---------------- INGREDIENTS ---------------- */

  const addIngredient = () =>
    setField("ingredients", [...draft.ingredients, ""]);

  const updateIngredient = (index: number, value: string) => {
    const copy = [...draft.ingredients];
    copy[index] = value;
    setField("ingredients", copy);
  };

  const removeIngredient = (index: number) => {
    if (draft.ingredients.length === 1) return;
    setField(
      "ingredients",
      draft.ingredients.filter((_, i) => i !== index),
    );
  };

  /* ---------------- INSTRUCTIONS ---------------- */

  const addInstruction = () =>
    setField("instructions", [...draft.instructions, ""]);

  const updateInstruction = (index: number, value: string) => {
    const copy = [...draft.instructions];
    copy[index] = value;
    setField("instructions", copy);
  };

  const removeInstruction = (index: number) => {
    if (draft.instructions.length === 1) return;
    setField(
      "instructions",
      draft.instructions.filter((_, i) => i !== index),
    );
  };

  /* ---------------- IMAGE PICKER ---------------- */

  // When imageFile changes (new pick or after PhotoEditor), update the
  // preview and persist a base64 copy to the draft so it survives navigation.
  useEffect(() => {
    if (!imageFile) return;

    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewImage(objectUrl);

    // Persist as base64 so it survives a navigation away and back
    const reader = new FileReader();
    reader.onload = () => {
      setField("savedImageBase64", reader.result as string);
    };
    reader.readAsDataURL(imageFile);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const openFilePicker = () => fileInputRef.current?.click();

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setErrorModal({
        open: true,
        message: "Only PNG, JPEG, and WebP files are allowed.",
      });
      e.target.value = "";
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorModal({ open: true, message: "Image must be under 20MB." });
      e.target.value = "";
      return;
    }

    e.target.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";

    setFileKey((k) => k + 1);
    setImageFile(file);
    setPhotoEditorOpen(true);
  };

  /* ---------------- SUBMIT ---------------- */

  const submitRecipe = async () => {
    const hasEmptyIngredient = draft.ingredients.some((i) => !i.trim());
    const hasEmptyInstruction = draft.instructions.some((i) => !i.trim());

    if (hasEmptyIngredient) {
      setErrorModal({
        open: true,
        message: "All ingredient fields must be filled in.",
      });
      return;
    }

    if (hasEmptyInstruction) {
      setErrorModal({
        open: true,
        message: "All instruction steps must be filled in.",
      });
      return;
    }

    const cleanedIngredients = draft.ingredients.map((i) => i.trim());
    const cleanedInstructions = draft.instructions.map((i) => i.trim());

    if (
      !draft.title.trim() ||
      cleanedIngredients.length === 0 ||
      cleanedInstructions.length === 0 ||
      draft.preparationTime === "" ||
      draft.cookingTime === "" ||
      !draft.categoryId
    ) {
      setErrorModal({
        open: true,
        message: "All required fields must be filled",
      });
      return;
    }

    if (!imageFile && !draft.savedImageBase64) {
      setErrorModal({ open: true, message: "Recipe image is required." });
      return;
    }

    if (
      Number(draft.preparationTime) <= 0 ||
      Number(draft.cookingTime) < 0 ||
      draft.servings <= 0
    ) {
      setErrorModal({ open: true, message: "Invalid numeric values" });
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorModal({
        open: true,
        message: "You must be logged in to create a recipe.",
      });
      setLoading(false);
      return;
    }

    // If user navigated away and back, imageFile will be null but we have
    // the base64. Reconstruct a File from it for upload.
    let fileToUpload = imageFile;

    if (!fileToUpload && draft.savedImageBase64) {
      const res = await fetch(draft.savedImageBase64);
      const blob = await res.blob();
      fileToUpload = new File([blob], "recipe.png", { type: blob.type });
    }

    if (!fileToUpload) {
      setErrorModal({ open: true, message: "Recipe image is required." });
      setLoading(false);
      return;
    }

    const fileExt = fileToUpload.name.split(".").pop();
    const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(filePath, fileToUpload, {
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      setErrorModal({ open: true, message: uploadError.message });
      setLoading(false);
      return;
    }

    await supabase.from("storage_objects").insert({
      bucket: "recipe-images",
      path: filePath,
      uploaded_by: user.id,
    });

    const { error } = await supabase.from("recipes").insert({
      author_id: user.id,
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      country_of_origin: draft.countryOfOrigin,
      difficulty: draft.difficulty,
      category_id: draft.categoryId,
      preparation_time: Number(draft.preparationTime),
      preparation_unit: draft.preparationUnit,
      cooking_time: Number(draft.cookingTime),
      cooking_unit: draft.cookingUnit,
      servings: draft.servings,
      ingredients: cleanedIngredients,
      instructions: cleanedInstructions,
      image_url: filePath,
    });

    setLoading(false);

    if (error) {
      await supabase.storage.from("recipe-images").remove([filePath]);
      await supabase.from("storage_objects").delete().eq("path", filePath);
      setErrorModal({ open: true, message: error.message });
      setLoading(false);
      return;
    }

    await supabase
      .from("storage_objects")
      .update({ referenced: true })
      .eq("bucket", "recipe-images")
      .eq("path", filePath);

    // Clear draft and reset state
    localStorage.removeItem(DRAFT_KEY);
    setDraft(defaultDraft);
    setImageFile(null);
    setPreviewImage(FALLBACK_IMAGE);
    setShowSuccess(true);
  };

  return (
    <>
      {showSuccess && (
        <SuccessModal
          isOpen={showSuccess}
          onClose={() => setShowSuccess(false)}
          message="Your delicious recipe has been shared with the world!"
        />
      )}
      {errorModal.open && (
        <ErrorModal
          isOpen={errorModal.open}
          onClose={() => setErrorModal({ ...errorModal, open: false })}
          message={errorModal.message}
        />
      )}

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
              Recipe Image <span className={styles.required}>*</span>
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
              key={fileKey}
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
              value={draft.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g., Creamy Carbonara"
              maxLength={80}
            />
            <small className={styles.charCounter}>
              {draft.title.length}/80
            </small>
          </div>

          {/* DESCRIPTION */}
          <div className={styles.section}>
            <label className={styles.label}>
              Description <span className={styles.required}>*</span>
            </label>
            <textarea
              className={styles.textarea}
              value={draft.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Tell us about your recipe..."
              maxLength={300}
            />
            <small className={styles.charCounter}>
              {draft.description.length}/300
            </small>
          </div>

          {/* GRID: TIME + SERVINGS */}
          <div className={styles.grid3}>
            <div className={styles.timeGroup}>
              <label className={styles.label}>
                Prep Time <span className={styles.required}>*</span>
              </label>
              <div className={styles.timeInputWrapper}>
                <input
                  type="number"
                  value={draft.preparationTime}
                  min={1}
                  onChange={(e) =>
                    setField(
                      "preparationTime",
                      e.target.value === ""
                        ? ""
                        : Math.min(9999, Number(e.target.value)),
                    )
                  }
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />

                <select
                  value={draft.preparationUnit}
                  onChange={(e) =>
                    setField("preparationUnit", e.target.value as TimeUnit)
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
                  value={draft.cookingTime}
                  min={0}
                  onChange={(e) =>
                    setField(
                      "cookingTime",
                      e.target.value === ""
                        ? ""
                        : Math.min(9999, Number(e.target.value)),
                    )
                  }
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />

                <select
                  value={draft.cookingUnit}
                  onChange={(e) =>
                    setField("cookingUnit", e.target.value as TimeUnit)
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

            <div>
              <label className={styles.label}>
                Servings <span className={styles.required}>*</span>
              </label>
              <div className={styles.stepper}>
                <button
                  type="button"
                  onClick={() =>
                    setField("servings", Math.max(1, draft.servings - 1))
                  }
                  aria-label="Decrease servings"
                >
                  –
                </button>
                <span>{draft.servings}</span>
                <button
                  type="button"
                  onClick={() =>
                    setField("servings", Math.min(99, draft.servings + 1))
                  }
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
                value={draft.difficulty}
                onChange={(e) =>
                  setField("difficulty", e.target.value as Difficulty)
                }
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
                value={draft.categoryId}
                onChange={(e) => setField("categoryId", e.target.value)}
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
              value={draft.countryOfOrigin ?? ""}
              onChange={(e) =>
                setField("countryOfOrigin", e.target.value || null)
              }
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
            {draft.ingredients.map((ingredient, index) => (
              <div key={index} className={styles.dynamicRow}>
                <div style={{ flex: 1 }}>
                  <textarea
                    className={`${styles.textarea} ${styles.ingredientTextarea}`}
                    value={ingredient}
                    onChange={(e) => updateIngredient(index, e.target.value)}
                    placeholder={`Ingredient ${index + 1}`}
                    maxLength={100}
                  />
                  <small className={styles.charCounter}>
                    {ingredient.length}/100
                  </small>
                </div>

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
            {draft.instructions.map((instruction, index) => (
              <div key={index} className={styles.dynamicRow}>
                <div className={styles.stepIndex}>{index + 1}</div>
                <div style={{ flex: 1 }}>
                  <textarea
                    className={styles.textarea}
                    value={instruction}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    placeholder={`Step ${index + 1}`}
                    maxLength={500}
                  />
                  <small className={styles.charCounter}>
                    {instruction.length}/500
                  </small>
                </div>

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
        <div className={styles.photoEditor}>
          <PhotoEditor
            mode={"recipe"}
            key={fileKey}
            onClose={() => {
              if (!compressing) setPhotoEditorOpen(false);
            }}
            onSave={async (canvas) => {
              if (!canvas) return;

              const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, "image/png", 0.9),
              );
              if (!blob) return;

              setCompressing(true);
              const raw = new File([blob], "recipe.png", { type: "image/png" });
              const compressed = await compressImage(raw, "recipe");
              setCompressing(false);

              setImageFile(compressed);
              setPhotoEditorOpen(false);
            }}
            onChangePhoto={() => {
              if (!compressing) fileInputRef.current?.click();
            }}
            imageFile={imageFile}
          />
        </div>
      )}
    </>
  );
}

export default CreateRecipe;
