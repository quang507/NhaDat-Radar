import { updatePassword } from "../actions";

export const metadata = { title: "Đặt lại mật khẩu - NhaDat Radar" };

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="max-w-md mx-auto mt-8">
      <form action={updatePassword} className="card rounded-2xl p-7 shadow-sm flex flex-col gap-3">
        <h1 className="prata text-2xl text-center mb-2">Đặt Lại Mật Khẩu</h1>
        <p className="text-sm text-[var(--ink-soft)] text-center mb-2">
          Nhập mật khẩu mới cho tài khoản của bạn.
        </p>
        {sp.error && <p className="text-sm text-red-600 text-center">{sp.error}</p>}
        <label className="block">
          <span className="lbl">Mật khẩu mới</span>
          <input className="inp" name="password" type="password" minLength={6} required placeholder="••••••••" />
        </label>
        <button className="btn btn-primary w-full mt-1" type="submit">Cập nhật mật khẩu</button>
      </form>
    </div>
  );
}
