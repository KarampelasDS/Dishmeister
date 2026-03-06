import styles from "./PhotoEditor.module.css";
import Button from "../Button/Button";
import { X, Search, Plus, RotateCcw, Grid2x2 } from "lucide-react";
import AvatarEditor from "react-avatar-editor";
import { useRef, useState } from "react";

interface PhotoEditorProps {
  imageFile: File;
  onClose?: () => void;
  onSave?: (canvas: HTMLCanvasElement | null) => void;
  onChangePhoto?: () => void;
}

export default function PhotoEditor({
  onClose,
  onSave,
  onChangePhoto,
  imageFile,
}: PhotoEditorProps) {
  const editorRef = useRef<AvatarEditor | null>(null);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [grid, setGrid] = useState(true);

  const handleSave = () => {
    const canvas = editorRef.current?.getImage() ?? null;
    onSave?.(canvas);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2>Edit Profile Picture</h2>
            <p>Upload and crop your avatar</p>
          </div>

          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} color="#fff" />
          </button>
        </div>

        {/* Editor */}
        <div className={styles.editorContainer}>
          <div className={styles.editorWrapper}>
            <AvatarEditor
              ref={editorRef}
              image={imageFile}
              width={260}
              height={260}
              border={80}
              borderRadius={999}
              scale={zoom}
              rotate={rotation}
              color={[0, 0, 0, 0.6]}
            />

            {grid && (
              <div className={styles.gridOverlay}>
                <div />
                <div />
                <div />
                <div />
              </div>
            )}
          </div>
        </div>

        {/* Zoom */}
        <div className={styles.sliderContainer}>
          <div className={styles.sliderRow}>
            <Search size={18} />

            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />

            <Plus size={18} />

            <span className={styles.value}>{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        {/* Rotation */}
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

        {/* Grid toggle */}
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

        {/* Buttons */}
        <div className={styles.buttonRow}>
          <Button
            onButtonClick={onChangePhoto}
            backgroundColor="#e5e5e5"
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
            Save Avatar
          </Button>
        </div>
      </div>
    </div>
  );
}
