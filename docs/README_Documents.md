# Documents API – Frontend Integration (React)

Base URL (dev): `http://localhost:5174`

## Categories
String enum values: `Branding`, `Company`, `Financial`, `Workshops`, `Coaching`, `Development`, `Other`.

## Allowed file types
- image/png, image/jpeg
- application/pdf
- text/plain
- application/msword (doc)
- application/vnd.openxmlformats-officedocument.wordprocessingml.document (docx)

Max file size: 25 MB.

## Environment
Create `.env`:
```
REACT_APP_API_BASE=http://localhost:5174
```

## TypeScript helpers
```ts
export type DocumentCategory =
  | "Branding" | "Company" | "Financial" | "Workshops" | "Coaching" | "Development" | "Other";

export type DocumentMeta = {
  documentId: string;
  companyId: number;
  createdByUserId: number;
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  isDeleted: boolean;
};

const API_BASE = process.env.REACT_APP_API_BASE ?? "http://localhost:5174";
```

## Upload document
Endpoint: `POST /api/documents/company/{companyId}/category/{category}/sub/{subCategory}/upload?userId=...&fileName=...&mimeType=...[&moduleNumber=...]`

```ts
export async function uploadDocument(params: {
  companyId: number;
  category: DocumentCategory;
  subCategory: string;
  userId: number;
  file: File;
  moduleNumber?: number;
}) {
  const { companyId, category, subCategory, userId, file, moduleNumber } = params;

  const form = new FormData();
  form.append("file", file);

  const url = new URL(`${API_BASE}/api/documents/company/${companyId}/category/${category}/sub/${subCategory}/upload`);
  url.searchParams.set("userId", String(userId));
  url.searchParams.set("fileName", file.name);
  url.searchParams.set("mimeType", file.type);
  if (moduleNumber != null) url.searchParams.set("moduleNumber", String(moduleNumber));

  const res = await fetch(url.toString(), {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json() as Promise<{ id: string; fileName: string; mimeType: string; sizeBytes: number; category: string; companyId: number; }>;
}
```

## List documents by company and category (and subcategory)
Endpoint: `GET /api/documents/company/{companyId}/category/{category}?skip=0&take=50[&subCategory=...][&moduleNumber=...]`
Also available with subcategory in the path: `GET /api/documents/company/{companyId}/category/{category}/sub/{subCategory}?skip=0&take=50[&moduleNumber=...]`

```ts
export async function listDocuments(companyId: number, category: DocumentCategory, subCategory?: string, moduleNumber?: number, skip = 0, take = 50) {
  const url = new URL(`${API_BASE}/api/documents/company/${companyId}/category/${category}`);
  if (subCategory) url.searchParams.set("subCategory", subCategory);
  if (moduleNumber != null) url.searchParams.set("moduleNumber", String(moduleNumber));
  url.searchParams.set("skip", String(skip));
  url.searchParams.set("take", String(take));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  return res.json() as Promise<DocumentMeta[]>;
}
```

## Download/preview a document
Endpoint: `GET /api/documents/{id}?content=true`

```ts
export async function downloadDocument(id: string) {
  const res = await fetch(`${API_BASE}/api/documents/${id}?content=true`);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return url; // Attach to <a href={url} download> or open in new tab
}
```

## Delete a document
Endpoint: `DELETE /api/documents/{id}`

```ts
export async function deleteDocument(id: string) {
  const res = await fetch(`${API_BASE}/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);
}
```

## Update metadata
Endpoint: `PUT /api/documents/{id}/metadata`

```ts
export async function updateDocumentMetadata(id: string, body: { fileName?: string; category?: DocumentCategory }) {
  const res = await fetch(`${API_BASE}/api/documents/${id}/metadata`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 204) throw new Error(`Update failed: ${res.status}`);
}
```

## Notes
- Ensure selected file `type` is one of the allowed MIME types above.
- Server enforces 25 MB limit and validates mime type.
- Auth: currently passing `userId` as query param; switch to tokens when middleware is in place.
- DB: stored procedures `M_*Document*.sql` are required. Run the scripts in `M_myBeneficiaryAPI/SQL/` before using.
