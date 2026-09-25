"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { registerChurch } from "@/lib/AuthSlice";
import { useDispatch, useSelector } from "react-redux";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  fullSignupSchema,
  STEP_FIELDS,
  type SignupFormValues,
} from "@/schemas/ChurchSignupSchema";
import { ChurchDetailsStep } from "./ChurchDetailsStep";
import { OwnerAccountStep } from "./OwnerAccountStep";
import { ReviewStep } from "./ReviewStep";
import { type AppDispatch, type RootState } from "@/store/store";

const STEPS = [
  {
    title: "Your church",
    description: "Tell us about the church you're setting up",
  },
  {
    title: "Your account",
    description: "Create the account you'll use to sign in",
  },
  { title: "Review", description: "Check everything before you go live" },
];

export function ChurchSignupWizard() {
  const [step, setStep] = useState(0);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isLoading } = useSelector((state: RootState) => state.auth);
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(fullSignupSchema),
    mode: "onTouched",
    defaultValues: {
      churchName: "",
      churchPhone: "",
      churchEmail: "",
      churchAddress: "",
      ownerName: "",
      ownerEmail: "",
      password: "",
      confirmPassword: "",
    },
  });
  const isLastStep = step === STEPS.length - 1;
  const goNext = async () => {
    if (await form.trigger(STEP_FIELDS[step]))
      setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((current) => Math.max(current - 1, 0));
  const onSubmit = async (values: SignupFormValues) => {
    const { confirmPassword: _confirmPassword, ...payload } = values;
    const result = await dispatch(registerChurch(payload));
    if (registerChurch.fulfilled.match(result)) {
      toast.success("Church account created");
      navigate("/login-page", { state: { slug: result.payload.church?.slug } });
      return;
    }
    if (registerChurch.rejected.match(result))
      toast.error(
        result.payload ??
          "We couldn't reach the server. Check your connection and try again.",
      );
  };
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
        <Progress value={((step + 1) / STEPS.length) * 100} />
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {STEPS[step].title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {STEPS[step].description}
          </p>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <div className="bg-card rounded-lg border p-6">
            {step === 0 && <ChurchDetailsStep form={form} />}
            {step === 1 && <OwnerAccountStep form={form} />}
            {step === 2 && <ReviewStep form={form} values={form.getValues()} />}
          </div>
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={step === 0 || isLoading}
            >
              Back
            </Button>
            {isLastStep ? (
              <Button
                type="button"
                disabled={isLoading}
                onClick={form.handleSubmit(onSubmit)}
              >
                {isLoading ? "Creating account…" : "Create church account"}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                Continue
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
