# LINE Yahoo Conversion API タグ（Google タグ マネージャー サーバーサイド）

> 🇺🇸 [English version here](README.md)

**LINE Yahoo Conversion API タグ**（Google タグ マネージャー サーバーサイド）は、GTM サーバーコンテナからコンバージョンイベントデータを [LINE Yahoo Conversion API](https://ads-developers.yahoo.co.jp/ja/conversion-api/) へ直接送信するタグです。このサーバー間連携により、ピクセルのみの実装と比較して、より信頼性が高くプライバシーに配慮したコンバージョン計測が可能になります。

> **注意:** Conversion API は現在、**ディスプレイ広告にのみ対応**しています。

## 機能

- **サーバー間イベント送信**: GTM サーバーコンテナから LINE Yahoo Conversion API へ直接コンバージョンデータを送信します。
- **柔軟なイベントマッピング**: 標準の LINE Yahoo イベントタイプを選択するか、GA4 イベント名から自動的にマッピングして継承できます。
- **自動データマッピング**: サーバーイベントデータ、ユーザー識別子、Web パラメータ、イベントパラメータを受信した GTM イベントデータから自動的にマッピングします。
- **Cookie 管理**: `_ly_su`（匿名 ID）、`_ly_c`（クリック ID）、`_ly_r`（補完クリック ID）の各 Cookie をサーバーサイドで読み取り・設定し、アトリビューションの精度を向上させます。
- **個人情報のハッシュ化**: 送信前にメールアドレスと電話番号を自動的に SHA-256 でハッシュ化します。
- **イベント重複排除**: `トランザクション ID / イベント ID` フィールドを使用して、計測タグ（Web ピクセル）と Conversion API 間で[イベントを重複排除](https://ads-developers.yahoo.co.jp/ja/lytag/post/30590635.html#c04)できます。
- **コンセントモード対応**: Google コンセントモードと連携し、データ送信前に `ad_storage` の同意を確認します。
- **高度なログ機能**: GTM コンソールへのデバッグログ出力や、監視のための BigQuery への永続ログ記録に対応しています。

## 仕組み

このタグは、[LINE Yahoo 計測タグ（Web ピクセル）](https://ads-developers.yahoo.co.jp/ja/lytag/)を補完する形で動作します。ピクセルがブラウザ側でイベントを送信する一方、このサーバーサイドタグは同じコンバージョンイベントを Conversion API へ直接送信することで、重複排除とデータの信頼性向上を実現します。

## インストール

1. **テンプレートのダウンロード**:
   - このリポジトリから `template.tpl` ファイルをダウンロードします。
2. **GTM サーバーコンテナへのインポート**:
   - GTM サーバーコンテナで**テンプレート**セクションに移動します。
   - **タグテンプレート**セクションの**新規**をクリックします。
   - 右上の**三点メニュー**をクリックし、**インポート**を選択します。
   - ダウンロードした `template.tpl` ファイルを選択し、**保存**をクリックします。
3. **タグの作成**:
   - **タグ**に移動し、**新規**をクリックします。
   - インポートした **「LINE Yahoo Conversion API タグ」** テンプレートを選択します。

## タグ設定

### 基本設定

| パラメータ | 説明 |
| :--- | :--- |
| **イベントタイプ設定方法** | `スタンダード`（ドロップダウンからイベントタイプを選択）、または`クライアントから継承`（GA4 イベント名から自動マッピング）を選択します。 |
| **タグ ID** | キャンペーン管理ツールのトラッキングタグ管理ビューから取得したタグ ID。 |
| **タグアクセストークン** | キャンペーン管理ツールから取得したアクセストークン。管理者権限または編集権限が必要です。 |
| **チャンネル ID** | LINE Developers コンソールから取得した LINE チャンネル ID。LINE ユーザー ID を渡す場合に**必須**です。 |
| **コンバージョンソース** | コンバージョンイベントが発生した場所。現在は `Web` のみサポートされています。 |
| **イベントスニペット ID** | コンバージョン設定から取得したイベントスニペット ID（トラッキングタグ管理ビューからのものは対象外）。`page_view` イベントタイプには適用されません。 |
| **テストモード** | `true` の場合、イベントは計測から除外されます。 |
| **楽観的シナリオを使用する** | 有効にすると、API レスポンスを待たずに即座に `gtmOnSuccess()` を呼び出します。サーバーのレスポンス時間が短縮されますが、失敗した場合でも成功として扱われます。 |

#### GA4 → Conversion API イベントタイプマッピング（クライアントから継承）

**クライアントから継承**を使用する場合、以下の GA4 イベント名がマッピングされます：

| GA4 イベント名 | Conversion API イベントタイプ |
| :--- | :--- |
| `page_view` | `page_view` |
| `view_item_list` | `view_listing` |
| `view_item` | `view_product` |
| `search`、`view_search_results` | `search` |
| `add_to_wishlist` | `add_wishlist` |
| `add_to_cart` | `add_cart` |
| `view_cart` | `view_cart` |
| `begin_checkout` | `check_out` |
| `add_payment_info` | `payment_info` |
| `purchase` | `purchase` |
| `generate_lead` | `generate_lead` |
| `login` | `login` |
| `sign_up` | `sign_up` |

### 匿名 ID およびクリック ID の設定

`_ly_su`（匿名 ID）、`_ly_c`（クリック ID）、`_ly_r`（補完クリック ID）の 3 つの Cookie の取り扱いを制御します。

| パラメータ | 説明 |
| :--- | :--- |
| **匿名 ID Cookie をセットする** | `true` の場合、匿名 ID をサーバー GTM が `_ly_su` Cookie として保存します。どのソースにも見つからない場合は自動生成されます。 |
| **クリック ID Cookie をセットする** | `true` の場合、クリック ID をサーバー GTM が `_ly_c` Cookie として保存します。 |
| **補完クリック ID Cookie をセットする** | `true` の場合、補完クリック ID をサーバー GTM が `_ly_r` Cookie として保存します。 |

各 ID は以下の優先順位でソースから取得されます：
1. **ユーザー識別子パラメータ**セクション（手動上書き）
2. URL パラメータ（`_ly_c` / `_ly_r` のみ）
3. 既存の Cookie
4. イベントデータパラメータ

### サーバーイベントデータパラメータ

| パラメータ | 説明 |
| :--- | :--- |
| **サーバーイベントデータパラメータを自動マッピングする** | 有効にすると、`イベントタイムスタンプ`をサーバータグ起動時の Unix タイムスタンプ（秒単位）に自動設定し、`トランザクション ID / イベント ID` を `transaction_id`、`event_id`、または `eventId` から自動マッピングします。 |
| **サーバーイベントデータパラメータ** | `イベントタイムスタンプ`と`トランザクション ID / イベント ID`を手動で上書きできます。`トランザクション ID / イベント ID`は[イベント重複排除](https://ads-developers.yahoo.co.jp/ja/lytag/post/30590635.html#c04)に使用され、正規表現 `^[!"#$%&'()*+,\-./:;=\?@A-Z_a-z~]+$` に一致する必要があります。 |

### ユーザー識別子パラメータ

少なくとも 1 つのユーザー識別子が必要です（自動マッピングまたは手動入力）。各パラメータの詳細は [Conversion API プロダクトガイド](https://ads-developers.yahoo.co.jp/ja/conversion-api/product-guide/)をご参照ください。

| パラメータ | 説明 |
| :--- | :--- |
| **ユーザー識別子パラメータを自動マッピングする** | 有効にすると、イベントデータからメールアドレス、電話番号、匿名 ID、クリック ID、補完クリック ID、モバイル ID を自動マッピングします。 |
| **ユーザー識別子パラメータ** | ユーザー識別子を手動で指定します。対応タイプ：`Email Address`、`Phone Number`、`Anonymous ID (_ly_su)`、`Click ID (_ly_c)`、`Complementary Click ID (_ly_r)`、`Mobile ID (iOS IDFA または Android AAID)`、`LINE User ID`。 |

**電話番号フォーマット**: `+{国番号}{番号}` — 数字のみ（ハイフン・括弧不可）。  
例：`090-0123-4567`（日本）→ `+819001234567`

**LINE ユーザー ID** を渡す場合は、基本設定の**チャンネル ID** も必ず入力してください。

### Web パラメータ

**コンバージョンソース**が `Web` に設定されている場合に表示されます。各パラメータの詳細は [Conversion API プロダクトガイド](https://ads-developers.yahoo.co.jp/ja/conversion-api/product-guide/)をご参照ください。

| パラメータ | 説明 |
| :--- | :--- |
| **Web パラメータを自動マッピングする** | 有効にすると、イベントデータから `ページ URL`、`ページリファラー`、`ユーザーエージェント`、`IP アドレス`を自動マッピングします。 |
| **Web パラメータ** | `ページ URL`、`ページリファラー URL`、`ユーザーエージェント`、`IP アドレス`を手動で指定します。 |

### イベントパラメータ

| パラメータ | 説明 |
| :--- | :--- |
| **イベントパラメータを自動マッピングする** | 有効にすると、`Value`（`eventData.value` または商品の価格 × 数量の合計）、`Currency`、`Items`（`eventData.items`）を自動マッピングします。 |
| **イベントパラメータ** | `Value`（金額）、`Currency`（通貨）、`Items`（商品）、`Label`（ラベル）を手動で指定します。 |

**Currency（通貨）**: `JPY` のみサポートされています。`Value` が存在する場合に自動的に追加されます。  
**Items（商品）**: 最大 10 件のオブジェクトの配列。各オブジェクトには `item_id`、`category_id`、`price`、`quantity` を含められます。`price` または `quantity` を指定する場合、`item_id` または `category_id` が**必須**です。

### 詳細設定

#### タグ実行同意設定

| パラメータ | 説明 |
| :--- | :--- |
| **Ad Storage 同意** | `常にデータを送信する`（デフォルト）または`マーケティング同意が得られた場合にデータを送信する`。後者は `ad_storage` 同意（Google コンセントモードまたは Stape の Data タグパラメータ）が得られていない場合、タグ処理を中断します。 |

#### ログ設定

| パラメータ | 説明 |
| :--- | :--- |
| **ログタイプ** | `ログを記録しない`、`デバッグおよびプレビュー中にコンソールへログを記録する`（デフォルト）、または`常にコンソールへログを記録する`。 |

#### BigQuery ログ設定

| パラメータ | 説明 |
| :--- | :--- |
| **BigQuery ログタイプ** | `BigQuery にログを記録しない`（デフォルト）または `BigQuery にログを記録する`。 |
| **BigQuery プロジェクト ID** | 任意。省略した場合、`GOOGLE_CLOUD_PROJECT` 環境変数から取得されます。 |
| **BigQuery データセット ID** | BigQuery ログ有効時に必須。 |
| **BigQuery テーブル ID** | BigQuery ログ有効時に必須。 |

## 参考リソース

- [Conversion API 概要](https://ads-developers.yahoo.co.jp/ja/conversion-api/)
- [ユーザーガイド](https://ads-developers.yahoo.co.jp/ja/conversion-api/user-guide/)
- [プロダクトガイド](https://ads-developers.yahoo.co.jp/ja/conversion-api/product-guide/)

## オープンソース

**LINE Yahoo Conversion API タグ（GTM サーバーサイド）**は、Apache 2.0 ライセンスのもと [Stape チーム](https://stape.io/)によって開発・メンテナンスされています。
