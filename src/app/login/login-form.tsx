"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { signInWithEmailAndPassword, type LoginState } from "./actions";

const initialState: LoginState = {
  ok: true,
};

const fieldClassName =
  "w-full rounded-xl border border-border bg-card/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/70";

export function LoginForm() {
  const [state, formAction] = useActionState(signInWithEmailAndPassword, initialState);

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Admin login</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" action={formAction}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className={fieldClassName}
              defaultValue={state.email}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={fieldClassName}
            />
          </div>

          <Button type="submit">Sign in</Button>
        </form>

        <Link href="/" className="mt-6 inline-block text-sm text-accent underline">
          Back to memorials
        </Link>
      </CardContent>
      <Toast id={state.notificationId} message={state.error} tone="error" />
    </Card>
  );
}
