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
	Input,
	Label,
	Separator,
	SocialButtons,
} from "@/components";
import { renderDocument } from "@/lib/render";
import { signUpScript } from "./script";
import type { SignUpPageOptions } from "./types";

export type { SignUpPageOptions };

interface SignUpFormProps {
	minPasswordLength: number;
}

function SignUpForm({ minPasswordLength }: SignUpFormProps) {
	return (
		<form id="signUpForm" className="grid gap-4">
			<div className="grid gap-2">
				<Label htmlFor="name">Name</Label>
				<Input
					id="name"
					type="text"
					name="name"
					placeholder="Enter your name"
					required
					autoComplete="name"
				/>
			</div>
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
					placeholder="Create a password"
					required
					autoComplete="new-password"
					minLength={minPasswordLength}
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="confirmPassword">Confirm Password</Label>
				<Input
					id="confirmPassword"
					type="password"
					name="confirmPassword"
					placeholder="Confirm your password"
					required
					autoComplete="new-password"
				/>
			</div>
			<Button type="submit" className="w-full" id="submitBtn">
				Create account
			</Button>
		</form>
	);
}

interface SignUpPageContentProps extends SignUpPageOptions {}

function SignUpPageContent({
	appName = "Better Auth",
	logo,
	apiBaseUrl = "",
	emailPassword = true,
	socialProviders = [],
	signInUrl = "./sign-in",
	minPasswordLength = 8,
}: SignUpPageContentProps) {
	const hasSocial = socialProviders.length > 0;
	const showDivider = hasSocial && emailPassword;

	return (
		<Card className="w-full max-w-md mx-auto">
			<CardHeader className="text-center">
				<div className="flex items-center justify-center gap-3 mb-2">
					{logo && <img src={logo} className="h-8 w-8" alt={appName} />}
					<span className="text-xl font-semibold">{appName}</span>
				</div>
				<CardTitle className="text-2xl">Create an account</CardTitle>
				<CardDescription>Get started with {appName}</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<Alert id="ba-error" variant="destructive" className="hidden">
					<AlertDescription id="ba-error-message" />
				</Alert>
				<Alert
					id="ba-success"
					className="hidden border-green-500/50 text-green-600"
				>
					<AlertDescription id="ba-success-message" />
				</Alert>

				{emailPassword && <SignUpForm minPasswordLength={minPasswordLength} />}

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
				Already have an account?{" "}
				<a href={signInUrl} className="text-primary hover:underline ml-1">
					Sign in
				</a>
			</CardFooter>
		</Card>
	);
}

export function getSignUpPage(options: SignUpPageOptions = {}): string {
	const {
		appName = "Better Auth",
		theme,
		apiBaseUrl = "",
		redirectTo = "/",
		requireEmailVerification = false,
	} = options;

	const content = renderToString(<SignUpPageContent {...options} />);
	const config = { apiBaseUrl, redirectTo, requireEmailVerification };

	return renderDocument({
		title: `Sign Up - ${appName}`,
		content,
		scripts: [
			`window.__BA_CONFIG__ = ${JSON.stringify(config)};`,
			signUpScript,
		],
		theme,
	});
}
