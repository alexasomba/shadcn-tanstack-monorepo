import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

export const Route = createFileRoute("/demo/form/address")({
  component: AddressForm,
});

function AddressForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      alert("Form submitted successfully!");
    } catch (err) {
      setError("Failed to submit form");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="demo-page demo-center">
      <section className="demo-panel w-full max-w-2xl">
        <div className="mb-6">
          <p className="island-kicker mb-2">Address Form</p>
          <h1 className="demo-title">Address Details</h1>
          <p className="demo-muted mt-2">
            A validated address form with complete accessibility and error recovery.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error ? (
            <div role="alert" className="text-xs text-red-500 font-medium">
              {error}
            </div>
          ) : null}

          <div>
            <Label htmlFor="full-name" className="mb-2 text-sm font-semibold">
              Full Name
            </Label>
            <Input
              id="full-name"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              disabled={isSubmitting}
              placeholder="John Doe"
            />
          </div>

          <div>
            <Label htmlFor="email" className="mb-2 text-sm font-semibold">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isSubmitting}
              placeholder="john@example.com"
            />
          </div>

          <div>
            <Label htmlFor="street-address" className="mb-2 text-sm font-semibold">
              Street Address
            </Label>
            <Textarea
              id="street-address"
              name="address"
              required
              minLength={5}
              disabled={isSubmitting}
              placeholder="123 Main St"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="demo-button">
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
