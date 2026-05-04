// @ts-nocheck
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema, type SettingsFormValues } from "@/lib/validators";
import { FormField } from "./FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function SettingsForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
  });

  const onSubmit = async (_data: SettingsFormValues) => {
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Password changed successfully!");
    reset();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <FormField label="Current Password" htmlFor="currentPassword" error={errors.currentPassword?.message} required>
              <Input id="currentPassword" type="password" placeholder="••••••••" {...register("currentPassword")} />
            </FormField>
            <FormField label="New Password" htmlFor="newPassword" error={errors.newPassword?.message} required>
              <Input id="newPassword" type="password" placeholder="••••••••" {...register("newPassword")} />
            </FormField>
            <FormField label="Confirm Password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
              <Input id="confirmPassword" type="password" placeholder="••••••••" {...register("confirmPassword")} />
            </FormField>
            <Button type="submit" loading={isSubmitting}>Update Password</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure how you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: "email-notifs", label: "Email Notifications", desc: "Receive updates via email" },
            { id: "push-notifs", label: "Push Notifications", desc: "Browser push notifications" },
            { id: "marketing", label: "Marketing Emails", desc: "Product updates and announcements" },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <Label htmlFor={item.id} className="font-medium cursor-pointer">{item.label}</Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch id={item.id} defaultChecked={item.id !== "marketing"} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => toast.error("Account deletion requires confirmation.")}
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
