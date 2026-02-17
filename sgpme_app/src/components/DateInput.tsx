"use client";

import { forwardRef, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("es", es);

interface DateInputProps {
  value: string; // Formato ISO: yyyy-mm-dd
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
}

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputValue: string;
  setInputValue: (value: string) => void;
  onDateChange: (value: string) => void;
  manualToISO: (manual: string) => string;
}

// Custom input component fuera del render
const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  (
    {
      value: pickerValue,
      onClick,
      inputValue,
      setInputValue,
      onDateChange,
      manualToISO,
      name,
      placeholder,
      disabled,
      className,
    },
    ref
  ) => {
    const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let input = e.target.value.replace(/\D/g, "");

      if (input.length > 8) {
        input = input.slice(0, 8);
      }

      let formatted = "";
      if (input.length > 0) {
        formatted = input.slice(0, 2);
        if (input.length > 2) {
          formatted += "/" + input.slice(2, 4);
          if (input.length > 4) {
            formatted += "/" + input.slice(4, 8);
          }
        }
      }

      setInputValue(formatted);

      if (input.length === 8) {
        const isoDate = manualToISO(formatted);
        if (isoDate) {
          onDateChange(isoDate);
        }
      } else if (input.length === 0) {
        onDateChange("");
      }
    };

    const handleBlur = () => {
      const cleaned = inputValue.replace(/\D/g, "");
      if (cleaned.length > 0 && cleaned.length < 8) {
        setInputValue("");
        onDateChange("");
      }
    };

    const displayValue = inputValue || pickerValue;

    return (
      <input
        ref={ref}
        type="text"
        name={name}
        value={displayValue}
        onClick={onClick}
        onChange={handleManualChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        maxLength={10}
        inputMode="numeric"
        style={{
          backgroundImage: !displayValue
            ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='20'%3E%3Ctext x='5' y='15' font-family='Arial' font-size='14' fill='%239CA3AF' opacity='0.6'%3Edd/mm/aaaa%3C/text%3E%3C/svg%3E")`
            : "none",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "8px center",
        }}
      />
    );
  }
);

CustomInput.displayName = "CustomInput";

export default function DateInput({
  value,
  onChange,
  className = "",
  disabled = false,
  placeholder = "dd/mm/yyyy",
  name,
}: DateInputProps) {
  const [inputValue, setInputValue] = useState("");

  // Convertir de ISO (yyyy-mm-dd) a Date object
  const isoToDate = (isoDate: string): Date | null => {
    if (!isoDate) return null;
    const [year, month, day] = isoDate.split("-");
    // Usar Date.UTC para evitar problemas de zona horaria
    return new Date(
      Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0)
    );
  };

  // Convertir de Date object a ISO (yyyy-mm-dd)
  const dateToISO = (date: Date | null): string => {
    if (!date) return "";
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Convertir de formato manual dd/mm/yyyy a ISO
  const manualToISO = (manual: string): string => {
    const cleaned = manual.replace(/\D/g, "");
    if (cleaned.length !== 8) return "";

    const day = cleaned.slice(0, 2);
    const month = cleaned.slice(2, 4);
    const year = cleaned.slice(4, 8);

    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (
      dayNum < 1 ||
      dayNum > 31 ||
      monthNum < 1 ||
      monthNum > 12 ||
      yearNum < 1900 ||
      yearNum > 2100
    ) {
      return "";
    }

    return `${year}-${month}-${day}`;
  };

  const selectedDate = isoToDate(value);

  const handleDateChange = (date: Date | null) => {
    onChange(dateToISO(date));
  };

  return (
    <DatePicker
      selected={selectedDate}
      onChange={handleDateChange}
      dateFormat="dd/MM/yyyy"
      locale="es"
      customInput={
        <CustomInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          onDateChange={onChange}
          manualToISO={manualToISO}
          name={name}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
        />
      }
      disabled={disabled}
      showYearDropdown
      showMonthDropdown
      dropdownMode="select"
      yearDropdownItemNumber={100}
      scrollableYearDropdown
    />
  );
}
