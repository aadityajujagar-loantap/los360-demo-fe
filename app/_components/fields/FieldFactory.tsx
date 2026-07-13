"use client";

import { TextField, CheckboxGroup, OTPField, SelectField, FileField } from "./TextField";
import { RadioGroup } from "./RadioGroup";
import { Field } from "../../_types/journey";

/**
 * FieldFactory: The central switch for rendering the appropriate UI component
 * based on the field type provided in the configuration.
 */
interface FieldFactoryProps {
  field: Field;
  value?: any;
  onChange: (value: any) => void;
  variant?: "standard" | "button-group" | "toggle";
  error?: string;
}

export function FieldFactory({
  field,
  value,
  onChange,
  variant,
  error,
}: FieldFactoryProps) {
  switch (field.type) {
    case "text":
    case "number":
    case "date":
      return (
        <TextField {...field} value={value} onChange={onChange} error={error} />
      );

    case "radio":
      return (
        <RadioGroup
          {...field}
          value={value}
          onChange={onChange}
          variant={variant}
          error={error}
        />
      );

    case "checkbox":
      return (
        <CheckboxGroup
          {...field}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case "otp":
      return (
        <OTPField {...field} value={value} onChange={onChange} error={error} />
      );

    case "select":
      return (
        <SelectField
          {...field}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case "file":
      return (
        <FileField
          {...field}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    default:
      return null;
  }
}
