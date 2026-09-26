import { useId, useState, type ChangeEvent, type DragEvent } from 'react';

interface DropZoneProps {
  title: string;
  hint?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}

export function DropZone({ title, hint, multiple = false, disabled = false, onFiles }: DropZoneProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  const deliver = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    deliver(event.target.files);
    // Allows choosing the same file again after an error.
    event.target.value = '';
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) deliver(event.dataTransfer.files);
  };

  return (
    <label
      htmlFor={inputId}
      className={`dropzone${dragging ? ' dropzone--active' : ''}${disabled ? ' dropzone--disabled' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        disabled={disabled}
        onChange={onChange}
        className="visually-hidden"
      />
      <span className="dropzone__title">{title}</span>
      {hint && <span className="dropzone__hint">{hint}</span>}
      <span className="dropzone__privacy">Processed on your device. Nothing is uploaded.</span>
    </label>
  );
}
