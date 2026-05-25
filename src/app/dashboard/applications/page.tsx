import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import ApplicationsListClient from "./ApplicationsListClient";

export default async function ApplicationsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <ApplicationsListClient user={session.user} />;
}