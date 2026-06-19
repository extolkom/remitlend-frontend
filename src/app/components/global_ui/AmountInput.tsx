"use client";

import * as React from "react";
import {
  buildAmountHelperText,
  getPrecisionError,
  parseAmount,
  sanitizeAmountInput,
} from "../../utils/amount";

export interface AmountValidationOptions {
  asset?: string;
  decimals?: number;
  required?: boolean;
  min?: number;
  max?: number;
  balance?: number;
  requiredMessage?: string;
  positiveMessage?: string;
  invalidMessage?: string;
  minMessage?: string;
  maxMessage?: string;
  balanceMessage?: string;
}

export function getAmountInputError(
  value: string,
  {
    asset = "XLM",
    decimals,
    required = false,
    min,
    max,
    balance,
    requiredMessage = "Amount is required.",
    positiveMessage = "Amount must be greater than 0.",
    invalidMessage = "Enter a valid amount.",
    minMessage,
    maxMessage,
    balanceMessage,
  }: AmountValidationOptions = {},
): string | null {
  if (!value) {
    return required ? requiredMessage : null;
  }

  const precisionError = getPrecisionError(value, asset, decimals);
  if (precisionError) {
    return precisionError;
  }

  const amount = parseAmount(value);
  if (Number.isNaN(amount)) {
    return invalidMessage;
  }
  if (amount <= 0) {
    return positiveMessage;
  }
  if (min !== undefined && amount < min) {
    return minMessage ?? `Minimum amount is ${min}.`;
  }
  if (max !== undefined && amount > max) {
    return maxMessage ?? `Maximum amount is ${max}.`;
  }
  if (balance !== undefined && amount > balance) {
    return balanceMessage ?? `Amount must not exceed your available balance of ${balance}.`;
  }

  return null;
}

export function getAmountInputErrorId(id: string): string {
  return `${id}-error`;
}

interface AmountInputProps
  extends Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      "onChange" | "value" | "type" | "min" | "max"
    >,
    AmountValidationOptions {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  helperClassName?: string;
  errorClassName?: string;
  showError?: boolean;
}

export function AmountInput({
  id,
  label,
  value,
  onChange,
  asset = "XLM",
  decimals,
  required = false,
  min,
  max,
  balance,
  requiredMessage,
  positiveMessage,
  invalidMessage,
  minMessage,
  maxMessage,
  balanceMessage,
  helperText,
  className = "space-y-1.5",
  inputClassName = "",
  helperClassName = "text-xs text-zinc-500 dark:text-zinc-400",
  errorClassName = "text-xs font-medium text-red-600 dark:text-red-400",
  showError = true,
  ...props
}: AmountInputProps) {
  const error = getAmountInputError(value, {
    asset,
    decimals,
    required,
    min,
    max,
    balance,
    requiredMessage,
    positiveMessage,
    invalidMessage,
    minMessage,
    maxMessage,
    balanceMessage,
  });
  const errorId = getAmountInputErrorId(id);
  const helperId = `${id}-helper`;
  const describedBy = error && showError ? errorId : helperText ? helperId : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        required={required}
        onChange={(event) => onChange(sanitizeAmountInput(event.target.value))}
        aria-invalid={error && showError ? true : undefined}
        aria-describedby={describedBy}
        className={inputClassName}
        min={min}
        max={max}
        step={decimals === undefined ? "0.0000001" : 1 / 10 ** decimals}
        {...props}
      />
      {error && showError ? (
        <p id={errorId} role="alert" className={errorClassName}>
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className={helperClassName}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export function getAmountHelperText(value: string, asset = "XLM", decimals?: number): string {
  return buildAmountHelperText(value, asset, decimals) ?? "Up to 7 decimal places supported.";
}
