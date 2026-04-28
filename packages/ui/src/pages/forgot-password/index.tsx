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
} from "@/components";
import { renderDocument } from "@/lib/render";
import { forgotPasswordScript } from "./script";
import type { ForgotPasswordPageOptions } from "./types";

export type { ForgotPasswordPageOptions };

function ForgotPasswordForm() {
	return (
		<form id="forgotPasswordForm" className="grid gap-4">
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
			<Button type="submit" className="w-full" id="submitBtn">
				Send reset link
			</Button>
		</form>
	);
}

interface ForgotPasswordPageContentProps extends ForgotPasswordPageOptions {}

function ForgotPasswordPageContent({
	appName = "Better Auth",
	logo,
	signInUrl = "./sign-in",
}: ForgotPasswordPageContentProps) {
	return (
		<Card className="w-full max-w-md mx-auto">
			<CardHeader className="text-center">
				<div className="flex items-center justify-center gap-3 mb-2">
					{logo && <img src={logo} className="h-8 w-8" alt={appName} />}
					<span className="text-xl font-semibold">{appName}</span>
				</div>
				<CardTitle className="text-2xl">Forgot password?</CardTitle>
				<CardDescription>
					Enter your email and we'll send you a reset link
				</CardDescription>
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

				<ForgotPasswordForm />
			</CardContent>
			<CardFooter className="justify-center text-sm text-muted-foreground">
				Remember your password?{" "}
				<a href={signInUrl} className="text-primary hover:underline ml-1">
					Sign in
				</a>
			</CardFooter>
		</Card>
	);
}

export function getForgotPasswordPage(
	options: ForgotPasswordPageOptions = {},
): string {
	const { appName = "Better Auth", theme, apiBaseUrl = "" } = options;

	const content = renderToString(<ForgotPasswordPageContent {...options} />);
	const config = { apiBaseUrl };

	return renderDocument({
		title: `Forgot Password - ${appName}`,
		content,
		scripts: [
			`window.__BA_CONFIG__ = ${JSON.stringify(config)};`,
			forgotPasswordScript,
		],
		theme,
	});
}
