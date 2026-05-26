import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthUIProvider } from "../provider";
import { Auth } from "./auth";
import { SignIn } from "./sign-in";

afterEach(cleanup);

function createMockClient(overrides?: Record<string, unknown>) {
	return {
		signIn: {
			email: vi.fn().mockResolvedValue({ data: { user: { id: "1" } } }),
			social: vi.fn().mockResolvedValue({ data: { redirect: true, url: "/" } }),
			username: vi.fn().mockResolvedValue({ data: { user: { id: "1" } } }),
			passkey: vi.fn().mockResolvedValue({ data: { user: { id: "1" } } }),
			magicLink: vi.fn().mockResolvedValue({ data: { status: true } }),
		},
		emailOtp: {
			sendVerificationOtp: vi
				.fn()
				.mockResolvedValue({ data: { status: true } }),
		},
		twoFactor: {
			verifyTotp: vi.fn().mockResolvedValue({ data: { user: { id: "1" } } }),
			verifyOtp: vi.fn().mockResolvedValue({ data: { user: { id: "1" } } }),
			verifyBackupCode: vi
				.fn()
				.mockResolvedValue({ data: { user: { id: "1" } } }),
			sendOtp: vi.fn().mockResolvedValue({ data: { status: true } }),
		},
		...overrides,
	} as unknown as Record<string, unknown>;
}

function renderWithProvider(
	ui: React.ReactElement,
	clientOverrides?: Record<string, unknown>,
) {
	const client = createMockClient(clientOverrides);
	return {
		...render(<AuthUIProvider client={client}>{ui}</AuthUIProvider>),
		client,
	};
}

describe("SignIn", () => {
	it("renders email and password fields by default", () => {
		renderWithProvider(<SignIn />);
		expect(screen.getByLabelText("Email")).toBeDefined();
		expect(screen.getByLabelText("Password")).toBeDefined();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeDefined();
	});

	it("renders username field when username prop is true", () => {
		renderWithProvider(<SignIn username />);
		expect(screen.getByLabelText("Username")).toBeDefined();
	});

	it("renders OAuth buttons when oauth prop is provided", () => {
		renderWithProvider(<SignIn oauth={["github", "google"]} />);
		expect(screen.getByText("GitHub")).toBeDefined();
		expect(screen.getByText("Google")).toBeDefined();
	});

	it("renders passkey button when passkey prop is true", () => {
		renderWithProvider(<SignIn passkey />);
		expect(screen.getByText("Sign in with passkey")).toBeDefined();
	});

	it("renders magic link button when magicLink prop is true", () => {
		renderWithProvider(<SignIn magicLink />);
		expect(screen.getByText("Send magic link")).toBeDefined();
	});

	it("renders sign-up link", () => {
		renderWithProvider(<SignIn />);
		const link = screen.getByRole("link", { name: "Sign up" });
		expect(link).toBeDefined();
		expect(link.getAttribute("href")).toBe("/sign-up");
	});

	it("renders forgot password link", () => {
		renderWithProvider(<SignIn />);
		const link = screen.getByText("Forgot password?");
		expect(link).toBeDefined();
	});

	it("shows divider when both email/password and OAuth are enabled", () => {
		renderWithProvider(<SignIn oauth={["github"]} />);
		expect(screen.getByText("Or continue with")).toBeDefined();
	});

	it("validates empty form on submit", async () => {
		renderWithProvider(<SignIn />);
		const form = screen.getByRole("button", { name: "Sign in" });
		fireEvent.click(form);
		await waitFor(() => {
			expect(screen.getByText("Email is required.")).toBeDefined();
		});
	});

	it("calls client.signIn.email on valid submit", async () => {
		const { client } = renderWithProvider(<SignIn />);
		const signIn = client.signIn as Record<string, ReturnType<typeof vi.fn>>;

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "test@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "password123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

		await waitFor(() => {
			expect(signIn.email).toHaveBeenCalledWith(
				expect.objectContaining({
					email: "test@example.com",
					password: "password123",
					rememberMe: true,
				}),
			);
		});
	});

	it("calls client.signIn.username when username mode is active", async () => {
		const { client } = renderWithProvider(<SignIn username />);
		const signIn = client.signIn as Record<string, ReturnType<typeof vi.fn>>;

		fireEvent.change(screen.getByLabelText("Username"), {
			target: { value: "testuser" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "password123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

		await waitFor(() => {
			expect(signIn.username).toHaveBeenCalledWith(
				expect.objectContaining({
					username: "testuser",
					password: "password123",
				}),
			);
		});
	});

	it("calls onSuccess when sign-in succeeds", async () => {
		const onSuccess = vi.fn();
		renderWithProvider(<SignIn onSuccess={onSuccess} />);

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "test@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "password123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

		await waitFor(() => {
			expect(onSuccess).toHaveBeenCalledWith({ user: { id: "1" } });
		});
	});

	it("calls onError when sign-in fails", async () => {
		const onError = vi.fn();
		const client = createMockClient({
			signIn: {
				email: vi.fn().mockResolvedValue({
					error: {
						message: "Invalid credentials",
						code: "INVALID_CREDENTIALS",
					},
				}),
			},
		});

		render(
			<AuthUIProvider client={client}>
				<SignIn onError={onError} />
			</AuthUIProvider>,
		);

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "test@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "wrong" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

		await waitFor(() => {
			expect(onError).toHaveBeenCalledWith(
				expect.objectContaining({ message: "Invalid credentials" }),
			);
		});
	});

	it("shows two-factor step when server returns twoFactorRedirect", async () => {
		const client = createMockClient({
			signIn: {
				email: vi.fn().mockResolvedValue({
					data: { twoFactorRedirect: true, twoFactorMethods: ["totp"] },
				}),
			},
		});

		render(
			<AuthUIProvider client={client}>
				<SignIn twoFactor />
			</AuthUIProvider>,
		);

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "test@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "password123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

		await waitFor(() => {
			expect(screen.getByText("Two-factor authentication")).toBeDefined();
			expect(screen.getByLabelText("Authentication code")).toBeDefined();
		});
	});
});

describe("Auth router", () => {
	it("renders SignIn for /sign-in path", () => {
		renderWithProvider(<Auth path="/sign-in" />);
		expect(screen.getByRole("heading", { name: "Sign in" })).toBeDefined();
	});

	it("renders SignUp for /sign-up path", () => {
		renderWithProvider(<Auth path="/sign-up" />);
		expect(
			screen.getByRole("heading", { name: "Create account" }),
		).toBeDefined();
	});

	it("renders ForgotPassword for /forgot-password path", () => {
		renderWithProvider(<Auth path="/forgot-password" />);
		expect(
			screen.getByRole("heading", { name: "Forgot password" }),
		).toBeDefined();
	});

	it("renders SignIn as fallback for unknown paths", () => {
		renderWithProvider(<Auth path="/unknown" />);
		expect(screen.getByRole("heading", { name: "Sign in" })).toBeDefined();
	});

	it("renders SignUp as fallback when configured", () => {
		renderWithProvider(<Auth path="/unknown" fallback="sign-up" />);
		expect(
			screen.getByRole("heading", { name: "Create account" }),
		).toBeDefined();
	});

	it("forwards signIn props to SignIn component", () => {
		renderWithProvider(<Auth path="/sign-in" signIn={{ oauth: ["github"] }} />);
		expect(screen.getByText("GitHub")).toBeDefined();
	});

	it("strips trailing slashes for matching", () => {
		renderWithProvider(<Auth path="/sign-up/" />);
		expect(
			screen.getByRole("heading", { name: "Create account" }),
		).toBeDefined();
	});
});
