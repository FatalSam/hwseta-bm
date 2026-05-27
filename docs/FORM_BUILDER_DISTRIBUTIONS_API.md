# Form Builder — Distributions & Notifications API

Backend implementation specification for **form distribution** (send form to beneficiaries/external contacts) and **per-notification delivery tracking**. Designed to match the Next.js beneficiary monitoring app (`hwseta-bm`).

**Frontend feature spec:** [FORM_SUBMISSIONS_FEATURE.md](./FORM_SUBMISSIONS_FEATURE.md)

**Existing form builder endpoints (reference):**

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST/PUT | `/api/manage/form-builder/forms` | Admin CRUD |
| GET | `/api/form-builder/forms/{formId}` | Public form definition |
| POST | `/api/form-builder/forms/{formId}/submit` | Public submit answers |

**Communication infrastructure (reference):**

| Area | Path |
|------|------|
| SMTP / WinSMS settings | `/api/Admin/communication-settings/email`, `/sms` |
| Per-beneficiary SMS | `/api/Admin/beneficiaries/{id}/sms` |
| Per-beneficiary email | `/api/Admin/email-messages/*` |

Distributions should **reuse** org email/SMS configuration and provider adapters, but fan out asynchronously with persisted notification rows.

---

## 1. Scope

| In scope | Out of scope (v1) |
|----------|-------------------|
| Create distribution (audience + templates + channels) | Edit/delete submitted responses in admin |
| List/view form **responses** (feedback) in admin | |
| Queue/send email and SMS per recipient | Org-wide saved template CRUD |
| Short links for SMS | Click analytics dashboard |
| List distributions (paged, filtered) | |
| List notifications per distribution (paged, filtered) | |
| Retry failed notification(s) | |
| Public resolve short link | |

---

## 2. Authentication & authorization

- **Manage routes:** `Authorization: Bearer <admin JWT>` — same roles as other `/api/manage/*` and `/api/Admin/*` endpoints.
- **Public short-link resolve:** `GET /api/form-builder/short-links/{code}` — **no auth** (code is unguessable; optional expiry).
- **Claims:** persist `CreatedByUserId` from JWT `UserID` / `userId` claim.

Return standard HWSETA errors: `401`, `403`, `400` validation, `404`, `500`.

---

## 3. Domain model (suggested tables)

Names are suggestions; align with existing `HW_*` conventions.

### 3.1 `HW_FormDistribution`

One row per “send form” action from admin.

| Column | Type | Notes |
|--------|------|-------|
| `DistributionID` | `uniqueidentifier` PK | |
| `FormID` | `uniqueidentifier` FK | → form builder form |
| `AudienceType` | `nvarchar(32)` | `all_beneficiaries`, `by_programme`, `external` |
| `ProgrammeID` | `int` null | Required when `by_programme` |
| `Channels` | `nvarchar(50)` | e.g. `email,sms` or JSON array |
| `EmailSubject` | `nvarchar(500)` null | Template with tokens |
| `EmailBody` | `nvarchar(max)` null | |
| `SmsBody` | `nvarchar(500)` null | |
| `Status` | `nvarchar(32)` | See §5.2 |
| `TotalRecipients` | `int` | After expansion |
| `SentCount` | `int` | Denormalized aggregate |
| `FailedCount` | `int` | |
| `PendingCount` | `int` | |
| `CreatedByUserId` | `uniqueidentifier` | |
| `DateCreated` | `datetime2` | UTC |

### 3.2 `HW_FormDistributionNotification`

One row per recipient **per channel** (email and SMS = two rows).

| Column | Type | Notes |
|--------|------|-------|
| `NotificationID` | `uniqueidentifier` PK | |
| `DistributionID` | FK | |
| `RecipientType` | `nvarchar(16)` | `beneficiary`, `external` |
| `BeneficiaryID` | `uniqueidentifier` null | |
| `FullName` | `nvarchar(200)` | |
| `Email` | `nvarchar(320)` null | |
| `Cellphone` | `nvarchar(32)` null | |
| `Channel` | `nvarchar(8)` | `email`, `sms` |
| `Status` | `nvarchar(16)` | §5.3 |
| `RenderedSubject` | `nvarchar(500)` null | After merge |
| `RenderedBody` | `nvarchar(max)` null | |
| `ShortLinkCode` | `nvarchar(16)` null | SMS rows |
| `FormLink` | `nvarchar(2000)` | Full portal URL |
| `ProviderMessageId` | `nvarchar(200)` null | SMTP / WinSMS id |
| `ErrorMessage` | `nvarchar(max)` null | |
| `SentAt` | `datetime2` null | |
| `RetryCount` | `int` default 0 | |
| `DateCreated` | `datetime2` | |

### 3.3 `HW_FormShortLink`

| Column | Type | Notes |
|--------|------|-------|
| `Code` | `nvarchar(16)` PK | e.g. 8-char alphanumeric |
| `FormID` | FK | |
| `TargetUrl` | `nvarchar(2000)` | `{APP_URL}/form/{formId}?d={distributionId}` optional |
| `DistributionID` | FK null | |
| `BeneficiaryID` | FK null | Optional per-recipient tracking |
| `ExpiresAt` | `datetime2` null | |
| `DateCreated` | `datetime2` | |

**Index:** unique on `Code`; index on `DistributionID`.

### 3.4 `HW_FormDistributionExternalRecipient` (optional)

If you prefer not to store externals only inside notifications, snapshot CSV/manual rows on the distribution for audit.

---

## 4. Audience expansion (server-side)

When `POST /distributions` is accepted:

1. Validate `formId` exists and is publishable.
2. Resolve recipient list:

| `audienceType` | Source |
|----------------|--------|
| `all_beneficiaries` | Active beneficiaries with `EmailAddress` and/or `CellNo` (same rules as admin list) |
| `by_programme` | `GET` equivalent of `/api/Admin/programme-enrollments/beneficiaries?programmeId=` |
| `external` | `externalRecipients[]` from request body |

3. For each recipient, for each selected channel, create notification row if contact field present.
4. Set distribution `Status` = `Queued`, enqueue background job.
5. Return `201` with distribution summary + `distributionId`.

**Do not** require the frontend to POST thousands of beneficiary IDs; expansion is **always server-side** for beneficiary audiences.

---

## 5. Status enums

### 5.1 Distribution (`HW_FormDistribution.Status`)

| Value | Meaning |
|-------|---------|
| `Queued` | Accepted, not started |
| `Processing` | Worker sending |
| `Completed` | All notifications terminal (sent/delivered; no pending) |
| `CompletedWithFailures` | Done but some `failed` |
| `Failed` | Fatal error (e.g. invalid form, zero recipients) |

Update aggregates (`SentCount`, `FailedCount`, `PendingCount`) after each notification state change.

### 5.2 Notification (`Status`)

| Value | Meaning |
|-------|---------|
| `pending` | Queued |
| `sent` | Handed to provider |
| `delivered` | Provider confirmed (if available) |
| `failed` | Error; eligible for retry |

---

## 6. Template merge (server)

Merge when creating or sending each notification (not only in UI).

| Token | Source |
|-------|--------|
| `{{formTitle}}` | Form record |
| `{{beneficiaryFirstName}}` | Beneficiary or external `fullName` first token |
| `{{beneficiaryLastName}}` | Beneficiary last name or remainder |
| `{{formLink}}` | `{APP_BASE_URL}/form/{formId}` + optional query `?d={distributionId}&n={notificationId}` |
| `{{shortLink}}` | `{APP_BASE_URL}/s/{code}` from `HW_FormShortLink` |

**SMS:** generate **one short link per notification** (or per beneficiary) so links can be traced and revoked.

**Email:** use full `formLink`; may also include `shortLink`.

Store `RenderedSubject` / `RenderedBody` on the notification row for audit.

---

## 7. HTTP API — Manage (admin)

Base path: `/api/manage/form-builder`

JSON bodies: accept **camelCase**; responses may use camelCase or PascalCase (frontend normalizes both).

### 7.1 List distributions

```
GET /api/manage/form-builder/distributions
```

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Default 1 |
| `pageSize` | int | Default 25, max 500 |
| `formId` | guid | Filter |
| `audienceType` | string | Filter |
| `status` | string | Filter |
| `search` | string | Form title or creator name |
| `createdFrom` | ISO date | |
| `createdTo` | ISO date | |

**Response `200`**

```json
{
  "items": [
    {
      "distributionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "formId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "formTitle": "Learner satisfaction survey",
      "audienceType": "by_programme",
      "programmeId": 12,
      "programmeName": "Retail Learnership 2025",
      "channels": ["email", "sms"],
      "status": "CompletedWithFailures",
      "createdAt": "2026-05-21T10:00:00Z",
      "createdByUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "createdByName": "Admin User",
      "totalRecipients": 120,
      "sentCount": 115,
      "failedCount": 5,
      "pendingCount": 0
    }
  ],
  "page": 1,
  "pageSize": 25,
  "totalCount": 42,
  "totalPages": 2
}
```

---

### 7.2 Create distribution

```
POST /api/manage/form-builder/distributions
```

**Request body**

```json
{
  "formId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "audienceType": "by_programme",
  "programmeId": "12",
  "programmeName": "Retail Learnership 2025",
  "qualificationId": "44",
  "qualificationName": "National Certificate: Wholesale and Retail Operations",
  "channels": ["email", "sms"],
  "emailSubject": "Please complete: {{formTitle}}",
  "emailBody": "Hello {{beneficiaryFirstName}},\n\nComplete your form here:\n{{formLink}}\n",
  "smsBody": "HWSETA: Complete {{formTitle}}: {{shortLink}}",
  "externalRecipients": [],
  "createdByUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

**`externalRecipients`** (required when `audienceType` = `external`)

```json
[
  { "fullName": "Jane Doe", "email": "jane@example.com", "cellphone": "0821234567" },
  { "fullName": "Bob", "email": "bob@example.com", "cellphone": null }
]
```

**Validation**

| Rule | Error |
|------|-------|
| `formId` required | 400 |
| `audienceType` in allowed set | 400 |
| `programmeId` required if `by_programme` | 400 |
| `qualificationId` optional if `by_programme` (omit or null = all qualifications in programme) | |
| `externalRecipients` non-empty if `external` | 400 |
| `channels` non-empty subset of `email`,`sms` | 400 |
| `emailSubject` + `emailBody` if `email` in channels | 400 |
| `smsBody` if `sms` in channels | 400 |
| At least one recipient after expansion | 400 |
| SMS body length after merge ≤ 160 (or provider limit) | 400 |

**Response `201`**

```json
{
  "distributionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "Queued",
  "totalRecipients": 120,
  "pendingCount": 240,
  "sentCount": 0,
  "failedCount": 0
}
```

Note: `pendingCount` may count **notifications** (recipients × channels), not recipients alone. Document which convention you use; frontend expects consistent aggregates.

---

### 7.3 Get distribution

```
GET /api/manage/form-builder/distributions/{distributionId}
```

**Response `200`:** single object (same shape as list item + optional `emailSubject`, `emailBody`, `smsBody` templates).

---

### 7.4 List notifications

```
GET /api/manage/form-builder/distributions/{distributionId}/notifications
```

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | |
| `pageSize` | int | |
| `channel` | `email` \| `sms` | |
| `status` | string | |
| `search` | string | Name, email, phone |
| `sentFrom` | ISO date | |
| `sentTo` | ISO date | |

**Response `200`**

```json
{
  "items": [
    {
      "notificationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "distributionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "recipientType": "beneficiary",
      "beneficiaryId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "fullName": "Thabo Mokoena",
      "email": "thabo@example.com",
      "cellphone": "0821234567",
      "channel": "sms",
      "status": "failed",
      "sentAt": null,
      "errorMessage": "WinSMS: Invalid number",
      "shortLink": "https://portal.example.co.za/s/a1B2c3D4",
      "formLink": "https://portal.example.co.za/form/3fa85f64-5717-4562-b3fc-2c963f66afa6?d=...",
      "providerMessageId": null,
      "retryCount": 1
    }
  ],
  "page": 1,
  "pageSize": 25,
  "totalCount": 240,
  "totalPages": 10
}
```

---

### 7.5 Retry one notification

```
POST /api/manage/form-builder/distributions/{distributionId}/notifications/{notificationId}/retry
```

**Behaviour**

- Allowed only when `status` = `failed`.
- Increment `RetryCount`, set `pending`, re-queue send job.
- **Response `202` or `200`** with updated notification row.

---

### 7.6 Retry all failed

```
POST /api/manage/form-builder/distributions/{distributionId}/notifications/retry-failed
```

**Response `200`**

```json
{
  "queuedCount": 5
}
```

---

### 7.7 Create short link (internal/admin)

```
POST /api/manage/form-builder/short-links
```

**Request**

```json
{
  "formId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "distributionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "beneficiaryId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "notificationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

**Response `201`**

```json
{
  "code": "a1B2c3D4",
  "shortUrl": "https://portal.example.co.za/s/a1B2c3D4",
  "targetUrl": "https://portal.example.co.za/form/3fa85f64-5717-4562-b3fc-2c963f66afa6?d=...&n=..."
}
```

Typically called by the **send worker**, not the admin UI directly.

---

## 8. HTTP API — Public

### 8.1 Resolve short link

```
GET /api/form-builder/short-links/{code}
```

No auth.

**Response `200`**

```json
{
  "code": "a1B2c3D4",
  "targetUrl": "https://portal.example.co.za/form/3fa85f64-5717-4562-b3fc-2c963f66afa6?d=...",
  "formId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "expiresAt": "2027-05-21T00:00:00Z"
}
```

**Errors:** `404` unknown/expired code.

**Next.js:** `app/s/[code]/page.tsx` calls this endpoint and `router.replace(targetUrl)`.

> **Note:** Manage path `GET /api/manage/form-builder/short-links/{code}` may alias the same handler for admin tools; public route is preferred for redirects.

---

## 9. Send worker (background)

Pseudocode:

```
for each notification where status = pending:
  if channel = email:
    send via SMTP settings (communication-settings)
  if channel = sms:
    ensure short link exists
    send via WinSMS
  on success: status = sent, SentAt = utc now, update provider id
  on failure: status = failed, ErrorMessage = ...
update distribution aggregates
if no pending: set distribution Completed or CompletedWithFailures
```

- Use idempotent sends where possible (`NotificationID` as idempotency key).
- Respect rate limits for WinSMS.
- Log failures for admin retry.

---

## 10. Integration with existing endpoints

| Need | Endpoint |
|------|----------|
| Form exists | `GET /api/manage/form-builder/forms/{formId}` |
| Programme beneficiaries | `GET /api/Admin/programme-enrollments/beneficiaries?programmeId=` |
| All beneficiaries | `GET /api/Admin/beneficiaries?pageSize=...` (internal only — prefer DB query in worker) |
| SMTP | `/api/Admin/communication-settings/email` |
| SMS | `/api/Admin/communication-settings/sms` |

---

## 11. Frontend mapping (`hwseta-bm`)

When implemented, wire in:

| Frontend module | Backend |
|-----------------|---------|
| `api/formSubmissions.ts` → `listFormDistributions` | §7.1 |
| `createFormDistribution` | §7.2 |
| `getFormDistribution` | §7.3 |
| `listFormDistributionNotifications` | §7.4 |
| `retryFormDistributionNotification` | §7.5 |
| `retryAllFailedFormDistributionNotifications` | §7.6 |
| `resolveShortLink` (public) | §8.1 |
| `api/formFeedback.ts` → `listFormFeedbackAssignments` | §16.6 |
| `getFormFeedback` | §16.3 |
| `api/beneficiaryFeedbackForms.ts` → `listMyFeedbackForms` | §16.5 |
| `submitPublicForm` (`distributionId`, `notificationId`) | §16.4 |

Normalize PascalCase/camelCase in the API module (same as `api/formBuilder.ts`).

---

## 12. Postman / OpenAPI checklist

- [ ] Collection folder: `Form Builder / Distributions`
- [ ] Environment vars: `baseUrl`, `adminToken`, `appBaseUrl`
- [ ] Examples for all seven manage routes + public resolve
- [ ] Error examples: 400 validation, 404 distribution, 403 non-admin

---

## 13. Implementation phases (backend)

| Phase | Deliverable |
|-------|-------------|
| 1 | Tables + create distribution + expand audience (sync) |
| 2 | Notification rows + background worker + email send |
| 3 | Short links + SMS send + 160-char validation |
| 4 | List/filter/pagination endpoints |
| 5 | Retry endpoints + aggregate updates |
| 6 | Public resolve + optional link expiry |

---

## 14. Versioning

- **v1:** as documented above.
- **v2 (optional):** per-notification signed JWT in `targetUrl`; template library CRUD; webhooks from WinSMS for `delivered`.

---

## 15. Related documents

| Document | Purpose |
|----------|---------|
| [FORM_SUBMISSIONS_FEATURE.md](./FORM_SUBMISSIONS_FEATURE.md) | UI routes, components, QA |
| `api/formBuilder.ts` | Existing form CRUD/submit |
| `docs/admin-email-forward.md` | Email send patterns |

---

## 16. Form responses (Feedback)

Completed public form fills stored for admin review. Linked to distributions/notifications when `notificationId` is sent on submit.

### 16.1 Table `HW_FormBuilderResponse`

| Column | Type | Notes |
|--------|------|-------|
| `ResponseID` | `uniqueidentifier` PK | |
| `FormID` | FK | |
| `DistributionID` | FK null | |
| `NotificationID` | FK null | Unique when set (one response per notification) |
| `RecipientType` | `nvarchar(16)` | `beneficiary`, `external`, or empty → unknown |
| `BeneficiaryID` | `uniqueidentifier` null | |
| `FullName` | `nvarchar(200)` null | |
| `Email` | `nvarchar(320)` null | |
| `Cellphone` | `nvarchar(32)` null | |
| `PayloadJson` | `nvarchar(max)` | Field answers |
| `CreatedByUserId` | `uniqueidentifier` null | Optional logged-in submitter |
| `SubmittedAt` | `datetime2` | UTC |

**On submit:** if `notificationId` is provided, copy recipient from `HW_FormDistributionNotification`. Reject duplicate `notificationId` with `409` or upsert per product rule.

### 16.2 List responses

```
GET /api/manage/form-builder/responses
```

**Query:** `page`, `pageSize`, `formId`, `distributionId`, `recipientType` (`beneficiary` \| `external`), `submittedFrom`, `submittedTo`, `search` (name, email, phone, form title).

**Response `200`:** paged `items` with `responseId`, `formId`, `formTitle`, `distributionId`, `notificationId`, `recipientType`, `beneficiaryId`, `fullName`, `email`, `cellphone`, `submittedAt`, optional `answersSummary`.

### 16.3 Get response detail

```
GET /api/manage/form-builder/responses/{responseId}
```

**Response `200`:** list fields plus `payload`, `settings` (form definition snapshot or live form settings), and/or `answers: [{ fieldId, label, value }]`.

### 16.4 Extended public submit body

`POST /api/form-builder/forms/{formId}/submit`:

```json
{
  "payload": { "field_id": "answer" },
  "createdByUserId": null,
  "distributionId": "optional-guid",
  "notificationId": "optional-guid"
}
```

Validate notification belongs to form (and distribution if both provided). Public form URL: `?d={distributionId}&n={notificationId}`.

### 16.5 Beneficiary feedback-forms (inbox)

```
GET /api/beneficiary/feedback-forms
GET /api/beneficiary/feedback-forms/{responseId}
```

**List query:** `page`, `pageSize`, `completionStatus` (`pending` | `completed`), `search`.

**List item fields:** existing distribution/form fields plus `completionStatus`, `responseId`, `submittedAt`, `deliveryStatus` (optional alias of notification delivery `status`).

One row per recipient per distribution (aggregate email/SMS channels).

**Detail:** same shape as §16.3; JWT beneficiary must own the response.

### 16.6 Admin feedback assignments

```
GET /api/manage/form-builder/feedback-assignments
```

**Query:** `page`, `pageSize`, `formId`, `distributionId`, `recipientType`, `completionStatus`, `submittedFrom`, `submittedTo`, `search`.

**List item:** `assignmentId`, form/distribution/recipient fields, `completionStatus`, `responseId`, `submittedAt`, `sentAt`, `deliveryStatus`, `formLink`, `answersSummary`.

All beneficiaries and external recipients who were sent a form — not only those who submitted.

### 16.7 Notification enrichment (optional)

`GET .../distributions/{distributionId}/notifications` items may include:

- `completionStatus` — `pending` | `completed`
- `responseId` — when completed
- `feedbackSubmittedAt` — when completed
