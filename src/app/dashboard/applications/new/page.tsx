import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import NewApplicationClient from "./NewApplicationClient";

export default async function NewApplicationPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  return <NewApplicationClient />;
}