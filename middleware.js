import { next } from "@vercel/edge";

// すべてのパスに認証を適用
export const config = {
  matcher: "/:path*",
};

export default function middleware(request) {
  const auth = request.headers.get("authorization");

  // Vercel の環境変数から正解を取得
  const USER = process.env.BASIC_AUTH_USER;
  const PASS = process.env.BASIC_AUTH_PASSWORD;

  if (auth) {
    // "Basic xxxxx" の xxxxx 部分をデコード
    const encoded = auth.split(" ")[1] || "";
    const decoded = atob(encoded); // "ユーザー名:パスワード"
    const sep = decoded.indexOf(":");
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);

    if (user === USER && pass === PASS) {
      return next(); // 認証成功 → アプリを表示
    }
  }

  // 未入力 or 不一致 → ログインダイアログを表示
  return new Response("認証が必要です。", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area", charset="UTF-8"',
    },
  });
}