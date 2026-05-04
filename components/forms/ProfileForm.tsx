// @ts-nocheck
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileFormValues } from "@/lib/validators";
import { FormField } from "./FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

export function ProfileForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "Alice Johnson",
      email: "alice@example.com",
      bio: "Frontend developer and design enthusiast.",
      website: "https://alice.dev",
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Profile updated successfully!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your profile details and public information.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">AJ</AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm" type="button">Change Avatar</Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, GIF or PNG. Max 2MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Full Name" htmlFor="name" error={errors.name?.message} required>
              <Input id="name" placeholder="Your full name" {...register("name")} />
            </FormField>
            <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
            </FormField>
          </div>

          <FormField label="Bio" htmlFor="bio" error={errors.bio?.message} description="Brief description for your profile.">
            <Textarea id="bio" placeholder="Tell us a little about yourself..." {...register("bio")} />
          </FormField>

          <FormField label="Website" htmlFor="website" error={errors.website?.message}>
            <Input id="website" placeholder="https://yoursite.com" {...register("website")} />
          </FormField>

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
