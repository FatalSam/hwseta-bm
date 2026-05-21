# Admin email: forward / escalate

How the **beneficiary admin** UI sends a beneficiary thread message to another person (same behaviour the HWSETA app uses).

## API

- **Method / URL:** `POST /api/Admin/email-messages/forward`
- **Auth:** `Authorization: Bearer <accessToken>` (admin JWT with `UserID` claim)
- **Body (JSON, camelCase):**

| Field | Required | Notes |
|--------|----------|--------|
| `messageId` | Yes | Source row in `HW_EmailMessages` (the message you are forwarding). |
| `forwardToEmail` | Yes | External recipient (any valid mailbox). |
| `forwardToName` | No | Shown as the display name on the To line. |
| `subject` | Yes | Usually `Fwd: …` — the UI pre-fills this. |
| `messageBody` | Yes | Full plain-text body (intro + quoted “Forwarded message” block). |
| `includeAttachments` | No | Default `true`. When true, files stored on the source message are attached (same size/count limits as compose). |

**Success:** `200` with the new sent message object (same shape as compose).

**Errors:** `400` validation, `401`/`403` auth, `404` if the source message is not found, `500` on SMTP failure.

## Minimal client example

```ts
import apiClient from '@/ultis/apiClient';

await apiClient.post('/api/Admin/email-messages/forward', {
  messageId: '<source-message-guid>',
  forwardToEmail: 'colleague@example.com',
  forwardToName: 'Case owner', // optional
  subject: 'Fwd: Original subject',
  messageBody: 'Optional intro…\n\n--- Forwarded message ---\n…',
  includeAttachments: true,
});
```

Or use the wrapper:

```ts
import { forwardAdminEmailMessage } from '@/api/adminEmailMessages';

await forwardAdminEmailMessage({
  messageId,
  forwardToEmail: 'colleague@example.com',
  subject,
  messageBody,
  includeAttachments: true,
});
```

## Where it is implemented in this repo

| Area | Location |
|------|-----------|
| API call | `api/adminEmailMessages.ts` → `forwardAdminEmailMessage` |
| Types | `types/admin-email-messages.ts` → `AdminEmailForwardPayload` |
| UI | `components/admin/AdminBeneficiaryEmailsPanel.tsx` — **Forward** opens the compose dialog in forward mode, collects `forwardToEmail`, pre-fills subject/body, then calls `forwardAdminEmailMessage`. |

## Behaviour notes

- Mail is sent from your **organisation SMTP** settings (same as compose), not from the beneficiary’s address.
- The server records a new **Sent** message linked to the **same beneficiary** and marks the **original** message read after a successful send.
- Do not send `POST /compose` with a custom `toEmail` for forwarding — use **`/forward`** only.
