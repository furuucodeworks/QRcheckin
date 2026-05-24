import { Client } from "@notionhq/client";

// .envの登録されている環境変数を確認する
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is missing`);
  return v;
}

export const notion = new Client({ auth: requireEnv("NOTION_TOKEN") });

export const PASS_MASTER_DB_ID = requireEnv("NOTION_PASS_MASTER_DB_ID");
export const CHECKIN_LOG_DB_ID = requireEnv("NOTION_CHECKIN_LOG_DB_ID");

/** パス券マスターDB のデータソースに対して、`パスID` が引数と一致する行を検索する。ヒットした先頭1件を返し、無ければ null。 */
export async function findPassById(passId: string) {
  const database = await notion.databases.retrieve({
    database_id: PASS_MASTER_DB_ID,
  });

  if (!("data_sources" in database) || database.data_sources.length === 0) {
    throw new Error("No data source found in pass master database");
  }

  const passMasterDataSourceId = database.data_sources[0].id;

  const response = await notion.dataSources.query({
    data_source_id: passMasterDataSourceId,
    filter: {
      property: "パスID",
      rich_text: {
        equals: passId,
      },
    },
    page_size: 1,
  });

  return response.results[0] ?? null;
}

/** チェックインログDB に1ページ追加する（プロパティ名はNotion側と完全一致させること） */
export async function createCheckInLog(params: {
  passPageId: string;
  passId: string;
  optionUsed: boolean;
}) {
  const nowIso = new Date().toISOString();
  const titleText = `${nowIso.slice(0, 19).replace("T", " ")} — ${params.passId}`;
  await notion.pages.create({
    parent: { database_id: CHECKIN_LOG_DB_ID },
    properties: {
      タイトル: {
        title: [{ text: { content: titleText }, type: "text" }],
      },
      パス: {
        relation: [{ id: params.passPageId }],
      },
      チェックイン日時: {
        date: {
          start: nowIso,
        },
      },
      保険料利用: {
        checkbox: params.optionUsed,
      },
    },
  });
}
