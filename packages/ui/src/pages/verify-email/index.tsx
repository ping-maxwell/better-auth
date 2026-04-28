import { renderToString } from "react-dom/server";
import { Button, Card, CardContent } from "@/components";
import { renderDocument } from "@/lib/render";
import { verifyEmailScript } from "./script";
import type { VerifyEmailPageOptions } from "./types";

export type { VerifyEmailPageOptions };

interface VerifyEmailPageContentProps extends VerifyEmailPageOptions {}

function VerifyEmailPageContent({
	appName = "Better Auth",
	logo,
}: VerifyEmailPageContentProps) {
	return (
		<Card className="w-full max-w-md mx-auto">
			<CardContent className="pt-6">
				<div className="flex items-center justify-center gap-3 mb-6">
					{logo && <img src={logo} className="h-8 w-8" alt={appName} />}
					<span className="text-xl font-semibold">{appName}</span>
				</div>

				<div className="text-center">
					<div
						id="statusIcon"
						className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-primary/10 text-primary"
					>
						<svg
							className="w-8 h-8 animate-spin"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
							<path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
						</svg>
					</div>
					<h1
						id="statusTitle"
						className="text-2xl font-semibold tracking-tight"
					>
						Verifying Email
					</h1>
					<p id="statusMessage" className="text-sm text-muted-foreground mt-2">
						Please wait while we verify your email address...
					</p>
					<Button id="actionBtn" className="hidden mt-6 w-full">
						Continue
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

const statusScript = `
const icons = {
  loading: '<svg class="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>',
  success: '<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  error: '<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
};

function setStatus(type, title, message) {
  const iconEl = document.getElementById('statusIcon');
  const titleEl = document.getElementById('statusTitle');
  const messageEl = document.getElementById('statusMessage');
  
  iconEl.innerHTML = icons[type];
  titleEl.textContent = title;
  messageEl.textContent = message;
  
  iconEl.className = 'w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center';
  if (type === 'loading') {
    iconEl.className += ' bg-primary/10 text-primary';
  } else if (type === 'success') {
    iconEl.className += ' bg-green-500/10 text-green-500';
  } else {
    iconEl.className += ' bg-destructive/10 text-destructive';
  }
}
`;

export function getVerifyEmailPage(
	options: VerifyEmailPageOptions = {},
): string {
	const {
		appName = "Better Auth",
		theme,
		apiBaseUrl = "",
		signInUrl = "./sign-in",
		redirectTo = "/",
	} = options;

	const content = renderToString(<VerifyEmailPageContent {...options} />);
	const config = { apiBaseUrl, signInUrl, redirectTo };

	return renderDocument({
		title: `Verify Email - ${appName}`,
		content,
		scripts: [
			`window.__BA_CONFIG__ = ${JSON.stringify(config)};`,
			statusScript,
			verifyEmailScript,
		],
		theme,
	});
}
