# LINE Yahoo Conversion API Tag for Google Tag Manager Server-Side

> 🇯🇵 [日本語版はこちら](README.ja.md)

The **LINE Yahoo Conversion API Tag** for Google Tag Manager Server-Side allows you to send conversion event data from your server container directly to the [LINE Yahoo Conversion API](https://ads-developers.yahoo.co.jp/en/conversion-api/). This server-to-server integration provides a more reliable and privacy-compliant way to track conversions compared to pixel-only setups.

> **Note:** The Conversion API is currently only compatible with **Display Ads**.

## Features

- **Server-to-Server Events**: Sends conversion data directly from the GTM Server Container to the LINE Yahoo Conversion API.
- **Flexible Event Mapping**: Supports standard LINE Yahoo event types, or inherits and maps from GA4 event names automatically.
- **Automatic Data Mapping**: Intelligently maps parameters from incoming GTM event data for server event data, user identifiers, web parameters, and event parameters.
- **Cookie Management**: Automatically reads and sets the `_ly_su` (Anonymous ID), `_ly_c` (Click ID), and `_ly_r` (Complementary Click ID) cookies server-side to improve attribution.
- **PII Hashing**: Automatically hashes email addresses and phone numbers using SHA-256 before sending.
- **Event Deduplication**: Supports the `Transaction ID / Event ID` field to [deduplicate events](https://ads-developers.yahoo.co.jp/en/lytag/post/30590590.html#c04) between the Measurement Tag (web pixel) and the Conversion API.
- **Consent Mode Support**: Integrates with Google Consent Mode, checking for `ad_storage` consent before sending data.
- **Advanced Logging**: Provides options for logging to the GTM console for debugging and persistent logging to BigQuery for monitoring.

## How It Works

This tag is designed to complement the [LINE Yahoo Measurement Tag (web pixel)](https://ads-developers.yahoo.co.jp/en/lytag/). While the pixel fires in the browser, this server-side tag sends the same conversion events directly to the Conversion API, enabling deduplication and improving data reliability.

## Installation

1. **Download the Template**:
   - Download the `template.tpl` file from this repository.
2. **Import to GTM Server Container**:
   - In your GTM Server Container, navigate to the **Templates** section.
   - Click **New** under the **Tag Templates** section.
   - Click the **three-dot menu** in the top right and select **Import**.
   - Select the downloaded `template.tpl` file and click **Save**.
3. **Create a New Tag**:
   - Go to **Tags** and click **New**.
   - Select the newly imported **"LINE Yahoo Conversion API Tag"** template.

## Tag Configuration

### Base Configuration

| Parameter | Description |
| :--- | :--- |
| **Event Type Setup Method** | Choose `Standard` to select an event type from a dropdown, or `Inherit from client` to automatically map from GA4 event names. |
| **Tag ID** | The Tag ID obtained from the tracking tag management view in the Campaign Management Tool. |
| **Tag Access Token** | The Access Token from the Campaign Management Tool. Requires admin or edit permissions. |
| **Channel ID** | Your LINE Channel ID, obtained from the LINE Developers Console. **Required** when passing a LINE User ID. |
| **Conversion Source** | Where the conversion event occurred. Currently only `Web` is supported. |
| **Event Snippet ID** | The Event Snippet ID from Conversion Settings (not from the Tracking Tag Management view). Not applicable to `page_view` events. |
| **Test Mode** | If `true`, the event will be excluded from measurement. |
| **Use Optimistic Scenario** | If enabled, the tag fires `gtmOnSuccess()` immediately without waiting for the API response, speeding up server response time. |

#### GA4 → Conversion API Event Type Mapping (Inherit from client)

When using **Inherit from client**, the following GA4 event names are mapped:

| GA4 Event Name | Conversion API Event Type |
| :--- | :--- |
| `page_view` | `page_view` |
| `view_item_list` | `view_listing` |
| `view_item` | `view_product` |
| `search`, `view_search_results` | `search` |
| `add_to_wishlist` | `add_wishlist` |
| `add_to_cart` | `add_cart` |
| `view_cart` | `view_cart` |
| `begin_checkout` | `check_out` |
| `add_payment_info` | `payment_info` |
| `purchase` | `purchase` |
| `generate_lead` | `generate_lead` |
| `login` | `login` |
| `sign_up` | `sign_up` |

### Anonymous ID and Click ID Settings

Controls how the tag handles the three LINE Yahoo identity cookies: `_ly_su` (Anonymous ID), `_ly_c` (Click ID), and `_ly_r` (Complementary Click ID).

| Parameter | Description |
| :--- | :--- |
| **Set Anonymous ID cookie** | If `true`, the Anonymous ID is stored as the `_ly_su` cookie by server GTM. If not found in any source, it is auto-generated. |
| **Set Click ID cookie** | If `true`, the Click ID is stored as the `_ly_c` cookie by server GTM. |
| **Set complementary Click ID cookie** | If `true`, the Complementary Click ID is stored as the `_ly_r` cookie by server GTM. |

Each ID is sourced in the following priority order:
1. **User Identifiers Parameters** section (manual override)
2. URL parameter (`_ly_c` / `_ly_r` only)
3. Existing cookie
4. Event Data parameter

### Server Event Data Parameters

| Parameter | Description |
| :--- | :--- |
| **Auto-map Server Event Data Parameters** | If enabled, automatically sets the `Event Timestamp` to the Unix timestamp (in seconds) of when the server tag fired, and maps `Transaction ID / Event ID` from `transaction_id`, `event_id`, or `eventId` in the Event Data. |
| **Server Event Data Parameters** | Manually override or add `Event Timestamp` and `Transaction ID / Event ID`. The `Transaction ID / Event ID` is used for [event deduplication](https://ads-developers.yahoo.co.jp/en/lytag/post/30590590.html#c04) and must match the regex: `^[!"#$%&'()*+,\-./:;=\?@A-Z_a-z~]+$`. |

### User Identifiers Parameters

At least one user identifier is required (either auto-mapped or manually provided). For full parameter descriptions, see the [Conversion API product guide](https://ads-developers.yahoo.co.jp/en/conversion-api/product-guide/).

| Parameter | Description |
| :--- | :--- |
| **Automap User Identifiers Parameters** | If enabled, automatically maps Email, Phone, Anonymous ID, Click ID, Complementary Click ID, and Mobile ID from the Event Data. |
| **User Identifiers Parameters** | Manually specify user identifiers. Supported types: `Email Address`, `Phone Number`, `Anonymous ID (_ly_su)`, `Click ID (_ly_c)`, `Complementary Click ID (_ly_r)`, `Mobile ID (iOS IDFA or Android AAID)`, `LINE User ID`. |

**Phone Number format**: `+{Country Code}{Number}` — digits only, no hyphens or parentheses.  
Example: `090-0123-4567` (Japan) → `+819001234567`.

When passing a **LINE User ID**, make sure to also provide the **Channel ID** in the Base Configuration.

### Web Parameters

Available when **Conversion Source** is set to `Web`. For full parameter descriptions, see the [Conversion API product guide](https://ads-developers.yahoo.co.jp/en/conversion-api/product-guide/).

| Parameter | Description |
| :--- | :--- |
| **Automap Web Parameters** | If enabled, automatically maps `Page URL`, `Page Referrer`, `User Agent`, and `IP Address` from the Event Data. |
| **Web Parameters** | Manually specify `Page URL`, `Page Referrer URL`, `User Agent`, and `IP Address`. |

### Event Parameters

| Parameter | Description |
| :--- | :--- |
| **Automap Event Parameters** | If enabled, automatically maps `Value` (from `eventData.value` or sum of items), `Currency`, and `Items` (from `eventData.items`). |
| **Event Parameters** | Manually specify `Value`, `Currency`, `Items`, and `Label`. |

**Currency**: Only `JPY` is supported. It is added automatically when `Value` is present.  
**Items**: An array of up to 10 objects, each with `item_id`, `category_id`, `price`, and/or `quantity`. `item_id` or `category_id` is required when specifying `price` or `quantity`.

### Advanced Settings

#### Tag Execution Consent Settings

| Parameter | Description |
| :--- | :--- |
| **Ad Storage Consent** | `Send data always` (default) or `Send data in case marketing consent given`. The latter aborts the tag if `ad_storage` consent (Google Consent Mode or Stape's Data Tag parameter) is not granted. |

#### Logs Settings

| Parameter | Description |
| :--- | :--- |
| **Log Type** | `Do not log`, `Log to console during debug and preview` (default), or `Always log to console`. |

#### BigQuery Logs Settings

| Parameter | Description |
| :--- | :--- |
| **BigQuery Log Type** | `Do not log to BigQuery` (default) or `Log to BigQuery`. |
| **BigQuery Project ID** | Optional. Defaults to the `GOOGLE_CLOUD_PROJECT` environment variable. |
| **BigQuery Dataset ID** | Required when BigQuery logging is enabled. |
| **BigQuery Table ID** | Required when BigQuery logging is enabled. |

## Useful Resources

- [Conversion API Overview](https://ads-developers.yahoo.co.jp/en/conversion-api/)
- [User Guide](https://ads-developers.yahoo.co.jp/en/conversion-api/user-guide/)
- [Product Guide](https://ads-developers.yahoo.co.jp/en/conversion-api/product-guide/)

## Open Source

The **LINE Yahoo Conversion API Tag for GTM Server-Side** is developed and maintained by the [Stape Team](https://stape.io/) under the Apache 2.0 license.

### GTM Gallery Status
🟢 [Listed](https://tagmanager.google.com/gallery/#/owners/stape-io/templates/line-yahoo-tag)
