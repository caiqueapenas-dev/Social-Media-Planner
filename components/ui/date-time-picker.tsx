"use client";

import { useState, useEffect, useRef } from "react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Label } from "./label";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  label = "Data e Hora",
  required,
  disabled,
}: DateTimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : undefined;
  const timeValue = value ? format(new Date(value), "HH:mm") : "10:00";

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return;
    const [hours, minutes] = timeValue.split(":").map(Number);
    const newDate = new Date(day);
    newDate.setHours(hours, minutes);
    onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
    setShowPicker(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    const datePart = value
      ? format(new Date(value), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd");
    onChange(`${datePart}T${newTime}`);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="relative">
        <div className="flex items-center gap-4">
          <div
            className="relative flex-1 cursor-pointer"
            onClick={() => setShowPicker(true)}
          >
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={value ? format(new Date(value), "dd/MM/yyyy") : ""}
              placeholder="DD/MM/AAAA"
              className="pl-10 cursor-pointer"
              readOnly
              disabled={disabled}
            />
          </div>
          <Input
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            className="w-28"
            disabled={disabled}
          />
        </div>

        {showPicker && (
          <div className="absolute z-50 mt-2 bg-card border rounded-md shadow-lg p-2">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleDayClick}
              locale={ptBR}
              initialFocus
              captionLayout="dropdown-buttons"
              fromYear={new Date().getFullYear()}
              toYear={new Date().getFullYear() + 5}
            />
          </div>
        )}
      </div>
    </div>
  );
}
