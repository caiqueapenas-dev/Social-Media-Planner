"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxProps {
  options: {
    value: string;
    label: string;
    avatarUrl?: string;
    icon?: React.ReactNode;
  }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum item encontrado.",
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {(() => {
            const selectedOption = options.find(
              (option) => option.value === value
            );
            if (!selectedOption) return placeholder;

            return (
              <div className="flex items-center gap-2">
                {selectedOption.avatarUrl && (
                  <img
                    src={
                      selectedOption.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${selectedOption.label}&background=random`
                    }
                    alt={selectedOption.label}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                {selectedOption.icon && !selectedOption.avatarUrl && (
                  <span className="text-muted-foreground">
                    {selectedOption.icon}
                  </span>
                )}
                <span>{selectedOption.label}</span>
              </div>
            );
          })()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option.label}
                value={option.label}
                onSelect={(currentLabel) => {
                  const selectedValue =
                    options.find((opt) => opt.label === currentLabel)?.value ||
                    "";
                  onChange(selectedValue === value ? "" : selectedValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex items-center gap-2">
                  {option.avatarUrl && (
                    <img
                      src={
                        option.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${option.label}&background=random`
                      }
                      alt={option.label}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  {option.icon && !option.avatarUrl && (
                    <span className="text-muted-foreground">{option.icon}</span>
                  )}
                  <span>{option.label}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
