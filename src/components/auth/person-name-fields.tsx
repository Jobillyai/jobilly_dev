import type { ChangeEventHandler } from "react";
import { FormField } from "@/components/auth/form-field";
import authStyles from "@/components/auth/auth-page.module.css";

type FieldConfig = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  error?: string;
  readOnly?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  className?: string;
};

type PersonNameFieldsProps = {
  firstName: FieldConfig;
  lastName: FieldConfig;
};

export function PersonNameFields({ firstName, lastName }: PersonNameFieldsProps) {
  return (
    <div className={authStyles.nameRow}>
      <FormField
        id={firstName.id ?? "firstName"}
        name={firstName.name ?? "firstName"}
        label="First name"
        placeholder="First name"
        autoComplete="given-name"
        value={firstName.value}
        defaultValue={firstName.defaultValue}
        error={firstName.error}
        readOnly={firstName.readOnly}
        onChange={firstName.onChange}
        className={firstName.className}
      />
      <FormField
        id={lastName.id ?? "lastName"}
        name={lastName.name ?? "lastName"}
        label="Last name"
        placeholder="Last name"
        autoComplete="family-name"
        value={lastName.value}
        defaultValue={lastName.defaultValue}
        error={lastName.error}
        readOnly={lastName.readOnly}
        onChange={lastName.onChange}
        className={lastName.className}
      />
    </div>
  );
}
