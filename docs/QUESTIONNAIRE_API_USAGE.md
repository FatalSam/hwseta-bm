# Questionnaire API Usage Guide

This document provides a comprehensive guide for using the Questionnaire API endpoints and components in the HWSETABeneficiaryHub application.

## API Endpoints

### 1. Get All Questionnaires
**Endpoint:** `GET /api/Questionnaire/GetAllQuestionnaires`

**Description:** Retrieves all available questionnaire questions organized by sections and subsections.

**Response Structure:**
```typescript
interface QuestionnaireQuestion {
    categoryQuestionID: number;
    sectionID: number;
    subsectionID: number;
    questionCode: string;
    questionText: string;
    sectionName: string;
    subsectionName: string;
    costItemID: number;
    costItem: string | null;
    costPrice: number;
    importance: string | null;
    resources: string | null;
    sectionDescription: string;
}
```

**Example Response:**
```json
[
  {
    "categoryQuestionID": 1,
    "sectionID": 1,
    "subsectionID": 1,
    "questionCode": "1.1.1",
    "questionText": "Do you have a clear and well-documented business plan?",
    "sectionName": "Funding Ready",
    "subsectionName": "Business Plan",
    "costItemID": 0,
    "costItem": null,
    "costPrice": 0,
    "importance": null,
    "resources": null,
    "sectionDescription": "It is crucial for a business to present a compelling case for funding..."
  }
]
```

### 2. Get Questionnaire by Company ID
**Endpoint:** `GET /api/Questionnaire/GetQuestionnaireByCompanyID/{companyId}`

**Description:** Retrieves a specific company's questionnaire responses.

**Response:** Returns a `Questionnaire` object with the company's answers.

### 3. Save Questionnaire and Get Cost Items
**Endpoint:** `POST /api/Questionnaire/SaveQuestionnaireAndGetCostItems`

**Description:** Saves a questionnaire and returns associated cost items.

**Request Body:**
```typescript
interface SaveQuestionnaireRequest {
    companyID: string;
    userID: string;
    answers: Array<{
        questionCode: string;
        answer: boolean;
    }>;
}
```

**Example Request:**
```json
{
  "companyID": "ae42b367-eca5-4dd8-99af-7610bf23f16b",
  "userID": "testuser",
  "answers": [
    {
      "questionCode": "1.1.1",
      "answer": true
    },
    {
      "questionCode": "1.1.2",
      "answer": false
    }
  ]
}
```

**Response:** `QuestionnaireWithCostItems` object

### 4. Update Questionnaire
**Endpoint:** `PUT /api/Questionnaire/UpdateQuestionnaire/{questionnaireId}`

**Description:** Updates an existing questionnaire.

**Request Body:** `Questionnaire` object
**Response:** Updated `Questionnaire` object

### 5. Delete Questionnaire
**Endpoint:** `DELETE /api/Questionnaire/DeleteQuestionnaire/{questionnaireId}`

**Description:** Deletes a questionnaire.

**Query Parameters:** `lastModifiedUserID` (string)

## TypeScript Types

### Core Types
```typescript
// Individual question from the API
interface QuestionnaireQuestion {
    categoryQuestionID: number;
    sectionID: number;
    subsectionID: number;
    questionCode: string;
    questionText: string;
    sectionName: string;
    subsectionName: string;
    costItemID: number;
    costItem: string | null;
    costPrice: number;
    importance: string | null;
    resources: string | null;
    sectionDescription: string;
}

// User's response to a question (Yes/No)
interface QuestionnaireResponse {
    questionID: number;
    answer: string; // "Yes" or "No"
    questionCode: string;
    questionText: string;
}

// API request format for saving questionnaire
interface SaveQuestionnaireRequest {
    companyID: string;
    userID: string;
    answers: Array<{
        questionCode: string;
        answer: boolean;
    }>;
}

// Company's questionnaire responses
interface Questionnaire {
    questionnaireID: string;
    companyID: string;
    question1: string;
    question2: string;
    question3: string;
    question4: string;
    question5: string;
    question6: string;
    question7: string;
    question8: string;
    question9: string;
    question10: string;
    totalCompletionScore: number;
    createdDate: string;
    modifiedDate: string;
    createdbyUserID: string;
    lastModifiedUserID: string;
}

// Cost item associated with questions
interface CostItem {
    costItemID: string;
    questionnaireID: string;
    itemName: string;
    itemDescription: string;
    estimatedCost: number;
    priority: string;
    isRequired: boolean;
    createdDate: string;
    modifiedDate: string;
    createdbyUserID: string;
    lastModifiedUserID: string;
}

// Combined questionnaire with cost items
interface QuestionnaireWithCostItems {
    questionnaire: Questionnaire;
    costItems: CostItem[];
}
```

## React Query Hooks

### Available Hooks
```typescript
// Get all questionnaire questions
const { data: questions, isLoading, error } = useGetAllQuestionnaires();

// Get questionnaire by company ID
const { data: questionnaire, isLoading, error } = useGetQuestionnaireByCompanyId(companyId);

// Save questionnaire and get cost items
const { mutate: saveQuestionnaire, isPending: isSaving, error: saveError } = useSaveQuestionnaireAndGetCostItems();

// Update questionnaire
const { mutate: updateQuestionnaire, isPending: isUpdating } = useUpdateQuestionnaire();

// Delete questionnaire
const { mutate: deleteQuestionnaire, isPending: isDeleting } = useDeleteQuestionnaire();
```

## React Components

### QuestionnaireComponent
A comprehensive component that displays all questionnaire questions organized by sections and subsections with Yes/No dropdown responses.

**Props:**
```typescript
interface QuestionnaireProps {
    onSave?: (data: { 
        questions: QuestionnaireQuestion[]; 
        responses: QuestionnaireResponse[];
        costItems: CostItem[] 
    }) => void;
    isEditMode?: boolean;
}
```

**Features:**
- Groups questions by section and subsection
- Displays question codes and descriptions
- **Yes/No dropdown responses** using dropdown store options
- Shows cost items and pricing when available
- Handles user input and form submission
- Supports edit and view modes
- Responsive design with modern UI
- **Automatic data transformation** from UI format to API format

**Usage:**
```tsx
import QuestionnaireComponent from '@/components/questionnaire';

function MyPage() {
    const handleSave = (data) => {
        console.log('Questionnaire data:', data);
        console.log('Responses:', data.responses);
        console.log('Cost items:', data.costItems);
        // Handle save logic
    };

    return (
        <QuestionnaireComponent 
            onSave={handleSave}
            isEditMode={true}
        />
    );
}
```

## Page Implementation

### Questionnaire Page
Located at `app/dashboard/questionnaire/page.tsx`

**Features:**
- Authentication check with redirect
- Toast notifications for success/error states
- Clean, professional layout
- Integration with the questionnaire component
- Response count tracking

**Key Implementation:**
```tsx
export default function QuestionnairePage() {
    const { isAuthenticated } = useAuthStore();
    const router = useRouter();
    const [toastObj, setToastObj] = useState<ToastComponent | null>(null);

    // Redirect if not authenticated
    React.useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, router]);

    const handleSave = (data) => {
        // Handle save with toast notification
        toastObj?.show({
            title: 'Success',
            content: `Questionnaire saved successfully! ${data.responses.length} questions answered.`,
            cssClass: 'e-success',
            timeOut: 3000
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <QuestionnaireComponent 
                onSave={handleSave}
                isEditMode={true}
            />
            <ToastComponent ref={(toast) => setToastObj(toast)} />
        </div>
    );
}
```

## Data Organization

### Question Structure
The API returns questions organized in a hierarchical structure:

1. **Sections** (e.g., "Funding Ready", "Risks", "Supplier Ready")
2. **Subsections** (e.g., "Business Plan", "Legal & Regulatory Compliance", "Finance")
3. **Individual Questions** with unique codes (e.g., "1.1.1", "1.2.1")

### Response Format
User responses are captured as Yes/No selections and transformed for the API:

**UI Format (QuestionnaireResponse):**
```typescript
interface QuestionnaireResponse {
    questionID: number;      // categoryQuestionID from the question
    answer: string;          // "Yes" or "No"
    questionCode: string;    // e.g., "1.1.1"
    questionText: string;    // The actual question text
}
```

**API Format (SaveQuestionnaireRequest):**
```typescript
interface SaveQuestionnaireRequest {
    companyID: string;       // From auth store
    userID: string;          // From auth store
    answers: Array<{
        questionCode: string; // questionCode from QuestionnaireQuestion
        answer: boolean;      // true for "Yes", false for "No"
    }>;
}
```

### Cost Items
Some questions may have associated cost items that include:
- Item name and description
- Estimated cost
- Priority level
- Required status
- Additional resources

## Yes/No Dropdown Integration

### Dropdown Store Integration
The questionnaire component integrates with the dropdown store to provide Yes/No options:

```typescript
import { useDropdownStore } from '@/store/dropdownStore';

const { yesNoOptions } = useDropdownStore();
```

### Dropdown Component Usage
```tsx
<DropDownListComponent
    dataSource={yesNoOptions as any}
    fields={{ text: 'Name', value: 'Name' }}
    placeholder="Select Yes or No"
    value={answers[question.categoryQuestionID] || ''}
    change={(e: DropdownChangeEventArgs) => 
        handleAnswerChange(question.categoryQuestionID, String(e.value || ''))
    }
    enabled={isEditMode}
    cssClass="e-outline w-full"
/>
```

## Data Transformation

### UI to API Transformation
The component automatically transforms user responses from the UI format to the API format:

```typescript
// Convert answers to the API format
const apiAnswers = Object.entries(answers)
    .filter(([_, answer]) => answer === 'Yes' || answer === 'No')
    .map(([questionId, answer]) => {
        const question = questions?.find(q => q.categoryQuestionID === parseInt(questionId));
        return {
            questionCode: question?.questionCode || questionId,  // Use questionCode string
            answer: answer === 'Yes'                             // Convert "Yes"/"No" to boolean
        };
    });

// Prepare the API request
const requestData: SaveQuestionnaireRequest = {
    companyID: companyId,    // From auth store
    userID: userId,          // From auth store
    answers: apiAnswers
};
```

## Best Practices

### 1. Error Handling
- Always check for loading and error states
- Provide meaningful error messages to users
- Implement retry mechanisms for failed requests
- Handle API errors gracefully with user feedback

### 2. Performance
- Use React Query for efficient data fetching and caching
- Implement proper loading states
- Consider pagination for large datasets
- Optimize data transformation operations

### 3. User Experience
- Provide clear visual feedback for user actions
- Use toast notifications for success/error states
- Implement proper form validation
- Support both edit and view modes
- Use consistent Yes/No dropdowns for all questions
- Show loading states during save operations

### 4. Type Safety
- Use TypeScript interfaces for all API responses
- Validate data structures before use
- Handle nullable fields appropriately
- Ensure Yes/No responses are properly typed
- Validate API request format before sending

## Testing

### Manual Testing Checklist
- [ ] Load questionnaire page and verify questions display correctly
- [ ] Test Yes/No dropdown functionality for all questions
- [ ] Verify dropdown options are loaded from the dropdown store
- [ ] Test form submission with valid Yes/No responses
- [ ] Verify API request format matches expected structure
- [ ] Test error handling with invalid data
- [ ] Verify authentication redirects work
- [ ] Test responsive design on different screen sizes
- [ ] Verify response count is accurate in success message
- [ ] Test loading states during save operations
- [ ] Verify cost items are returned and displayed correctly

### API Testing
- [ ] Test all endpoints with valid data
- [ ] Verify error responses for invalid requests
- [ ] Test authentication requirements
- [ ] Verify data consistency across endpoints
- [ ] Test data transformation from UI to API format
- [ ] Verify boolean conversion for Yes/No answers

## Troubleshooting

### Common Issues
1. **Questions not loading**: Check API endpoint and authentication
2. **Dropdown options not showing**: Verify dropdown store is initialized
3. **Form submission errors**: Verify company ID and user permissions
4. **Cost items not displaying**: Check if questions have associated cost items
5. **TypeScript errors**: Ensure all types are properly imported and used
6. **API format errors**: Verify questionCode is number and answer is boolean
7. **Data transformation errors**: Check Yes/No to boolean conversion

### Debug Steps
1. Check browser console for errors
2. Verify API responses in Network tab
3. Confirm authentication state
4. Validate data structures match expected types
5. Check dropdown store initialization
6. Verify data transformation logic
7. Test API request format manually

## Future Enhancements

### Potential Improvements
1. **Progress tracking**: Show completion percentage based on answered questions
2. **Save drafts**: Auto-save functionality for partial responses
3. **Export functionality**: PDF or Excel export with Yes/No responses
4. **Analytics**: Track response patterns and trends
5. **Customization**: Allow admins to modify questions and response options
6. **Multi-language support**: Internationalization
7. **Offline support**: Work without internet connection
8. **Advanced validation**: Conditional question logic based on Yes/No responses
9. **Response validation**: Ensure all required questions are answered
10. **Response summary**: Show overview of Yes/No responses by section
11. **Batch operations**: Save multiple responses at once
12. **Response history**: Track changes over time

This guide provides a comprehensive overview of the questionnaire system with Yes/No dropdown functionality and proper API integration. For specific implementation details, refer to the individual component files and API documentation. 