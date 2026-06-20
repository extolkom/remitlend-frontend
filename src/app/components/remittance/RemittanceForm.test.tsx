import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RemittanceForm } from "../remittance/RemittanceForm";

// Mock the dependencies
jest.mock("../../hooks/useApi", () => ({
  useCreateRemittance: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

jest.mock("../../stores/useWalletStore", () => ({
  useWalletStore: jest.fn((selector) => selector({ address: "GTEST123" })),
  selectWalletAddress: (state: Record<string, unknown>) => state.address,
}));

jest.mock("../../hooks/useTransactionPreview", () => ({
  useTransactionPreview: jest.fn(() => ({
    isOpen: false,
    show: jest.fn(),
    hide: jest.fn(),
    data: {
      network: "testnet",
      operations: [],
      balanceChanges: [],
    },
    onConfirm: jest.fn(),
  })),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe("RemittanceForm", () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the form", () => {
    render(<RemittanceForm onSuccess={mockOnSuccess} />);
    expect(screen.getByText("Send Remittance")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("G... (Stellar public key)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
  });

  it("should show visible reason when recipient address is empty", () => {
    render(<RemittanceForm onSuccess={mockOnSuccess} />);
    const reviewButton = screen.getByText("Review & Send");

    expect(reviewButton).toBeDisabled();
    expect(screen.getByText(/Enter a recipient address/)).toBeInTheDocument();
  });

  it("should show error for invalid Stellar address", async () => {
    const user = userEvent.setup();
    render(<RemittanceForm onSuccess={mockOnSuccess} />);

    const addressInput = screen.getByPlaceholderText("G... (Stellar public key)");
    await user.type(addressInput, "INVALID123");
    await user.type(screen.getByPlaceholderText("0.00"), "10");

    const reviewButton = screen.getByText("Review & Send");
    fireEvent.click(reviewButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid Stellar address format/)).toBeInTheDocument();
    });
  });

  it("should show visible reason when amount is empty", async () => {
    const user = userEvent.setup();
    render(<RemittanceForm onSuccess={mockOnSuccess} />);

    const addressInput = screen.getByPlaceholderText("G... (Stellar public key)");
    await user.type(addressInput, "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37");

    const reviewButton = screen.getByText("Review & Send");

    expect(reviewButton).toBeDisabled();
    expect(screen.getAllByText("Amount is required.").length).toBeGreaterThan(0);
  });

  it("should show error for zero amount", async () => {
    const user = userEvent.setup();
    render(<RemittanceForm onSuccess={mockOnSuccess} />);

    const addressInput = screen.getByPlaceholderText("G... (Stellar public key)");
    await user.type(addressInput, "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37");

    const amountInput = screen.getByPlaceholderText("0.00");
    await user.type(amountInput, "0");

    const reviewButton = screen.getByText("Review & Send");

    expect(reviewButton).toBeDisabled();
    expect(screen.getAllByText("Amount must be greater than 0.").length).toBeGreaterThan(0);
  });

  it("should show warning for memo longer than 28 characters", async () => {
    const user = userEvent.setup();
    render(<RemittanceForm onSuccess={mockOnSuccess} />);

    await user.type(
      screen.getByPlaceholderText("G... (Stellar public key)"),
      "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
    );
    await user.type(screen.getByPlaceholderText("0.00"), "10");

    const memoInput = screen.getByPlaceholderText(
      "Add a note for the recipient (max 28 characters)",
    );
    // The textarea enforces maxLength=28, which userEvent.type respects, so set the
    // value directly to exercise the validateForm backstop for over-length memos.
    const longMemo = "This is a very long memo that exceeds the limit";
    fireEvent.change(memoInput, { target: { value: longMemo } });

    const reviewButton = screen.getByText("Review & Send");
    fireEvent.click(reviewButton);

    await waitFor(() => {
      expect(screen.getByText("Memo must be 28 characters or less")).toBeInTheDocument();
    });
  });

  it("should display character count for memo", async () => {
    const user = userEvent.setup();
    render(<RemittanceForm onSuccess={mockOnSuccess} />);

    const memoInput = screen.getByPlaceholderText(
      "Add a note for the recipient (max 28 characters)",
    );
    await user.type(memoInput, "Test memo");

    await waitFor(() => {
      expect(screen.getByText("9/28 characters")).toBeInTheDocument();
    });
  });

  it("should allow token selection", async () => {
    const user = userEvent.setup();
    render(<RemittanceForm onSuccess={mockOnSuccess} />);

    const tokenSelect = screen.getByDisplayValue("USDC");
    expect(tokenSelect).toBeInTheDocument();

    await user.selectOptions(tokenSelect, "EURC");
    expect((tokenSelect as HTMLSelectElement).value).toBe("EURC");
  });

  it("should disable form when mutation is pending", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useCreateRemittance } = require("../../hooks/useApi");
    useCreateRemittance.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: true,
    });

    render(<RemittanceForm onSuccess={mockOnSuccess} />);

    const addressInput = screen.getByPlaceholderText(
      "G... (Stellar public key)",
    ) as HTMLInputElement;
    const amountInput = screen.getByPlaceholderText("0.00") as HTMLInputElement;
    const reviewButton = screen.getByRole("button", { name: /processing/i }) as HTMLButtonElement;

    expect(addressInput.disabled).toBe(true);
    expect(amountInput.disabled).toBe(true);
    expect(reviewButton.disabled).toBe(true);
  });
});
