import Link from "next/link";

export type GuideStep = {
  title: string;
  desc: string;
  items: string[];
  legal: string;
  tip: string;
};

// Trang hướng dẫn 7 bước (kiểu homigo): dùng chung cho người mua/thuê và người bán.
export default function GuidePage({
  title, subtitle, cta, ctaHref, steps, legalTitle, legalPoints, endTitle,
}: {
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  steps: GuideStep[];
  legalTitle: string;
  legalPoints: [string, string][];
  endTitle: string;
}) {
  return (
    <div>
      <section className="text-center py-8">
        <h1 className="prata text-3xl mb-3">{title}</h1>
        <p className="text-[var(--ink-soft)] max-w-2xl mx-auto mb-5">{subtitle}</p>
        <Link href={ctaHref} className="btn btn-primary inline-block">{cta}</Link>
      </section>

      <div className="space-y-6 mt-4">
        {steps.map((s, i) => (
          <section key={s.title} className="card rounded-lg p-6 shadow-sm">
            <div className="text-[0.7rem] font-bold uppercase tracking-wide text-brand mb-1">Bước {i + 1}</div>
            <h2 className="prata text-xl mb-1">{s.title}</h2>
            <p className="text-[var(--ink-soft)] text-sm mb-3">{s.desc}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {s.items.map((it) => (
                <span key={it} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand/10 text-brand border border-brand/30">
                  {it}
                </span>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="font-bold text-amber-600 mb-1">⚖️ Lưu ý pháp lý</div>
                <p className="text-[var(--ink-soft)]">{s.legal}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="font-bold text-emerald-600 mb-1">💡 Mẹo chuyên gia</div>
                <p className="text-[var(--ink-soft)]">{s.tip}</p>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="prata text-2xl text-center mb-2">{legalTitle}</h2>
        <p className="text-[var(--ink-soft)] text-center text-sm mb-6">
          Những điểm pháp lý quan trọng để bảo vệ quyền lợi của bạn
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {legalPoints.map(([t, d]) => (
            <div key={t} className="card rounded-lg p-5">
              <h3 className="font-bold mb-1">🛡️ {t}</h3>
              <p className="text-sm text-[var(--ink-soft)]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-xl bg-gradient-to-br from-brand to-brand-2 text-white text-center p-10">
        <h2 className="prata text-2xl mb-2">{endTitle}</h2>
        <p className="opacity-90 mb-5 text-sm">Để đội ngũ và công cụ của chúng tôi hướng dẫn bạn qua từng bước của quy trình.</p>
        <Link href={ctaHref} className="btn !bg-white !text-brand !border-white inline-block font-bold">{cta}</Link>
      </section>
    </div>
  );
}
