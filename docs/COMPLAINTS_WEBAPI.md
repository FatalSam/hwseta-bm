# Beneficiary Complaints — WebAPI & Database Notes

Starter specification for implementing **beneficiary complaints** on the HWSETA API. Aligns with the Next.js form at `/dashboard/beneficiary/complaints` (training provider / employer from programme links, consent, complaint type, etc.).

This file is a **blueprint**: adjust table/column names to match your existing naming standards and JWT/user tables before running scripts.

---

## 1. Scope

| Area | Detail |
|------|--------|
| **Actors** | Authenticated users with role **Beneficiary** only (same as profile/programme links). |
| **Reads** | List own complaints; optional single complaint by id (ownership enforced). |
| **Writes** | Create complaint; optional status updates by **admin** (out of scope here unless you add roles). |
| **Lookups** | Complaint lifecycle status (`Open`, `Closed`, …); **who the complaint is against** (Employer, Training Provider, or Both). |

---

## 2. Domain model

### 2.1 `HW_ComplaintsStatus` (lookup)

Rows describe **workflow status** for a complaint (not the same as “complaint type” on the form, e.g. Service Delay).

Suggested seed values:

| `ComplaintsStatusID` | `Code` | `Description` | `SortOrder` | `IsActive` |
|----------------------|--------|---------------|-------------|------------|
| 1 | `Open` | Open | 10 | 1 |
| 2 | `InReview` | In review | 20 | 1 |
| 3 | `AwaitingInfo` | Awaiting information | 30 | 1 |
| 4 | `Resolved` | Resolved | 40 | 1 |
| 5 | `Closed` | Closed | 50 | 1 |
| 6 | `Withdrawn` | Withdrawn by beneficiary | 60 | 1 |

You can merge `Resolved` and `Closed` if your process uses a single terminal state.

### 2.2 `HW_ComplaintAgainstType` (lookup)

Tracks whether the complaint is **against the training provider, the employer, or both** (required for reporting and validation).

| `ComplaintAgainstTypeID` | `Code` | `Description` | `SortOrder` |
|--------------------------|--------|---------------|-------------|
| 1 | `TrainingProvider` | Training provider only | 10 |
| 2 | `Employer` | Employer only | 20 |
| 3 | `Both` | Training provider and employer | 30 |

**Validation rule (API):**

- `TrainingProvider` → `TrainingProviderID` required; `EmployerID` null.
- `Employer` → `EmployerID` required; `TrainingProviderID` null.
- `Both` → both IDs required.

This matches a form that allows selecting one or both parties but makes the **intent explicit** in the payload (frontend can derive `complaintAgainstType` from which dropdowns are filled, or expose a small radio group).

### 2.3 `HW_BeneficiaryComplaint` (fact)

One row per complaint submission, linked to the beneficiary and optional TP/employer IDs (same identifiers as programme links / profile).

---

## 3. SQL scripts (SQL Server)

> **Before running:** replace `dbo` schema if needed; align `BeneficiaryUserID` with your users table (e.g. `AspNetUsers.Id` or `HW_Beneficiaries.BeneficiaryID`). Foreign keys below are **optional** until master data tables exist—comment them out if `TrainingProvider` / `Employer` live in different DBs.

### 3.1 Lookup: complaint status

```sql
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.HW_ComplaintsStatus', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.HW_ComplaintsStatus
  (
    ComplaintsStatusID   INT            NOT NULL IDENTITY(1, 1),
    Code                 NVARCHAR(32)   NOT NULL,
    Description          NVARCHAR(200)  NOT NULL,
    SortOrder            INT            NOT NULL CONSTRAINT DF_HW_ComplaintsStatus_SortOrder DEFAULT (0),
    IsActive             BIT            NOT NULL CONSTRAINT DF_HW_ComplaintsStatus_IsActive DEFAULT (1),
    DateCreated          DATETIME2(0)   NOT NULL CONSTRAINT DF_HW_ComplaintsStatus_DateCreated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_HW_ComplaintsStatus PRIMARY KEY CLUSTERED (ComplaintsStatusID),
    CONSTRAINT UQ_HW_ComplaintsStatus_Code UNIQUE (Code)
  );
END
GO

-- Seed (idempotent by Code)
MERGE dbo.HW_ComplaintsStatus AS tgt
USING (VALUES
  (N'Open',           N'Open',                     10),
  (N'InReview',       N'In review',                20),
  (N'AwaitingInfo',   N'Awaiting information',     30),
  (N'Resolved',       N'Resolved',                 40),
  (N'Closed',         N'Closed',                   50),
  (N'Withdrawn',      N'Withdrawn by beneficiary', 60)
) AS src(Code, Description, SortOrder)
ON tgt.Code = src.Code
WHEN NOT MATCHED THEN
  INSERT (Code, Description, SortOrder, IsActive)
  VALUES (src.Code, src.Description, src.SortOrder, 1);
GO
```

### 3.2 Lookup: complaint against (TP / Employer / Both)

```sql
IF OBJECT_ID(N'dbo.HW_ComplaintAgainstType', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.HW_ComplaintAgainstType
  (
    ComplaintAgainstTypeID INT           NOT NULL IDENTITY(1, 1),
    Code                   NVARCHAR(32)  NOT NULL,
    Description            NVARCHAR(200) NOT NULL,
    SortOrder              INT           NOT NULL CONSTRAINT DF_HW_ComplaintAgainstType_SortOrder DEFAULT (0),
    IsActive               BIT           NOT NULL CONSTRAINT DF_HW_ComplaintAgainstType_IsActive DEFAULT (1),
    DateCreated            DATETIME2(0)  NOT NULL CONSTRAINT DF_HW_ComplaintAgainstType_DateCreated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_HW_ComplaintAgainstType PRIMARY KEY CLUSTERED (ComplaintAgainstTypeID),
    CONSTRAINT UQ_HW_ComplaintAgainstType_Code UNIQUE (Code)
  );
END
GO

MERGE dbo.HW_ComplaintAgainstType AS tgt
USING (VALUES
  (N'TrainingProvider', N'Training provider only',               10),
  (N'Employer',         N'Employer only',                        20),
  (N'Both',             N'Training provider and employer',       30)
) AS src(Code, Description, SortOrder)
ON tgt.Code = src.Code
WHEN NOT MATCHED THEN
  INSERT (Code, Description, SortOrder, IsActive)
  VALUES (src.Code, src.Description, src.SortOrder, 1);
GO
```

### 3.3 Main table: beneficiary complaints

```sql
IF OBJECT_ID(N'dbo.HW_BeneficiaryComplaint', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.HW_BeneficiaryComplaint
  (
    BeneficiaryComplaintID   BIGINT         NOT NULL IDENTITY(1, 1),
    BeneficiaryUserID        NVARCHAR(450)  NOT NULL,  -- or INT — match your user PK type

    ComplaintsStatusID       INT            NOT NULL,
    ComplaintAgainstTypeID   INT            NOT NULL,

    TrainingProviderID       INT            NULL,
    EmployerID               INT            NULL,

    -- Complainant snapshot (from profile at submit time)
    FullName                 NVARCHAR(200)  NOT NULL,
    IdNumber                 NVARCHAR(50)   NULL,
    ContactNumber            NVARCHAR(40)   NOT NULL,
    EmailAddress             NVARCHAR(256)  NULL,

    PreferredContactMethod   NVARCHAR(200)  NULL,  -- e.g. "Phone,Email" or JSON; see API notes

    IncidentLocation         NVARCHAR(500)  NULL,
    ComplaintType            NVARCHAR(100)  NOT NULL,  -- matches UI: Service Delay, Other, ...
    StaffMemberName          NVARCHAR(200)  NOT NULL,
    IncidentDate             DATE           NULL,
    Description              NVARCHAR(MAX)  NOT NULL,
    ConsentAcknowledged      BIT            NOT NULL CONSTRAINT DF_HW_BeneficiaryComplaint_Consent DEFAULT (0),

    -- Optional denormalized addresses at submit (if you capture them from lookups)
    TrainingProviderAddress  NVARCHAR(1000) NULL,
    EmployerAddress          NVARCHAR(1000) NULL,

    DateCreated              DATETIME2(0)   NOT NULL CONSTRAINT DF_HW_BeneficiaryComplaint_DateCreated DEFAULT (SYSUTCDATETIME()),
    DateModified             DATETIME2(0)   NULL,
    CreatedByUserID          NVARCHAR(450)  NULL,
    ModifiedByUserID         NVARCHAR(450)  NULL,
    IsActive                 BIT            NOT NULL CONSTRAINT DF_HW_BeneficiaryComplaint_IsActive DEFAULT (1),

    CONSTRAINT PK_HW_BeneficiaryComplaint PRIMARY KEY CLUSTERED (BeneficiaryComplaintID),
    CONSTRAINT FK_HW_BeneficiaryComplaint_Status
      FOREIGN KEY (ComplaintsStatusID) REFERENCES dbo.HW_ComplaintsStatus (ComplaintsStatusID),
    CONSTRAINT FK_HW_BeneficiaryComplaint_AgainstType
      FOREIGN KEY (ComplaintAgainstTypeID) REFERENCES dbo.HW_ComplaintAgainstType (ComplaintAgainstTypeID)
    -- Optional FKs to master TrainingProvider / Employer when available:
    -- , CONSTRAINT FK_HW_BeneficiaryComplaint_TP FOREIGN KEY (TrainingProviderID) REFERENCES dbo.HW_TrainingProvider (TrainingProviderID)
    -- , CONSTRAINT FK_HW_BeneficiaryComplaint_Emp FOREIGN KEY (EmployerID) REFERENCES dbo.HW_Employer (EmployerID)
  );

  CREATE INDEX IX_HW_BeneficiaryComplaint_User ON dbo.HW_BeneficiaryComplaint (BeneficiaryUserID, DateCreated DESC);
  CREATE INDEX IX_HW_BeneficiaryComplaint_Status ON dbo.HW_BeneficiaryComplaint (ComplaintsStatusID);
END
GO

-- Default new complaints to Open
ALTER TABLE dbo.HW_BeneficiaryComplaint
  ADD CONSTRAINT DF_HW_BeneficiaryComplaint_DefaultStatus
  DEFAULT (1) FOR ComplaintsStatusID;  -- only if Open = 1 in your seed; adjust or remove if you prefer explicit INSERT
GO
```

> **Note:** If you already created the table without the default, add the default via a separate `ALTER` or set `ComplaintsStatusID` explicitly on insert. The `DEFAULT (1)` assumes `Open` seeds as ID 1; verify after seeding.

### 3.4 Optional: check constraint for TP/Employer vs against-type

```sql
ALTER TABLE dbo.HW_BeneficiaryComplaint
  DROP CONSTRAINT IF EXISTS CK_HW_BeneficiaryComplaint_Parties;
GO

ALTER TABLE dbo.HW_BeneficiaryComplaint
  ADD CONSTRAINT CK_HW_BeneficiaryComplaint_Parties CHECK (
    (ComplaintAgainstTypeID = 1 AND TrainingProviderID IS NOT NULL AND EmployerID IS NULL)
    OR (ComplaintAgainstTypeID = 2 AND EmployerID IS NOT NULL AND TrainingProviderID IS NULL)
    OR (ComplaintAgainstTypeID = 3 AND TrainingProviderID IS NOT NULL AND EmployerID IS NOT NULL)
  );
GO
```

Adjust `1/2/3` if your seed IDs differ.

---

## 4. API surface (suggested)

Base path pattern (mirror programme links): **`/api/beneficiary/complaints`**. All endpoints require **Bearer JWT**; resolve `BeneficiaryUserID` from claims and enforce it on every query/command.

### 4.1 Lookups

#### `GET /api/beneficiary/complaints/lookups`

Returns statuses and against-types for dropdowns (or split into two routes if you prefer `Dropdowns` style).

**Response (example)**

```json
{
  "complaintsStatuses": [
    { "complaintsStatusId": 1, "code": "Open", "description": "Open", "sortOrder": 10 },
    { "complaintsStatusId": 5, "code": "Closed", "description": "Closed", "sortOrder": 50 }
  ],
  "complaintAgainstTypes": [
    { "complaintAgainstTypeId": 1, "code": "TrainingProvider", "description": "Training provider only", "sortOrder": 10 },
    { "complaintAgainstTypeId": 2, "code": "Employer", "description": "Employer only", "sortOrder": 20 },
    { "complaintAgainstTypeId": 3, "code": "Both", "description": "Training provider and employer", "sortOrder": 30 }
  ]
}
```

Beneficiaries typically **do not** choose status on create; server sets `Open`. Expose statuses for **read-only** display on detail/list, unless you allow “Withdrawn” via `PATCH`.

---

### 4.2 Create complaint

#### `POST /api/beneficiary/complaints`

**Request body** (align with current UI + explicit against type)

```json
{
  "complaintAgainstTypeId": 3,
  "trainingProviderId": 2,
  "employerId": 9,
  "fullName": "Jane Doe",
  "idNumber": "8001015009087",
  "contactNumber": "0821234567",
  "emailAddress": "jane@example.com",
  "preferredContactMethod": ["Phone", "Email"],
  "incidentLocation": "Johannesburg training centre",
  "complaintType": "Service Delay",
  "staffMemberName": "A. N. Other",
  "incidentDate": "2026-04-10",
  "description": "Detailed description of the issue...",
  "consent": true,
  "trainingProviderAddress": "optional snapshot",
  "employerAddress": "optional snapshot"
}
```

**Rules**

- `consent` must be `true`.
- Validate `complaintAgainstTypeId` and party IDs per §2.2.
- Optionally verify `trainingProviderId` / `employerId` exist on one of the caller’s **programme links** (`HW_BeneficiaryProgrammeLinks` or equivalent) to prevent arbitrary IDs.
- Set `ComplaintsStatusID` = `Open` (or your default) server-side; ignore any client-sent status.

**Response** `201 Created`

```json
{
  "beneficiaryComplaintId": 1001,
  "complaintsStatusId": 1,
  "complaintsStatus": "Open",
  "complaintAgainstTypeId": 3,
  "complaintAgainstType": "Both",
  "dateCreated": "2026-04-16T12:00:00Z"
}
```

---

### 4.3 List my complaints

#### `GET /api/beneficiary/complaints?page=1&pageSize=20`

Filter always by authenticated beneficiary. Include status and against-type labels.

**Response (example)**

```json
{
  "items": [
    {
      "beneficiaryComplaintId": 1001,
      "complaintsStatusId": 1,
      "complaintsStatus": "Open",
      "complaintAgainstTypeId": 3,
      "complaintAgainstType": "Both",
      "complaintType": "Service Delay",
      "incidentDate": "2026-04-10",
      "trainingProviderId": 2,
      "employerId": 9,
      "dateCreated": "2026-04-16T12:00:00Z"
    }
  ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 20
}
```

---

### 4.4 Get one complaint (detail)

#### `GET /api/beneficiary/complaints/{id}`

Return full row only if `BeneficiaryUserID` matches JWT. Use for a future “track my complaint” screen.

---

### 4.5 Optional: withdraw (beneficiary)

#### `PATCH /api/beneficiary/complaints/{id}/withdraw`

Sets status to `Withdrawn` only if current status is `Open` or `AwaitingInfo` (policy as you prefer).

---

## 5. Mapping from current Next.js form

| UI / form field | API / column |
|-----------------|--------------|
| At least one of TP / Employer | `complaintAgainstTypeId` + `trainingProviderId` / `employerId` |
| Full name, ID, contact, email | `fullName`, `idNumber`, `contactNumber`, `emailAddress` |
| Preferred contact (Phone / Email) | `preferredContactMethod` array → store as CSV or JSON |
| Incident location, type, staff, date, description | matching fields |
| Consent checkbox | `consent` → `ConsentAcknowledged` |

Derive `complaintAgainstTypeId` on the client as:

- only TP selected → `1`
- only Employer → `2`
- both → `3`

---

## 6. Admin / staff (later)

- Separate controllers or policies for staff to list all complaints, filter by status, assign, and transition statuses.
- Consider `HW_BeneficiaryComplaintNote` or audit log table for internal comments without exposing to beneficiary.

---

## 7. Checklist before go-live

- [ ] User PK type and column name aligned (`BeneficiaryUserID`).
- [ ] FKs to training provider / employer tables added or deliberately omitted.
- [ ] Check constraint IDs match seeded `HW_ComplaintAgainstType` IDs.
- [ ] Programme-link validation (optional but recommended).
- [ ] Rate limiting / abuse controls on `POST` if public-facing.

---

*Document version: starter for implementation — adjust naming and endpoints to match your existing HWSETA API conventions.*
