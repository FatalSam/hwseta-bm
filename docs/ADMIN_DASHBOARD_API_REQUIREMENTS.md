# Admin Dashboard API Requirements

## Overview

This document specifies the API endpoint requirements for the Admin Dashboard feature. The frontend currently uses mock data, but requires a backend API endpoint to provide aggregated system-wide statistics.

## Endpoint Specification

### GET /api/AdminDashboard/GetSystemStats

**Description:** Returns aggregated statistics across all companies, users, questionnaires, documents, workshops, and coaching assignments.

**Authentication:** Required - Admin role only

**Authorization:** User must have admin privileges

**Request:**
```
GET /api/AdminDashboard/GetSystemStats
Headers:
  Authorization: Bearer {token}
```

**Response:**
```json
{
  "companies": {
    "total": 247,
    "active": 198,
    "newThisMonth": 23,
    "averageCompletion": 67.5,
    "byStatus": {
      "Active": 198,
      "Inactive": 32,
      "Pending": 12,
      "Suspended": 5
    }
  },
  "users": {
    "total": 312,
    "active": 267,
    "newThisMonth": 18
  },
  "questionnaires": {
    "total": 189,
    "averageCompletion": 72.3,
    "byStatus": {
      "Completed": 142,
      "Under Review": 28,
      "Submitted": 15,
      "Rejected": 4
    },
    "averageScore": 68.7
  },
  "financial": {
    "totalCostOfFormalisation": 12450000,
    "totalFundingRequested": 45600000,
    "averageCostPerCompany": 50445.18
  },
  "documents": {
    "total": 2847,
    "byCategory": {
      "Financial": 423,
      "Company": 512,
      "Branding": 389,
      "Development": 678,
      "Coaching": 445,
      "Workshops": 400
    },
    "averagePerCompany": 11.5
  },
  "workshops": {
    "total": 892,
    "participationRate": 78.5,
    "averagePerCompany": 3.6
  },
  "coaching": {
    "total": 567,
    "verified": 423,
    "pending": 144,
    "averagePerCompany": 2.3
  },
  "trends": {
    "companyRegistrations": [
      {
        "date": "2024-01-01",
        "count": 38
      },
      {
        "date": "2024-02-01",
        "count": 42
      },
      {
        "date": "2024-03-01",
        "count": 35
      },
      {
        "date": "2024-04-01",
        "count": 45
      },
      {
        "date": "2024-05-01",
        "count": 40
      },
      {
        "date": "2024-06-01",
        "count": 23
      }
    ],
    "gapAnalysisSubmissions": [
      {
        "date": "2024-01-01",
        "count": 28
      },
      {
        "date": "2024-02-01",
        "count": 32
      },
      {
        "date": "2024-03-01",
        "count": 30
      },
      {
        "date": "2024-04-01",
        "count": 35
      },
      {
        "date": "2024-05-01",
        "count": 33
      },
      {
        "date": "2024-06-01",
        "count": 31
      }
    ],
    "costTrends": [
      {
        "date": "2024-01-01",
        "value": 1950
      },
      {
        "date": "2024-02-01",
        "value": 2100
      },
      {
        "date": "2024-03-01",
        "value": 1850
      },
      {
        "date": "2024-04-01",
        "value": 2200
      },
      {
        "date": "2024-05-01",
        "value": 2050
      },
      {
        "date": "2024-06-01",
        "value": 2000
      }
    ],
    "profileCompletionTrends": [
      {
        "date": "2024-01-01",
        "value": 64
      },
      {
        "date": "2024-02-01",
        "value": 66
      },
      {
        "date": "2024-03-01",
        "value": 67
      },
      {
        "date": "2024-04-01",
        "value": 68
      },
      {
        "date": "2024-05-01",
        "value": 67
      },
      {
        "date": "2024-06-01",
        "value": 68
      }
    ]
  }
}
```

## Data Requirements

### Companies Statistics
- **total**: Total number of companies in the system
- **active**: Number of companies with status "Active"
- **newThisMonth**: Number of companies created in the current month
- **averageCompletion**: Average profile completion percentage across all companies
- **byStatus**: Count of companies grouped by status (Active, Inactive, Pending, Suspended, etc.)

### Users Statistics
- **total**: Total number of users in the system
- **active**: Number of active users (users who have logged in within the last 30 days)
- **newThisMonth**: Number of users created in the current month

### Questionnaires (Gap Analysis) Statistics
- **total**: Total number of gap analyses submitted
- **averageCompletion**: Average completion percentage across all gap analyses
- **byStatus**: Count of gap analyses grouped by status (Completed, Under Review, Submitted, Rejected)
- **averageScore**: Average gap analysis score percentage

### Financial Statistics
- **totalCostOfFormalisation**: Sum of all `totalCost` values from completed gap analyses
- **totalFundingRequested**: Sum of all `fundingAmountRequested` values from business development headers
- **averageCostPerCompany**: Average cost of formalisation per company (totalCostOfFormalisation / number of companies with completed gap analyses)

### Documents Statistics
- **total**: Total number of documents uploaded across all companies
- **byCategory**: Count of documents grouped by category:
  - Financial
  - Company
  - Branding
  - Development
  - Coaching
  - Workshops
- **averagePerCompany**: Average number of documents per company

### Workshops Statistics
- **total**: Total number of workshops attended (count of workshop header records)
- **participationRate**: Percentage of companies that have attended at least one workshop
- **averagePerCompany**: Average number of workshops per company

### Coaching Statistics
- **total**: Total number of coaching assignments
- **verified**: Number of coaching assignments that are verified
- **pending**: Number of coaching assignments that are pending verification
- **averagePerCompany**: Average number of coaching assignments per company

### Trends Data
All trend arrays should contain data points for the last 6 months, with one data point per month.

- **companyRegistrations**: Array of monthly company registration counts
  - **date**: First day of the month (YYYY-MM-DD format)
  - **count**: Number of companies registered in that month

- **gapAnalysisSubmissions**: Array of monthly gap analysis submission counts
  - **date**: First day of the month (YYYY-MM-DD format)
  - **count**: Number of gap analyses submitted in that month

- **costTrends**: Array of monthly cost of formalisation totals
  - **date**: First day of the month (YYYY-MM-DD format)
  - **value**: Total cost in thousands (R'000s) - divide by 1000 for display

- **profileCompletionTrends**: Array of monthly average profile completion percentages
  - **date**: First day of the month (YYYY-MM-DD format)
  - **value**: Average profile completion percentage for that month

## Calculation Notes

### Average Profile Completion
Calculate the average of `totalCompletionScore` field from all companies. If `totalCompletionScore` is null or 0, use the `calculateCompanyProfileCompletion` logic (see frontend `lib/utils.ts`).

### Active Users
Users who have logged in within the last 30 days based on last login timestamp or session activity.

### New This Month
Count records where `createdDate` falls within the current calendar month.

### Participation Rate (Workshops)
Calculate as: (Number of companies with at least one workshop) / (Total companies) * 100

### Cost Trends Value
The `value` field in `costTrends` should be in thousands (R'000s) to match the frontend display format. Divide the actual total cost by 1000.

## Error Handling

**401 Unauthorized:** User is not authenticated
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**403 Forbidden:** User does not have admin privileges
```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

**500 Internal Server Error:** Server error occurred
```json
{
  "error": "Internal Server Error",
  "message": "An error occurred while processing the request"
}
```

## Performance Considerations

- This endpoint aggregates data across multiple tables. Consider using database views or materialized views for better performance.
- Consider caching the response for 5 minutes to reduce database load.
- Use efficient SQL queries with proper indexes on:
  - `createdDate` fields
  - `status` fields
  - `companyID` foreign keys
  - `dateSubmitted` fields

## Frontend Integration

Once the API endpoint is implemented, update the following file to use the real API instead of mock data:

**File:** `services/adminDashboardService.ts`

Replace the `getAdminDashboardStats` function with:

```typescript
import apiClient from "@/ultis/apiClient";
import { AdminDashboardStats } from '@/types/admin-dashboard';

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
    const response = await apiClient.get('/api/AdminDashboard/GetSystemStats');
    return response.data as AdminDashboardStats;
};
```

The frontend hook (`hooks/useAdminDashboard.ts`) will automatically use the new API endpoint without any changes needed.

## Testing Recommendations

1. Test with various data scenarios:
   - Empty database
   - Single company/user
   - Large dataset (1000+ companies)
   - Companies with no gap analyses
   - Companies with no documents

2. Verify calculations:
   - Average calculations are correct
   - Trend data includes exactly 6 months
   - Status counts match actual data
   - Financial totals are accurate

3. Performance testing:
   - Response time should be < 2 seconds
   - Test with concurrent requests
   - Monitor database query performance

## Related Database Tables

The endpoint will need to query the following tables:
- `CompanyProfile` / `Companies`
- `Users`
- `SurveyHeader` / `Questionnaire`
- `CompanyFinancialInformationHeader2`
- `CompanyBusinessDevelopmentHeader2`
- `CompanyDocuments2`
- `CompanyBrandingDocuments2`
- `CompanyFinancialInformationDocuments2`
- `CompanyBusinessDevelopment2`
- `CompanyBusinessWorkshopsHeader2`
- `CompanyBusinessCoachingHeader2`

## Additional Notes

- All monetary values should be in South African Rand (ZAR)
- All percentages should be rounded to 1 decimal place
- All dates should be in ISO 8601 format (YYYY-MM-DD)
- Trend data should always include 6 months, even if some months have 0 values

