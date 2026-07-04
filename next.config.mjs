/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3, archiver 등 네이티브/노드 전용 모듈을 서버 번들에서 external 처리
  serverExternalPackages: ["better-sqlite3", "archiver", "exceljs", "nodemailer", "bcryptjs"],
};

export default nextConfig;
