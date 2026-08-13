import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingForm from "./ListingForm";

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?message=" + encodeURIComponent("Đăng nhập để đăng tin"));

  return (
    <div>
      <h1 className="prata text-2xl mb-4">Đăng tin mới</h1>
      <ListingForm />
    </div>
  );
}
