import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import React, { useState } from "react";
import {
  IoPerson,
  IoMail,
  IoBusiness,
  IoCalendar,
  IoPeople,
  IoArrowForward,
} from "react-icons/io5";

export interface ConsultationFormData {
  fullName: string;
  email: string;
  company: string;
  projectType: string;
  budget: string;
  timeline: string;
  teamSize: string;
  message: string;
}

export interface ProjectInquirySectionProps {
  onSubmit?: (data: ConsultationFormData) => void;
}

const defaultOnSubmit = (data: ConsultationFormData) => {
  console.log("Inquiry submitted:", data);
};

export default function ProjectInquirySection({
  onSubmit = defaultOnSubmit,
}: ProjectInquirySectionProps) {
  const [formData, setFormData] = useState<ConsultationFormData>({
    fullName: "",
    email: "",
    company: "",
    projectType: "",
    budget: "",
    timeline: "",
    teamSize: "",
    message: "",
  });

  const updateField = (field: keyof ConsultationFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <section className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Start Your Project
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Tell us about your vision and we will craft a tailored solution for your business.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-0.5">
                  <Label htmlFor="fullName" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <div className="relative rounded-md bg-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)]">
                    <IoPerson className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder="Alex Morgan"
                      value={formData.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      className="rounded-md border-0 pl-10 focus-visible:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <div className="relative rounded-md bg-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)]">
                    <IoMail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="alex@company.com"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="rounded-md border-0 pl-10 focus-visible:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <Label htmlFor="company" className="text-sm font-medium">
                    Company
                  </Label>
                  <div className="relative rounded-md bg-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)]">
                    <IoBusiness className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="company"
                      placeholder="Acme Inc."
                      value={formData.company}
                      onChange={(e) => updateField("company", e.target.value)}
                      className="rounded-md border-0 pl-10 focus-visible:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <Label htmlFor="projectType" className="text-sm font-medium">
                    Project Type
                  </Label>
                  <Select
                    value={formData.projectType}
                    onValueChange={(value) => updateField("projectType", value ?? "")}
                  >
                    <SelectTrigger
                      id="projectType"
                      className="rounded-md border-none bg-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)] dark:bg-input dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)]"
                    >
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent className="bg-background/50 backdrop-blur-md">
                      <SelectItem value="web">Web Application</SelectItem>
                      <SelectItem value="mobile">Mobile App</SelectItem>
                      <SelectItem value="design">Brand Design</SelectItem>
                      <SelectItem value="consulting">Strategy Consulting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <Label htmlFor="budget" className="text-sm font-medium">
                    Budget Range
                  </Label>
                  <Select
                    value={formData.budget}
                    onValueChange={(value) => updateField("budget", value ?? "")}
                  >
                    <SelectTrigger
                      id="budget"
                      className="rounded-md border-none bg-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)] dark:bg-input dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)]"
                    >
                      <SelectValue placeholder="Select budget" />
                    </SelectTrigger>
                    <SelectContent className="bg-background/50 backdrop-blur-md">
                      <SelectItem value="10k">$10k – $25k</SelectItem>
                      <SelectItem value="25k">$25k – $50k</SelectItem>
                      <SelectItem value="50k">$50k – $100k</SelectItem>
                      <SelectItem value="100k">$100k+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <Label htmlFor="timeline" className="text-sm font-medium">
                    Expected Start Date
                  </Label>
                  <div className="relative">
                    <IoCalendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="timeline"
                      type="date"
                      value={formData.timeline}
                      onChange={(e) => updateField("timeline", e.target.value)}
                      className="rounded-md border-none bg-muted pl-10 shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)] focus-visible:ring-primary/20 dark:bg-input dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)]"
                    />
                  </div>
                </div>

                <div className="space-y-0.5 sm:col-span-2">
                  <Label htmlFor="teamSize" className="text-sm font-medium">
                    Team Size Required
                  </Label>
                  <div className="relative">
                    <IoPeople className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Select
                      value={formData.teamSize}
                      onValueChange={(value) => updateField("teamSize", value ?? "")}
                    >
                      <SelectTrigger
                        id="teamSize"
                        className="rounded-md border-none bg-muted pl-10 shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)] dark:bg-input dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)]"
                      >
                        <SelectValue placeholder="Select team size" />
                      </SelectTrigger>
                      <SelectContent className="bg-background/50 backdrop-blur-md">
                        <SelectItem value="solo">Solo Contributor</SelectItem>
                        <SelectItem value="small">Small Team (2–4)</SelectItem>
                        <SelectItem value="medium">Medium Team (5–8)</SelectItem>
                        <SelectItem value="large">Large Team (9+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-0.5 sm:col-span-2">
                  <Label htmlFor="message" className="text-sm font-medium">
                    Project Details
                  </Label>
                  <Textarea
                    id="message"
                    rows={5}
                    placeholder="Describe your goals, challenges, and any specific requirements..."
                    value={formData.message}
                    onChange={(e) => updateField("message", e.target.value)}
                    className="min-h-32 resize-none rounded-md border-none bg-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)] focus-visible:ring-primary/20 dark:bg-input dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="gap-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),inset_0_-1px_0_0_rgba(0,0,0,0.2)]"
              >
                Submit Inquiry
                <IoArrowForward className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-8 space-y-6">
              <Card className="border-none bg-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0px_0px_0px_0px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.08)]">
                <CardHeader>
                  <CardTitle>Why partner with us?</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {[
                      "Dedicated project managers",
                      "Transparent weekly updates",
                      "Post-launch support included",
                      "Source code handover guaranteed",
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-3 text-muted-foreground">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-none bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),inset_0_-1px_0_0_rgba(0,0,0,0.3)] ring-0">
                <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-primary-foreground/10" />
                <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-primary-foreground/10" />
                <CardHeader>
                  <CardTitle className="text-primary-foreground">Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">Under 4 hours</p>
                  <p className="mt-4 text-sm opacity-80">
                    Our team reviews every inquiry personally to ensure we understand your needs
                    before reaching out.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
