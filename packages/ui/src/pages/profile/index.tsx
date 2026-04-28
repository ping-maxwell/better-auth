import { renderToString } from "react-dom/server";
import {
	Alert,
	AlertDescription,
	Button,
	Card,
	CardContent,
	Input,
	Label,
	Separator,
} from "@/components";
import { renderDocument } from "@/lib/render";
import { profileScript } from "./script";
import type { ProfilePageOptions } from "./types";

export type { ProfilePageOptions };

interface ProfilePageContentProps extends ProfilePageOptions {}

function ProfilePageContent({
	appName = "Better Auth",
	logo,
	editableName = true,
	changePassword = true,
}: ProfilePageContentProps) {
	return (
		<Card className="w-full max-w-md mx-auto">
			<CardContent className="pt-6">
				<div className="flex items-center justify-center gap-3 mb-6">
					{logo && <img src={logo} className="h-8 w-8" alt={appName} />}
					<span className="text-xl font-semibold">{appName}</span>
				</div>

				{/* Loading state */}
				<div id="loading" className="text-center py-8">
					<div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
						<svg
							className="w-8 h-8 animate-spin text-muted-foreground"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
							<path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
						</svg>
					</div>
					<p className="text-sm text-muted-foreground">Loading profile...</p>
				</div>

				{/* Content (hidden until loaded) */}
				<div id="content" className="hidden">
					<div
						id="avatar"
						className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-muted-foreground overflow-hidden"
					/>
					<h1 id="nameDisplay" className="text-xl font-semibold text-center">
						User
					</h1>
					<p
						id="emailDisplay"
						className="text-sm text-muted-foreground text-center mt-1"
					/>

					<Alert id="ba-error" variant="destructive" className="hidden mt-4">
						<AlertDescription id="ba-error-message" />
					</Alert>

					{editableName && (
						<>
							<Separator className="my-6" />
							<div className="space-y-4">
								<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Profile
								</h2>
								<form id="nameForm" className="grid gap-4">
									<div className="grid gap-2">
										<Label htmlFor="name">Name</Label>
										<Input
											id="name"
											type="text"
											name="name"
											placeholder="Your name"
											required
											autoComplete="name"
										/>
									</div>
									<Button type="submit" className="w-full">
										Save changes
									</Button>
								</form>
							</div>
						</>
					)}

					{changePassword && (
						<>
							<Separator className="my-6" />
							<div className="space-y-4">
								<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Change Password
								</h2>
								<form id="passwordForm" className="grid gap-4">
									<div className="grid gap-2">
										<Label htmlFor="currentPassword">Current Password</Label>
										<Input
											id="currentPassword"
											type="password"
											name="currentPassword"
											placeholder="Enter current password"
											required
											autoComplete="current-password"
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="newPassword">New Password</Label>
										<Input
											id="newPassword"
											type="password"
											name="newPassword"
											placeholder="Enter new password"
											required
											autoComplete="new-password"
											minLength={8}
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="confirmNewPassword">
											Confirm New Password
										</Label>
										<Input
											id="confirmNewPassword"
											type="password"
											name="confirmNewPassword"
											placeholder="Confirm new password"
											required
											autoComplete="new-password"
										/>
									</div>
									<Button type="submit" className="w-full">
										Change password
									</Button>
								</form>
							</div>
						</>
					)}

					<Separator className="my-6" />
					<Button
						type="button"
						variant="outline"
						className="w-full"
						id="signOutBtn"
					>
						Sign out
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

export function getProfilePage(options: ProfilePageOptions = {}): string {
	const {
		appName = "Better Auth",
		theme,
		apiBaseUrl = "",
		signInUrl = "./sign-in",
	} = options;

	const content = renderToString(<ProfilePageContent {...options} />);
	const config = { apiBaseUrl, signInUrl };

	return renderDocument({
		title: `Profile - ${appName}`,
		content,
		scripts: [
			`window.__BA_CONFIG__ = ${JSON.stringify(config)};`,
			profileScript,
		],
		theme,
	});
}
