"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Edit } from "lucide-react";

interface SortableImageProps {
  id: string;
  url: string;
  index: number;
  onRemove: () => void;
  onEdit: () => void;
  customLabel?: string;
}

export function SortableImage({
  id,
  url,
  index,
  onRemove,
  onEdit,
  customLabel,
}: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <img
        src={url}
        alt={`Media ${index + 1}`}
        className="w-full h-32 object-cover rounded-lg"
      />

      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 bg-black/70 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Index/Custom Label badge */}
      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {customLabel || index + 1}
      </div>

      {/* Remove button */}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          className="bg-black/70 text-white rounded-full p-1.5"
        >
          <Edit className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="bg-destructive text-destructive-foreground rounded-full p-1.5"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
