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
  searchParams: Promise<{ mode?: string; error?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const mode = sp.mode === "register" ? "register" : sp.mode === "forgot" ? "forgot" : "login";
  return (
    <div className="max-w-md mx-auto mt-8">
      <AuthForm initialMode={mode} error={sp.error} message={sp.message} />
    </div>
  );
}
