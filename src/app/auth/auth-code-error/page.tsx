import { SignInButton } from "@/components/sign-in-button";
import { AlertIcon } from "@/components/ui/icons";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertIcon size={24} />
        </div>
        <h1 className="text-lg font-semibold">Sign in couldn&apos;t be completed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The sign in link was invalid or expired. Please try again.
        </p>
        <SignInButton className="focus-ring mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
          Back to sign in
        </SignInButton>
      </div>
    </main>
  );
}
