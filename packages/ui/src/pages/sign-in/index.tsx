import { renderToString } from "react-dom/server";
import {
	Alert,
	AlertDescription,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Checkbox,
	Input,
	Label,
	Separator,
	SocialButtons,
} from "@/components";
import { renderDocument } from "@/lib/render";
import { signInScript } from "./script";
import type { SignInPageOptions } from "./types";

export type { SignInPageOptions };

interface SignInFormProps {
	rememberMe: boolean;
	forgotPasswordUrl: string;
}

function SignInForm({ rememberMe, forgotPasswordUrl }: SignInFormProps) {
	return (
		<form id="signInForm" className="grid gap-4">
			<div className="grid gap-2">
				<Label htmlFor="email">Email</Label>
				<Input
					id="email"
					type="email"
					name="email"
					placeholder="Enter your email address"
					required
					autoComplete="email"
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="password">Password</Label>
				<Input
					id="password"
					type="password"
					name="password"
					placeholder="Enter your password"
					required
					autoComplete="current-password"
				/>
				<div className="flex justify-end">
					<a
						href={forgotPasswordUrl}
						className="text-sm text-muted-foreground hover:text-primary transition-colors"
					>
						Forgot password?
					</a>
				</div>
			</div>
			{rememberMe && (
				<div className="flex items-center space-x-2">
					<Checkbox id="rememberMe" name="rememberMe" />
					<Label htmlFor="rememberMe" className="text-sm font-normal">
						Remember me
					</Label>
				</div>
			)}
			<Button type="submit" className="w-full" id="submitBtn">
				Continue
			</Button>
		</form>
	);
}

interface SignInPageContentProps extends SignInPageOptions {}

function SignInPageContent({
	appName = "Better Auth",
	logo,
	apiBaseUrl = "",
	emailPassword = true,
	passkey = false,
	rememberMe = true,
	socialProviders = [],
	signUpUrl = "./sign-up",
	forgotPasswordUrl = "./forgot-password",
}: SignInPageContentProps) {
	const hasSocial = socialProviders.length > 0;
	const showDivider = hasSocial && emailPassword;

	return (
		<Card className="w-full max-w-md mx-auto">
			<CardHeader className="text-center">
				<div className="flex items-center justify-center gap-3 mb-2">
					{logo && <img src={logo} className="h-8 w-8" alt={appName} />}
					<span className="text-xl font-semibold">{appName}</span>
				</div>
				<CardTitle className="text-2xl">Sign in to your account</CardTitle>
				<CardDescription>
					Welcome back! Please sign in to continue.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<Alert id="ba-error" variant="destructive" className="hidden">
					<AlertDescription id="ba-error-message" />
				</Alert>

				{emailPassword && (
					<SignInForm
						rememberMe={rememberMe}
						forgotPasswordUrl={forgotPasswordUrl}
					/>
				)}

				{passkey && (
					<Button
						type="button"
						variant="outline"
						className="w-full"
						data-action="passkey"
					>
						<svg
							className="size-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<circle cx="12" cy="10" r="3" />
							<path d="M12 2a8 8 0 0 0-8 8c0 1.892.402 3.13 1.5 4.5L12 22l6.5-7.5c1.098-1.37 1.5-2.608 1.5-4.5a8 8 0 0 0-8-8z" />
						</svg>
						Sign in with Passkey
					</Button>
				)}

				{showDivider && (
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<Separator className="w-full" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-card px-2 text-muted-foreground">or</span>
						</div>
					</div>
				)}

				{hasSocial && (
					<SocialButtons
						providers={socialProviders}
						apiBaseUrl={apiBaseUrl}
						layout="grid"
					/>
				)}
			</CardContent>
			<CardFooter className="justify-center text-sm text-muted-foreground">
				Don't have an account?{" "}
				<a href={signUpUrl} className="text-primary hover:underline ml-1">
					Sign up
				</a>
			</CardFooter>
		</Card>
	);
}

export function getSignInPage(options: SignInPageOptions = {}): string {
	const {
		appName = "Better Auth",
		theme,
		apiBaseUrl = "",
		redirectTo = "/",
	} = options;

	const content = renderToString(<SignInPageContent {...options} />);
	const config = { apiBaseUrl, redirectTo };

	return renderDocument({
		title: `Sign In - ${appName}`,
		content,
		scripts: [
			`window.__BA_CONFIG__ = ${JSON.stringify(config)};`,
			signInScript,
		],
		theme,
	});
}
