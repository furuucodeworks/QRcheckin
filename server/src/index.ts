import "dotenv/config";
import express from "express";
import {
  notion,
  PASS_MASTER_DB_ID,
  findPassById,
  createCheckInLog,
} from "./notion";

const app = express();
app.use(express.urlencoded({ extended: true }));
const PORT = Number(process.env.PORT ?? 3000);

/** 受付画面用: スマホで読みやすいサイズ・中央寄せの最小HTMLラッパー */
function checkinPageHtml(inner: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>チェックイン</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100dvh;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 1.25rem;
      line-height: 1.55;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      background: #f5f5f7;
      color: #1d1d1f;
    }
    main {
      width: 100%;
      max-width: 24rem;
      text-align: center;
    }
    h1 {
      font-size: clamp(1.35rem, 4.5vw, 1.75rem);
      font-weight: 700;
      margin: 0 0 1rem;
    }
    p { margin: 0.65rem 0; }
    label {
      display: inline-block;
      margin: 1rem 0;
      font-size: 1.1rem;
    }
    input[type="checkbox"] {
      width: 1.15rem;
      height: 1.15rem;
      vertical-align: middle;
      margin-right: 0.35rem;
    }
    button {
      font: inherit;
      font-size: 1.15rem;
      font-weight: 600;
      padding: 0.85rem 1.6rem;
      border-radius: 0.85rem;
      border: none;
      background: #0071e3;
      color: #fff;
      cursor: pointer;
      margin-top: 0.75rem;
    }
    pre {
      text-align: left;
      font-size: 0.95rem;
      overflow: auto;
      background: #fff;
      padding: 0.75rem;
      border-radius: 0.5rem;
    }
  </style>
</head>
<body>
  <main>${inner}</main>
</body>
</html>`;
}

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.get("/notion/ping", async (_req, res) => {
  try {
    const result = await notion.databases.retrieve({
      database_id: PASS_MASTER_DB_ID,
    });

    const databaseTitle =
      "title" in result
        ? (result.title?.[0]?.plain_text ?? "(no title)")
        : "(no title)";

    res.status(200).json({ ok: true, databaseTitle });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get("/checkin", async (req, res) => {
  const passId = String(req.query.pass_id ?? "").trim();
  if (!passId) {
    res
      .status(400)
      .send(
        checkinPageHtml("<h1>400 Bad Request</h1><p>pass_id が必要です。</p>"),
      );
    return;
  }
  try {
    const passPage = await findPassById(passId);
    if (!passPage) {
      res
        .status(404)
        .send(
          checkinPageHtml(
            "<h1>404 Not Found</h1><p>該当するパスが見つかりません。</p>",
          ),
        );
      return;
    }
    // `findPassById()` の戻り値は Notion の型定義上ユニオンになるので、
    // `properties` を持っている場合だけ安全に取り出す。
    const props = "properties" in passPage ? (passPage.properties ?? {}) : {};

    //有効期限をキーにdateの型となっているか判定して開始(start)を取りに行く処理
    const expiresAt =
      props["有効期限"]?.type === "date"
        ? (props["有効期限"].date?.start ?? undefined)
        : undefined;
    // 有効期限判定
    const isExpired = expiresAt
      ? new Date(expiresAt).getTime() < Date.now()
      : false;
    res.status(200).send(
      checkinPageHtml(`
        <h1>チェックイン確認</h1>
        <p>パスID: ${passId}</p>
        <p>有効期限: ${expiresAt ?? "未設定"}</p>
        <p style="color:${isExpired ? "red" : "green"}">
          ${isExpired ? "期限切れです" : "利用可能です"}
        </p>
        <form method="POST" action="/checkin/submit">
          <input type="hidden" name="pass_id" value="${passId}" />
          <label>
            <input type="checkbox" name="option_used" value="true" />
            保険料利用
          </label>
          <br /><br />
          <button type="submit">チェックイン登録</button>
        </form>
      `),
    );
  } catch (err) {
    res
      .status(500)
      .send(
        checkinPageHtml(
          `<h1>500 Internal Server Error</h1><pre>${String(err)}</pre>`,
        ),
      );
  }
});

app.post("/checkin/submit", async (req, res) => {
  const passId = String(req.body.pass_id ?? "").trim();
  if (!passId) {
    res
      .status(400)
      .send(
        checkinPageHtml("<h1>400 Bad Request</h1><p>pass_id が必要です。</p>"),
      );
    return;
  }
  try {
    const passPage = await findPassById(passId);
    if (!passPage) {
      res
        .status(404)
        .send(
          checkinPageHtml(
            "<h1>404 Not Found</h1><p>該当するパスが見つかりません。</p>",
          ),
        );
      return;
    }
    const props = "properties" in passPage ? (passPage.properties ?? {}) : {};
    const expiresAt =
      props["有効期限"]?.type === "date"
        ? (props["有効期限"].date?.start ?? undefined)
        : undefined;
    const isExpired = expiresAt
      ? new Date(expiresAt).getTime() < Date.now()
      : false;
    if (isExpired) {
      res
        .status(403)
        .send(
          checkinPageHtml(
            "<h1>403 Forbidden</h1><p>期限切れのため、チェックインを記録できません。</p>",
          ),
        );
      return;
    }
    const optionUsed = req.body.option_used === "true";
    const passPageId = "id" in passPage ? passPage.id : null;
    if (!passPageId) {
      res
        .status(500)
        .send(
          checkinPageHtml(
            "<h1>500 Internal Server Error</h1><p>ページIDを取得できませんでした。</p>",
          ),
        );
      return;
    }
    await createCheckInLog({ passPageId, passId, optionUsed });
    res
      .status(200)
      .send(
        checkinPageHtml(
          "<h1>登録しました</h1><p>チェックインを記録しました。</p>",
        ),
      );
  } catch (err) {
    res
      .status(500)
      .send(
        checkinPageHtml(
          `<h1>500 Internal Server Error</h1><pre>${String(err)}</pre>`,
        ),
      );
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}/health`);
});
