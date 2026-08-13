import AuthForm from "./AuthForm";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const mode = sp.mode === "register" ? "register" : "login";
  return (
    <div className="max-w-md mx-auto mt-8">
      <AuthForm initialMode={mode} error={sp.error} message={sp.message} />
    </div>
  );
}
