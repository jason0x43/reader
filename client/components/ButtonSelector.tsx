import React from "react";
import Button from "./Button.tsx";

export interface ButtonSelectorProps {
  options: { label: string; value: string }[];
  selected: string;
  size?: "small" | "normal" | "large";
  onSelect: (value: string) => void;
}

const ButtonSelector: React.FC<ButtonSelectorProps> = (props) => {
  const { options, size, selected, onSelect } = props;

  return (
    <div className="ButtonSelector">
      {options.map((opt) => (
        <Button
          key={opt.value}
          className={selected === opt.value
            ? "ButtonSelector-selected"
            : undefined}
          label={opt.label}
          size={size}
          onClick={() => onSelect(opt.value)}
        />
      ))}
    </div>
  );
};

export default ButtonSelector;
