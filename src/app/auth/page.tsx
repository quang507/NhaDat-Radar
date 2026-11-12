import type { Metadata } from "next";
import AuthForm from "./AuthForm";

// trang đăng nhập không có nội dung để xếp hạng: title riêng, không vào chỉ mục
export const metadata: Metadata = {
  title: "Đăng nhập / Đăng ký - NhaDat Radar",
  alternates: { canonical: "/auth" },
  robots: { index: false, follow: true },
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string; message?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const mode = sp.mode === "register" ? "register" : sp.mode === "forgot" ? "forgot" : sp.mode === "email" ? "email" : "login";
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "";
  return (
    <div className="max-w-md mx-auto mt-8">
      <AuthForm initialMode={mode} error={sp.error} message={sp.message} next={next} />
    </div>
  );
}
