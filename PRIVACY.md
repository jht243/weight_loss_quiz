# Privacy Policy

**Weight-Loss Blueprint Quiz**  
*Last Updated: February 2026*

## Overview

Weight-Loss Blueprint Quiz is an interactive wellness quiz that runs as a widget inside ChatGPT via the Model Context Protocol (MCP). We are committed to protecting your privacy and being transparent about our data practices.

## Data Collection

### What We Collect

When the widget is invoked inside ChatGPT, the following data may be received by our server via the MCP `_meta` object:

| Data field | Source | Example |
|---|---|---|
| **Location** (city, region, country) | `openai/userLocation` | "Boston, MA, US" |
| **Locale** | `openai/locale` | "en-US" |
| **Device / browser fingerprint** | `openai/userAgent` | "Mozilla/5.0 … Safari/537.36" |
| **Inferred query context** | Parsed from tool arguments and metadata | "goal=lose_weight, challenge=cravings" |
| **Log timestamp** | Server clock (UTC) | "2026-02-07T19:14:00Z" |
| **Response time** | Server-measured latency | "42 ms" |
| **App enjoyment vote** | User-initiated thumbs up/down | "up" or "down" |
| **User feedback text** | User-submitted via feedback modal | Free-text string |

### What We Do NOT Collect
- Personal identification information (name, email, physical address) unless voluntarily submitted via the feedback or subscribe forms
- Financial account credentials, banking, or payment information
- Social Security Numbers or government IDs
- Health information
- Precise GPS coordinates (location is city-level only, provided by OpenAI)

## Data Processing

All quiz scoring and recommendation generation is performed:
- **Client-side**: In your browser within the ChatGPT sandbox
- **Locally**: Your quiz responses and archetype output are processed in-browser and are not stored on our servers
- **Server-side analytics only**: The server logs the metadata listed above for the `/analytics` dashboard; it does not store private health records

## Data Storage

- **Browser localStorage**: Your quiz responses are cached in your browser's `localStorage` and persist until reset. This data never leaves your device.
- **Server logs**: Anonymous analytics are written to the `/logs` directory on the server and retained for up to **30 days**, then automatically rotated and deleted.
- **Email subscriptions**: If you voluntarily subscribe via the in-widget form, your email is stored with our email provider (Buttondown) under their privacy policy.

## Third-Party Services

| Service | Purpose | Data shared |
|---|---|---|
| **OpenAI (ChatGPT)** | Widget host, MCP transport | Tool arguments, structured content |
| **Render.com** | Server hosting | Server logs (auto-deleted by retention policy) |
| **Buttondown** | Email subscriptions | Email address (opt-in only) |
| **OpenAI API** | Optional AI parsing endpoint | Free-text input (not stored) |

We do not sell, rent, or share your data with third parties for marketing purposes. Anonymous, aggregated analytics may be used to improve the service.

## Data Retention

| Data type | Retention period | How to delete |
|---|---|---|
| **localStorage quiz data** | Indefinite (until user action) | Use "Retake quiz" / reset state |
| **Server analytics logs** | 30 days | Email support for early deletion |
| **Email subscriptions** | Until unsubscribed | Unsubscribe link in emails, or email us |
| **Feedback submissions** | 30 days (in server logs) | Email us for deletion |

## Deletion Requests

To request deletion of server-side analytics data, email **support@layer3labs.io**.

Include:
- Approximate UTC date/time of the session
- Any relevant context (for example: locale, quiz profile, or feedback submission timing)

We process deletion requests within **7 business days**.

## Your Rights

You can:
- **View your local data**: Your quiz data is stored in browser `localStorage` under quiz state keys
- **Delete your local data**: Use the retake/reset controls to clear local quiz state
- **Request server-side deletion**: Email us at **support@layer3labs.io** with the approximate UTC date/time of your session; we will delete associated logs within **7 business days**
- **Use the tool without providing personal information**: The widget works fully without any personal data input
- **Opt out of analytics**: The widget does not set cookies or tracking pixels; analytics are derived solely from MCP `_meta` fields provided by ChatGPT

## Security

- All production traffic uses **HTTPS** encryption end-to-end (required by the OpenAI Apps SDK)
- HTTP (`localhost:8000`) is for local development only and cannot connect to ChatGPT
- The widget runs in a sandboxed iframe with strict Content Security Policy (CSP)
- The `/analytics` dashboard is protected by HTTP Basic Auth
- No sensitive personal data is transmitted to or stored on our servers

## Children's Privacy

This service is not directed at children under 13. We do not knowingly collect information from children.

## Changes to This Policy

We may update this policy periodically. The "Last Updated" date at the top of this document will be revised accordingly. Significant changes will be noted in the project README.

## Contact

For privacy questions, support, or data deletion requests:
- **Email**: support@layer3labs.io
- **Deletion requests**: Include the approximate UTC date/time of your ChatGPT session; we will delete associated server logs within **7 business days**.

There is no GitHub-based support workflow for privacy requests.

**Note:** Please contact us via email for all inquiries. GitHub issues are not monitored for support requests.

---

*This privacy policy is designed to comply with OpenAI's App Developer Guidelines for ChatGPT Apps.*
