"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value: string; // ISO string or datetime-local format
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  label = "Data e Hora",
  required,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  useEffect(() => {
    setTempDate(value);
  }, [value]);

  const handleSave = () => {
    onChange(tempDate);
    setIsOpen(false);
  };

  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return "Selecione data e hora";

    try {
      const date = new Date(dateStr);
      return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
        locale: ptBR,
      });
    } catch {
      return "Selecione data e hora";
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-left",
          !value && "text-muted-foreground"
        )}
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          {formatDisplay(value)}
        </span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Agendar Publicação"
        size="sm"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date-picker-date">Data</Label>
              <div className="relative">
                <Input
                  id="date-picker-date"
                  type="date"
                  value={tempDate.split("T")[0] || ""}
                  onChange={(e) => {
                    const time = tempDate.split("T")[1] || "12:00";
                    setTempDate(`${e.target.value}T${time}`);
                  }}
                  className="text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-picker-time">Horário</Label>
              <div className="relative">
                <Input
                  id="date-picker-time"
                  type="time"
                  value={tempDate.split("T")[1]?.slice(0, 5) || ""}
                  onChange={(e) => {
                    const date =
                      tempDate.split("T")[0] ||
                      format(new Date(), "yyyy-MM-dd");
                    setTempDate(`${date}T${e.target.value}`);
                  }}
                  className="text-base"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} className="flex-1">
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
