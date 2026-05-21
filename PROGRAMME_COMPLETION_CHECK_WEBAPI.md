# Programme Completion Check WebAPI Notes

This note documents the backend work required for the new Programme Completion Check section on beneficiary programme links.

The database scripts have already been run manually.

## Scope

This applies only to:

- `GET /api/beneficiary/profile/programme-links`
- `POST /api/beneficiary/profile/programme-links`
- `PUT /api/beneficiary/profile/programme-links/{id}`
- `POST /api/beneficiary/profile/programme-links/{programmeLinkId}/documents`
- `GET /api/beneficiary/profile/programme-links/{programmeLinkId}/documents`
- `DELETE /api/beneficiary/profile/programme-links/documents/{documentId}`
- `PATCH /api/beneficiary/profile/programme-links/documents/{documentId}` (JSON `documentTitle`, optional `null` to clear)
- `PUT /api/beneficiary/profile/programme-links/documents/{documentId}/replace` (multipart: `file`, optional `documentTitle`)
- `GET /api/beneficiary/profile/programme-completion-statuses`
- `GET /api/beneficiary/profile/programme-completion-status-reasons?programmeCompletionStatusId={id}`

## Database Objects Already Added

The implementation assumes the following are now in place:

- `HW_ProgrammeCompletionStatus`
- `HW_ProgrammeCompletionStatusReasons`
- `HW_BeneficiaryProgrammeLinksDocuments`
- `HW_BeneficiaryProgrammeLinks.ProgrammeCompletionStatusID`
- `HW_BeneficiaryProgrammeLinks.CompletionReasonID`
- `HW_BeneficiaryProgrammeLinks.OtherReasonText`

## Frontend Behaviour To Support

The Programme Completion Check UI now uses a completion status dropdown with these values:

- `Completed`
- `In Progress`
- `Not Completed`
- `Withdrawn`
- `Dropped Out`

Rules:

- If status is `Completed`
  - show upload proof of evidence
- If status is `In Progress`
  - show nothing extra
- If status is `Not Completed`, `Withdrawn`, or `Dropped Out`
  - show reason dropdown
- If selected reason is `Other`
  - show `OtherReasonText`

## Recommended DTO Fields

Use these fields on the programme link response model:

```json
{
  "beneficiaryProgrammeLinkId": 123,
  "programmeId": 10,
  "programmeName": "Learnership X",
  "qualificationId": 5,
  "qualificationName": "Qualification X",
  "customQualificationName": null,
  "startDate": "2026-04-01T00:00:00",
  "endDate": "2026-10-01T00:00:00",
  "trainingProviderId": 2,
  "trainingProviderName": null,
  "employerId": 9,
  "employerName": null,
  "notes": "optional",
  "programmeCompletionStatusId": 1,
  "programmeCompletionStatus": "Completed",
  "completionReasonId": null,
  "completionReasonDescription": null,
  "otherReasonText": null,
  "documents": [
    {
      "beneficiaryProgrammeLinkDocumentId": 1,
      "originalFileName": "certificate.pdf",
      "storedFileName": "a1b2c3-certificate.pdf",
      "contentType": "application/pdf",
      "fileExtension": ".pdf",
      "fileSizeBytes": 250000,
      "storagePath": "/uploads/programme-links/a1b2c3-certificate.pdf",
      "fileUrl": "/uploads/programme-links/a1b2c3-certificate.pdf",
      "isActive": true,
      "dateCreated": "2026-04-08T12:30:00"
    }
  ]
}
```

Use these fields on create and update:

```json
{
  "programmeId": 10,
  "programmeName": null,
  "qualificationId": 5,
  "customQualificationName": null,
  "startDate": "2026-04-01T00:00:00",
  "endDate": "2026-10-01T00:00:00",
  "trainingProviderId": 2,
  "trainingProviderName": null,
  "employerId": 9,
  "employerName": null,
  "notes": "optional",
  "programmeCompletionStatusId": 1,
  "completionReasonId": null,
  "otherReasonText": null
}
```

## Lookup Endpoint Responses

### `GET /api/beneficiary/profile/programme-completion-statuses`

```json
[
  {
    "programmeCompletionStatusId": 1,
    "programmeCompletionStatus": "Completed",
    "isActive": true
  },
  {
    "programmeCompletionStatusId": 2,
    "programmeCompletionStatus": "In Progress",
    "isActive": true
  }
]
```

### `GET /api/beneficiary/profile/programme-completion-status-reasons?programmeCompletionStatusId={id}`

```json
[
  {
    "completionReasonId": 1,
    "programmeCompletionStatusId": 3,
    "completionReasonDescription": "Failed assessments",
    "isActive": true
  }
]
```

## Validation Rules

Apply these rules in create and update.

### General

- `ProgrammeCompletionStatusID` is required
- trim all incoming strings
- `OtherReasonText` max length is `500`

### If status is `Completed`

- `CompletionReasonID` must be `NULL`
- `OtherReasonText` must be `NULL`
- documents are allowed

### If status is `In Progress`

- `CompletionReasonID` must be `NULL`
- `OtherReasonText` must be `NULL`
- no extra validation

### If status is `Not Completed`, `Withdrawn`, or `Dropped Out`

- `CompletionReasonID` is required
- the selected reason must belong to the selected status
- if selected reason is not `Other`, then `OtherReasonText = NULL`
- if selected reason is `Other`, then `OtherReasonText` is required

### Invalid combinations

Return `400 BadRequest` for:

- missing status
- missing reason when reason is required
- reason does not belong to selected status
- `OtherReasonText` supplied for a non-`Other` reason
- missing `OtherReasonText` when reason is `Other`

## Recommended Backend Logic

Pseudo flow:

1. Validate programme link base fields as normal.
2. Load `HW_ProgrammeCompletionStatus` for the incoming `ProgrammeCompletionStatusID`.
3. If `CompletionReasonID` is supplied, load `HW_ProgrammeCompletionStatusReasons`.
4. Confirm the reason belongs to the selected status.
5. Apply status-specific validation rules.
6. Save to `HW_BeneficiaryProgrammeLinks`.

Pseudo example:

```csharp
var status = await db.HW_ProgrammeCompletionStatus
    .FirstOrDefaultAsync(x => x.ProgrammeCompletionStatusID == request.ProgrammeCompletionStatusID && x.IsActive);

if (status == null)
{
    return BadRequest("Invalid programme completion status.");
}

HW_ProgrammeCompletionStatusReasons? reason = null;

if (request.CompletionReasonID.HasValue)
{
    reason = await db.HW_ProgrammeCompletionStatusReasons
        .FirstOrDefaultAsync(x => x.CompletionReasonID == request.CompletionReasonID.Value && x.IsActive);

    if (reason == null)
    {
        return BadRequest("Invalid completion reason.");
    }

    if (reason.ProgrammeCompletionStatusID != request.ProgrammeCompletionStatusID)
    {
        return BadRequest("Completion reason does not belong to the selected status.");
    }
}

request.OtherReasonText = string.IsNullOrWhiteSpace(request.OtherReasonText)
    ? null
    : request.OtherReasonText.Trim();

switch (status.ProgrammeCompletionStatus)
{
    case "Completed":
    case "In Progress":
        request.CompletionReasonID = null;
        request.OtherReasonText = null;
        break;

    case "Not Completed":
    case "Withdrawn":
    case "Dropped Out":
        if (!request.CompletionReasonID.HasValue)
        {
            return BadRequest("Completion reason is required for the selected status.");
        }

        if (reason?.CompletionReasonDescription == "Other")
        {
            if (string.IsNullOrWhiteSpace(request.OtherReasonText))
            {
                return BadRequest("Other reason text is required when 'Other' is selected.");
            }
        }
        else
        {
            request.OtherReasonText = null;
        }
        break;

    default:
        return BadRequest("Unsupported programme completion status.");
}
```

## Save Mapping

Map these fields into `HW_BeneficiaryProgrammeLinks`:

- `ProgrammeCompletionStatusID`
- `CompletionReasonID`
- `OtherReasonText`

Recommended read mapping:

- join `HW_ProgrammeCompletionStatus`
- join `HW_ProgrammeCompletionStatusReasons`
- left join documents from `HW_BeneficiaryProgrammeLinksDocuments`

## Document Endpoints

Use separate document endpoints instead of putting file bytes into the normal programme-link JSON save payload.

### `POST /api/beneficiary/profile/programme-links/{programmeLinkId}/documents`

- request type: `multipart/form-data`
- field name: `files`
- allow multiple files
- validate programme link exists
- validate file count, size, and extensions according to your server policy
- save one row per file to `HW_BeneficiaryProgrammeLinksDocuments`

Suggested stored metadata:

- `BeneficiaryProgrammeLinkID`
- `OriginalFileName`
- `StoredFileName`
- `ContentType`
- `FileExtension`
- `FileSizeBytes`
- `StoragePath` or `FileUrl` or `FileContent`
- `CreatedBy`

### `GET /api/beneficiary/profile/programme-links/{programmeLinkId}/documents`

Return only active documents for the programme link.

### `DELETE /api/beneficiary/profile/programme-links/documents/{documentId}`

Recommended:

- soft delete by setting `IsActive = 0`
- or hard delete only if that is already your standard

## Expected Frontend Mapping Later

When the frontend is wired to the live endpoints, the current UI will map like this:

- `completedProgramme` -> `programmeCompletionStatusId` and `programmeCompletionStatus`
- `incompleteReason` -> `completionReasonId` and `completionReasonDescription`
- `otherReasonText` -> `otherReasonText`
- `proofFiles` -> upload through the documents endpoint after the programme link row has been saved

## Recommended Implementation Order

1. Update programme link DTOs and entities
2. Add lookup endpoints for statuses and reasons
3. Add create and update validation rules
4. Update list endpoint to return status, reason, other text, and document metadata
5. Add document upload/list/delete endpoints
6. Test these scenarios:
   - `Completed` with documents
   - `In Progress` with no reason
   - `Not Completed` with valid reason
   - `Withdrawn` with `Other` plus `OtherReasonText`
   - invalid reason/status combination
   - invalid `OtherReasonText` combinations

