"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import { useState } from "react";
import { FaEnvelope, FaPhoneAlt, FaArrowRight, FaSeedling } from "react-icons/fa";

interface ContactInfo {
  email: string;
  phone: string;
}

interface ServiceOption {
  value: string;
  label: string;
}

interface ContactFormProps {
  badge?: string;
  headline: string;
  headlineAccent: string;
  subheadline: string;
  contactInfo: ContactInfo;
  serviceOptions: ServiceOption[];
  ctaLabel: string;
  onSubmit?: (data: FormData) => void;
}

interface FormData {
  fullName: string;
  email: string;
  service: string;
  message: string;
}

const defaultProps: ContactFormProps = {
  badge: "Sustainable Futures",
  headline: "Grow Your",
  headlineAccent: "Green Business",
  subheadline:
    "We partner with founders and enterprises to design eco-forward strategies that drive measurable impact.",
  contactInfo: {
    email: "hello@watermelon.studio",
    phone: "+91 98765 43210",
  },
  serviceOptions: [
    { value: "strategy", label: "Sustainability Strategy" },
    { value: "audit", label: "Carbon Audit & Reporting" },
    { value: "supply", label: "Supply Chain Consulting" },
    { value: "branding", label: "Green Branding" },
    { value: "other", label: "Something Else" },
  ],
  ctaLabel: "Send My Request",
  onSubmit: (data) => console.log("Submitted:", data),
};

export default function ContactSolutionForm(props: ContactFormProps = defaultProps) {
  const {
    badge,
    headline,
    headlineAccent,
    subheadline,
    contactInfo,
    serviceOptions,
    ctaLabel,
    onSubmit,
  } = { ...defaultProps, ...props };

  const [form, setForm] = useState<FormData>({
    fullName: "",
    email: "",
    service: "",
    message: "",
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSubmit?.(form);
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="grid w-full max-w-5xl grid-cols-1 items-center gap-12 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          {badge && (
            <Badge>
              <FaSeedling className="text-primary-foreground" />
              {badge}
            </Badge>
          )}

          <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-foreground sm:text-5xl">
            {headline} <span className="block text-primary">{headlineAccent}</span>
          </h1>

          <p className="max-w-sm text-base leading-relaxed text-muted-foreground">{subheadline}</p>

          <Separator className="my-2 w-16 border-primary/40" />

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex items-center gap-3 rounded-2xl bg-muted p-1">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-card">
                <FaEnvelope className="text-sm text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium tracking-wider text-muted-foreground dark:text-foreground/80">
                  Email
                </p>
                <p className="text-md pr-2 font-semibold text-foreground">{contactInfo.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-muted p-1">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-card">
                <FaPhoneAlt className="text-sm text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium tracking-wider text-muted-foreground dark:text-foreground/80">
                  Phone
                </p>
                <p className="text-md pr-2 font-semibold text-foreground">{contactInfo.phone}</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-4xl bg-muted shadow-sm ring-0">
          <CardContent className="flex flex-col gap-5 p-8">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                Full Name
              </Label>
              <Input
                id="fullName"
                placeholder="Alex Rivera"
                value={form.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                className="rounded-xl border-0 bg-input text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,1)] focus-visible:ring-1 focus-visible:ring-primary dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Work Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="alex@company.com"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="rounded-xl border-0 bg-input text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,1)] focus-visible:ring-1 focus-visible:ring-primary dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <Label htmlFor="service" className="text-sm font-medium text-foreground">
                Area of Interest
              </Label>
              <Select
                value={form.service}
                onValueChange={(val) => handleChange("service", val ?? "")}
              >
                <SelectTrigger
                  id="service"
                  className="rounded-xl border-0 bg-input text-sm text-muted-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,1)] focus:ring-1 focus:ring-primary dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                >
                  <SelectValue placeholder="Choose a service…" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {serviceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="message" className="text-sm font-medium text-foreground">
                Message
              </Label>
              <Textarea
                id="message"
                placeholder="Tell us about your goals or challenges…"
                rows={4}
                value={form.message}
                onChange={(e) => handleChange("message", e.target.value)}
                className="resize-none rounded-xl border-0 bg-input text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,1)] focus-visible:ring-1 focus-visible:ring-primary dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
              />
            </div>

            <Button
              onClick={handleSubmit}
              className="group mt-1 w-full rounded-xl bg-primary py-5 text-sm font-semibold text-primary-foreground shadow-[inset_0_2px_0_0_rgba(255,255,255,0.5),inset_0_-2px_0_0_rgba(0,0,0,0.2)] transition-all hover:bg-primary/90 dark:shadow-[inset_0_2px_0_0_rgba(255,255,255,0.2)]"
            >
              {ctaLabel}
              <FaArrowRight className="ml-2 text-xs transition-transform group-hover:translate-x-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
