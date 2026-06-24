"use client";

import type { ModelOption } from "@/lib/mocks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ModelPickerProps = {
  models: ModelOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

/** Top-bar model selector — a rounded pill with an online status dot. */
export function ModelPicker({
  models,
  value,
  onChange,
  className,
}: ModelPickerProps) {
  return (
    <Select
      value={value}
      onValueChange={(id) => id && onChange(id)}
    >
      <SelectTrigger
        size="sm"
        className={cn(
          "gap-2 rounded-full border-border bg-background font-medium",
          className
        )}
        aria-label="Model"
      >
        <span className="size-1.75 rounded-full bg-(--color-chart-2)" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {models.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
