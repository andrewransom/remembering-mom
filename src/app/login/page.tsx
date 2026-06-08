import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function LoginPage() {
  const currentUser = await getAuthenticatedUser();

  if (currentUser) {
    redirect("/");
  }

  return (
    <section className="section-shell py-16 sm:py-20">
      <LoginForm />
    </section>
  );
}
