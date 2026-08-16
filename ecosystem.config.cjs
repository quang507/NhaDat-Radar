// Cấu hình pm2 — chạy nền FB crawl + Zalo bot trên PC nhà (IP dân cư VN, free)
// hoặc VPS. Cài: npm i -g pm2   |   Chạy: pm2 start ecosystem.config.cjs
// Xem log: pm2 logs   |   Dừng: pm2 stop all   |   Tự chạy khi mở máy: pm2 startup + pm2 save
module.exports = {
  apps: [
    {
      // Bot Zalo: lắng nghe group + chat 1-1 (chạy nền liên tục, tự restart)
      name: "zalo-bot",
      script: "crawler/zalo-bot.mjs",
      node_args: "--env-file=.env.local",
      autorestart: true,
      max_restarts: 30,
      restart_delay: 5000,
    },
    {
      // Cào toàn bộ nguồn (gồm FB Playwright) mỗi ngày 5h sáng
      name: "daily-crawl",
      script: "crawler/daily.mjs",
      node_args: "--env-file=.env.local",
      autorestart: false,
      cron_restart: "0 5 * * *",
    },
    {
      // Bật máy trễ giờ cron (5h) -> nếu lần cào gần nhất >20h thì cào ngay (FB/Zalo máy nhà không mất ngày)
      name: "crawl-on-boot",
      script: "crawler/run-if-stale.mjs",
      node_args: "--env-file=.env.local",
      autorestart: false,
    },
    {
      // Đăng tin lên group Zalo: 8h sáng & 17h chiều (cần ZALO_POST_GROUPS)
      name: "zalo-post",
      script: "crawler/zalo-bot.mjs",
      args: "post",
      node_args: "--env-file=.env.local",
      autorestart: false,
      cron_restart: "0 8,17 * * *",
    },
  ],
};
