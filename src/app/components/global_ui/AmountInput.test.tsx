import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { AmountInput, getAmountInputError, getAmountInputErrorId } from "./AmountInput";

describe("AmountInput", () => {
  it("announces precision errors with matching aria-describedby", () => {
    render(
      <AmountInput
        id="amount"
        label="Amount"
        value="1.12345678"
        onChange={jest.fn()}
        asset="USDC"
        required
        inputClassName="border"
      />,
    );

    const input = screen.getByLabelText(/Amount/);
    const error = screen.getByText("USDC supports at most 7 decimal places.");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "amount-error");
    expect(error).toHaveAttribute("id", "amount-error");
    expect(error).toHaveAttribute("role", "alert");
  });

  it("validates required, positive, min, max, and balance constraints", () => {
    expect(getAmountInputError("", { required: true })).toBe("Amount is required.");
    expect(getAmountInputError("0", { required: true })).toBe("Amount must be greater than 0.");
    expect(getAmountInputError("50", { min: 100, minMessage: "Minimum is 100." })).toBe(
      "Minimum is 100.",
    );
    expect(getAmountInputError("150", { max: 100, maxMessage: "Maximum is 100." })).toBe(
      "Maximum is 100.",
    );
    expect(getAmountInputError("150", { balance: 100 })).toBe(
      "Amount must not exceed your available balance of 100.",
    );
  });

  it("sanitizes input before notifying callers", async () => {
    const user = userEvent.setup();

    function AmountHarness() {
      const [value, setValue] = useState("");
      return (
        <AmountInput
          id="amount"
          label="Amount"
          value={value}
          onChange={setValue}
          inputClassName="border"
        />
      );
    }

    render(<AmountHarness />);

    await user.type(screen.getByLabelText("Amount"), "12abc.3.4");

    expect(screen.getByLabelText("Amount")).toHaveValue("12.34");
  });

  it("supports disabled buttons that reference the visible amount reason", () => {
    const amountError = getAmountInputError("0", { required: true });
    const errorId = getAmountInputErrorId("amount");

    render(
      <>
        <AmountInput
          id="amount"
          label="Amount"
          value="0"
          onChange={jest.fn()}
          required
          inputClassName="border"
        />
        <button type="button" disabled={!!amountError} aria-describedby={errorId}>
          Submit
        </button>
      </>,
    );

    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Submit" })).toHaveAccessibleDescription(
      "Amount must be greater than 0.",
    );
  });
});
