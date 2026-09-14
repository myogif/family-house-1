import { errorMessage, apiError } from "./errors";

describe("errors utility", () => {
  it("returns string directly if error is a string", () => {
    expect(errorMessage("Email salah")).toBe("Email salah");
  });

  it("extracts message from standard Error instance", () => {
    expect(errorMessage(new Error("Network timeout"))).toBe("Network timeout");
  });

  it("extracts message from Supabase error object", () => {
    expect(errorMessage({ message: "Invalid login credentials", code: "invalid_credentials" })).toBe(
      "Invalid login credentials"
    );
  });

  it("extracts detail string from legacy API error format", () => {
    const legacyErr = {
      response: {
        data: {
          detail: "Kredensial tidak valid",
        },
      },
    };
    expect(errorMessage(legacyErr)).toBe("Kredensial tidak valid");
  });

  it("extracts detail array from legacy FastAPI validation error or string list", () => {
    const legacyErr = {
      response: {
        data: {
          detail: ["Custom string error", { msg: "Email is required" }, null, { other: "field" }, { message: "Password too short" }],
        },
      },
    };
    expect(errorMessage(legacyErr)).toBe("Custom string error Email is required Password too short");
  });

  it("extracts error_description or response.data.message when standard message is missing", () => {
    expect(errorMessage({ error_description: "OAuth token expired" })).toBe("OAuth token expired");
    expect(errorMessage({ response: { data: { message: "Server error" } } })).toBe("Server error");
  });

  it("extracts detail directly from error.detail", () => {
    expect(errorMessage({ detail: "Direct detail error" })).toBe("Direct detail error");
  });

  it("returns default message when input is null, undefined, or empty object", () => {
    expect(errorMessage(null)).toBe("Terjadi kesalahan");
    expect(errorMessage(undefined)).toBe("Terjadi kesalahan");
    expect(errorMessage({})).toBe("Terjadi kesalahan");
  });

  it("exports apiError as an alias for errorMessage for backwards compatibility", () => {
    expect(apiError).toBe(errorMessage);
    expect(apiError(new Error("Gagal masuk"))).toBe("Gagal masuk");
  });
});
