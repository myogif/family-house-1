import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Register from "./Register";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

function changeInput(element, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  nativeInputValueSetter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("Register component", () => {
  let container;
  let root;
  const mockPush = jest.fn();
  const mockRegister = jest.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    jest.clearAllMocks();
    useRouter.mockReturnValue({ push: mockPush });
    useSearchParams.mockReturnValue(mockSearchParams);
    useAuth.mockReturnValue({ register: mockRegister });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders register form elements properly", () => {
    act(() => {
      root.render(<Register />);
    });

    const nameInput = container.querySelector('[data-testid="register-name-input"]');
    const emailInput = container.querySelector('[data-testid="register-email-input"]');
    const passwordInput = container.querySelector('[data-testid="register-password-input"]');
    const submitBtn = container.querySelector('[data-testid="register-submit-button"]');
    const loginLink = container.querySelector('[data-testid="go-login-link"]');

    expect(nameInput).not.toBeNull();
    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();
    expect(submitBtn).not.toBeNull();
    expect(loginLink).not.toBeNull();
    expect(loginLink.getAttribute("href")).toBe("/login");
  });

  it("handles successful registration submission", async () => {
    mockRegister.mockResolvedValueOnce({ id: "user-2", email: "yogi@example.com" });

    act(() => {
      root.render(<Register />);
    });

    const nameInput = container.querySelector('[data-testid="register-name-input"]');
    const emailInput = container.querySelector('[data-testid="register-email-input"]');
    const passwordInput = container.querySelector('[data-testid="register-password-input"]');
    const form = container.querySelector("form");

    act(() => {
      changeInput(nameInput, "Yogi Fernanda");
      changeInput(emailInput, "yogi@example.com");
      changeInput(passwordInput, "secret123");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(mockRegister).toHaveBeenCalledWith("Yogi Fernanda", "yogi@example.com", "secret123");
    expect(toast.success).toHaveBeenCalledWith("Akun berhasil dibuat");
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("handles registration error and shows error toast", async () => {
    mockRegister.mockRejectedValueOnce(new Error("Email already registered"));

    act(() => {
      root.render(<Register />);
    });

    const nameInput = container.querySelector('[data-testid="register-name-input"]');
    const emailInput = container.querySelector('[data-testid="register-email-input"]');
    const passwordInput = container.querySelector('[data-testid="register-password-input"]');
    const form = container.querySelector("form");

    act(() => {
      changeInput(nameInput, "Yogi Fernanda");
      changeInput(emailInput, "existing@example.com");
      changeInput(passwordInput, "secret123");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(mockRegister).toHaveBeenCalledWith("Yogi Fernanda", "existing@example.com", "secret123");
    expect(toast.error).toHaveBeenCalledWith("Email already registered");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("redirects to safe custom path when valid redirect query param is provided", async () => {
    mockSearchParams.set("redirect", "/family/requests");
    mockRegister.mockResolvedValueOnce({ id: "user-3", email: "yogi@example.com" });

    act(() => {
      root.render(<Register />);
    });

    const nameInput = container.querySelector('[data-testid="register-name-input"]');
    const emailInput = container.querySelector('[data-testid="register-email-input"]');
    const passwordInput = container.querySelector('[data-testid="register-password-input"]');
    const form = container.querySelector("form");

    act(() => {
      changeInput(nameInput, "Yogi Fernanda");
      changeInput(emailInput, "yogi@example.com");
      changeInput(passwordInput, "secret123");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(mockPush).toHaveBeenCalledWith("/family/requests");
  });

  it("falls back to /dashboard when redirect query param is an unsafe external URL", async () => {
    mockSearchParams.set("redirect", "https://evil.example.com");
    mockRegister.mockResolvedValueOnce({ id: "user-4", email: "yogi@example.com" });

    act(() => {
      root.render(<Register />);
    });

    const nameInput = container.querySelector('[data-testid="register-name-input"]');
    const emailInput = container.querySelector('[data-testid="register-email-input"]');
    const passwordInput = container.querySelector('[data-testid="register-password-input"]');
    const form = container.querySelector("form");

    act(() => {
      changeInput(nameInput, "Yogi Fernanda");
      changeInput(emailInput, "yogi@example.com");
      changeInput(passwordInput, "secret123");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });
});
