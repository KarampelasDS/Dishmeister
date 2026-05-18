import styles from "./PhotoEditor.module.css";
import Button from "../Button/Button";
import { X, Search, RotateCcw } from "lucide-react";
import AvatarEditor from "react-avatar-editor";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../Hooks/useTheme";

interface PhotoEditorProps {
  imageFile: File;
  onClose?: () => void;
  onSave?: (canvas: HTMLCanvasElement | null) => void;
  onChangePhoto?: () => void;
  onError?: (message: string) => void;
  mode?: "profile" | "recipe";
}

export default function PhotoEditor({
  onClose,
  onSave,
  onChangePhoto,
  onError,
  imageFile,
  mode,
}: PhotoEditorProps) {
  const editorRef = useRef<AvatarEditor | null>(null);

  const [imageUrl, setImageUrl] = useState("");
  const [imageReady, setImageReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [grid] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    setImageReady(false);
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleSave = () => {
    if (!imageReady) {
      onError?.("The image is still loading. Try again in a moment.");
      return;
    }

    const canvas = editorRef.current?.getImage() ?? null;
    onSave?.(canvas);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>Edit {mode === "recipe" ? "Recipe" : "Profile"} Picture</h2>
            <p>
              Upload and crop your{" "}
              {mode === "recipe" ? "recipe picture" : "avatar"}
            </p>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} color="#fff" />
          </button>
        </div>

        <div className={styles.editorContainer}>
          <div className={styles.editorWrapper}>
            <AvatarEditor
              ref={editorRef}
              image={imageUrl}
              width={mode === "recipe" ? 350 : 260}
              height={mode === "recipe" ? 200 : 260}
              border={80}
              borderRadius={mode === "recipe" ? 20 : 999}
              scale={zoom}
              rotate={rotation}
              color={[0, 0, 0, 0.6]}
              disableHiDPIScaling
              onImageReady={() => setImageReady(true)}
              onLoadFailure={() => {
                setImageReady(false);
                onError?.(
                  "We couldn't load that image in the editor. Try a different JPG, PNG, or WebP.",
                );
              }}
            />

            {grid && (
              <div
                className={
                  mode === "recipe"
                    ? styles.gridOverlayRecipe
                    : styles.gridOverlay
                }
              >
                <div />
                <div />
                <div />
                <div />
              </div>
            )}
          </div>
        </div>

        <div className={styles.sliderContainer}>
          <div className={styles.sliderRow}>
            <Search size={18} />
            <input
              type="range"
              min={1}
              max={10}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <span className={styles.value}>{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        <div className={styles.sliderContainerPurple}>
          <div className={styles.sliderRow}>
            <RotateCcw size={18} />
            <input
              type="range"
              min={0}
              max={360}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
            />
            <span className={styles.valuePurple}>{rotation}°</span>
          </div>
        </div>

        {/*
        <div className={styles.gridButtonWrapper}>
          <Button
            onButtonClick={() => setGrid(!grid)}
            backgroundColor={grid ? "#CFF5D7" : "#e5e5e5"}
            textColor={grid ? "#0a7a3c" : "#444"}
          >
            <div className={styles.gridButton}>
              <Grid2x2 size={16} />
              Grid {grid ? "On" : "Off"}
            </div>
          </Button>
        </div>
        */}

        <div className={styles.buttonRow}>
          <Button
            onButtonClick={onChangePhoto}
            backgroundColor={theme == "dark" ? "#364153" : "#e5e5e5"}
            outline="0px"
          >
            Change Photo
          </Button>
          <Button
            onButtonClick={handleSave}
            backgroundColor="linear-gradient(90deg,#ff7a00,#ff2d55)"
            textColor="#fff"
            outline="0px"
          >
            Save {mode === "recipe" ? "Photo" : "Avatar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
