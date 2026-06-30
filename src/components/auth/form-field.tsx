import { type InputHTMLAttributes } from "react";
import styles from "./auth-page.module.css";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  fieldClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
  inputErrorClassName?: string;
}

export function FormField({
  label,
  error,
  id,
  className,
  fieldClassName,
  labelClassName,
  errorClassName,
  inputErrorClassName,
  ...inputProps
}: FormFieldProps) {
  const inputErrorClass = inputErrorClassName ?? styles.inputError;

  return (
    <div className={fieldClassName ?? styles.field}>
      <label htmlFor={id} className={labelClassName ?? styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={`${className ?? styles.input} ${error ? inputErrorClass : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className={errorClassName ?? styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
