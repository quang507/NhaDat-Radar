#!/bin/sh
# Vercel "Ignored Build Step" (vercel.json ignoreCommand) - 5/11: 90 lần deploy production trong 10 ngày, phần lớn chỉ
# đổi crawler/bot/docs. Mỗi deploy xoá cache ISR -> Googlebot làm dựng lại cả nghìn trang, góp phần vượt Fast Origin
# Transfer gói Hobby (Vercel khoá deploy 4/11). Thoát 0 = BỎ build, 1 = build.
# So với commit đã deploy lần trước (VERCEL_GIT_PREVIOUS_SHA), không chỉ commit cuối: push gộp nhiều commit vẫn đúng.
CU="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"
git cat-file -e "$CU^{commit}" 2>/dev/null || exit 1   # clone nông không có commit cũ -> cứ build
if git diff --quiet "$CU" HEAD -- src public data next.config.mjs package.json package-lock.json \
  tailwind.config.ts postcss.config.mjs tsconfig.json next-env.d.ts vercel.json scripts/vercel-bo-qua.sh; then
  echo "Chỉ đổi phần không thuộc web (crawler, docs, video...) - bỏ deploy"
  exit 0
fi
exit 1
