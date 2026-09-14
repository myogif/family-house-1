import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Login from "./Login";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
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

describe("Login component", () => {
  let container;
  let root;
  const mockPush = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    jest.clearAllMocks();
    useRouter.mockReturnValue({ push: mockPush });
    useAuth.mockReturnValue({ login: mockLogin });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders login form elements properly", () => {
    act(() => {
      root.render(<Login />);
    });

    const emailInput = container.querySelector('[data-testid="login-email-input"]');
    const passwordInput = container.querySelector('[data-testid="login-password-input"]');
    const submitBtn = container.querySelector('[data-testid="login-submit-button"]');
    const registerLink = container.querySelector('[data-testid="go-register-link"]');

    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();
    expect(submitBtn).not.toBeNull();
    expect(registerLink).not.toBeNull();
    expect(registerLink.getAttribute("href")).toBe("/register");
  });

  it("handles successful login submission", async () => {
    mockLogin.mockResolvedValueOnce({ id: "user-1", email: "test@example.com" });

    act(() => {
      root.render(<Login />);
    });

    const emailInput = container.querySelector('[data-testid="login-email-input"]');
    const passwordInput = container.querySelector('[data-testid="login-password-input"]');
    const form = container.querySelector("form");

    act(() => {
      changeInput(emailInput, "test@example.com");
      changeInput(passwordInput, "password123");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
    expect(toast.success).toHaveBeenCalledWith("Selamat datang kembali!");
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("handles login error and shows error toast", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Invalid login credentials"));

    act(() => {
      root.render(<Login />);
    });

    const emailInput = container.querySelector('[data-testid="login-email-input"]');
    const passwordInput = container.querySelector('[data-testid="login-password-input"]');
    const form = container.querySelector("form");

    act(() => {
      changeInput(emailInput, "wrong@example.com");
      changeInput(passwordInput, "wrongpass");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(mockLogin).toHaveBeenCalledWith("wrong@example.com", "wrongpass");
    expect(toast.error).toHaveBeenCalledWith("Invalid login credentials");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
