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
import { resetPasswordScript } from "./script";
import type { ResetPasswordPageOptions } from "./types";

export type { ResetPasswordPageOptions };

interface ResetPasswordFormProps {
	minPasswordLength: number;
}

function ResetPasswordForm({ minPasswordLength }: ResetPasswordFormProps) {
	return (
		<form id="resetPasswordForm" className="grid gap-4">
			<div className="grid gap-2">
				<Label htmlFor="newPassword">New Password</Label>
				<Input
					id="newPassword"
					type="password"
					name="newPassword"
					placeholder="Enter your new password"
					required
					autoComplete="new-password"
					minLength={minPasswordLength}
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="confirmPassword">Confirm New Password</Label>
				<Input
					id="confirmPassword"
					type="password"
					name="confirmPassword"
					placeholder="Confirm your new password"
					required
					autoComplete="new-password"
				/>
			</div>
			<Button type="submit" className="w-full" id="submitBtn">
				Reset password
			</Button>
		</form>
	);
}

interface ResetPasswordPageContentProps extends ResetPasswordPageOptions {}

function ResetPasswordPageContent({
	appName = "Better Auth",
	logo,
	signInUrl = "./sign-in",
	minPasswordLength = 8,
}: ResetPasswordPageContentProps) {
	return (
		<Card className="w-full max-w-md mx-auto">
			<CardHeader className="text-center">
				<div className="flex items-center justify-center gap-3 mb-2">
					{logo && <img src={logo} className="h-8 w-8" alt={appName} />}
					<span className="text-xl font-semibold">{appName}</span>
				</div>
				<CardTitle className="text-2xl">Reset password</CardTitle>
				<CardDescription>Enter your new password</CardDescription>
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

				<ResetPasswordForm minPasswordLength={minPasswordLength} />
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

export function getResetPasswordPage(
	options: ResetPasswordPageOptions = {},
): string {
	const {
		appName = "Better Auth",
		theme,
		apiBaseUrl = "",
		signInUrl = "./sign-in",
	} = options;

	const content = renderToString(<ResetPasswordPageContent {...options} />);
	const config = { apiBaseUrl, signInUrl };

	return renderDocument({
		title: `Reset Password - ${appName}`,
		content,
		scripts: [
			`window.__BA_CONFIG__ = ${JSON.stringify(config)};`,
			resetPasswordScript,
		],
		theme,
	});
}
