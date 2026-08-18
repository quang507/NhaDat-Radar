// Cấu hình pm2 — CHỈ còn bot Zalo chạy nền.
//
// 18/8: bỏ hết lịch tự chạy (daily-crawl, crawl-on-boot, zalo-post) theo yêu cầu.
// Giờ mọi thứ chạy bằng MỘT nút: bấm đúp CHAY.bat ở thư mục gốc.
// Bot Zalo vẫn để pm2 quản để nó tự bật lại nếu lỡ crash; CHAY.bat sẽ khởi động nó.
//
// Xem log bot:  pm2 logs zalo-bot   |   Dừng: pm2 stop zalo-bot
module.exports = {
  apps: [
    {
      name: "zalo-bot",
      script: "crawler/zalo-bot.mjs",
      node_args: "--env-file=.env.local",
      autorestart: true,
      max_restarts: 30,
      restart_delay: 5000,
    },
  ],
};
