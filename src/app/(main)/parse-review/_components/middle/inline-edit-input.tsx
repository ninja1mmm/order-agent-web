"use client";

type InlineEditInputProps = {
  field: string;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
};

export function InlineEditInput({
  field,
  value,
  onChange,
  onCommit,
  onCancel,
}: InlineEditInputProps) {
  return (
    <input
      className="inline-edit-input"
      type={field === "quantity" ? "number" : "text"}
      value={value}
      autoFocus
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key === "Enter") onCommit();
        else if (event.key === "Escape") onCancel();
      }}
    />
  );
}
