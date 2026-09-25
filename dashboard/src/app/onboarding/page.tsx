import { ChurchSignupWizard } from "./ChurchSignup";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <ChurchSignupWizard />
      </div>
    </div>
  );
}
