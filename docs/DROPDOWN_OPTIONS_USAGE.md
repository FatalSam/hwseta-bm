# Dropdown Options API Usage Guide

This guide explains how to use the dropdown options API endpoints and components in the HWSETABeneficiaryHub application.

## Overview

The dropdown options API provides access to various lookup data used throughout the application, including BEE levels, provinces, business categories, and more.

## API Endpoints

All dropdown endpoints are available at `https://api.hwsetabeneficiaryhub.co.za/api/dropdown/` and include:

- **BEELevels** - BEE (Broad-Based Black Economic Empowerment) levels
- **Genders** - Gender options
- **EducationLevels** - Education level options
- **Provinces** - South African provinces
- **RaceGroups** - Race group classifications
- **YesNoOptions** - Yes/No selection options
- **FundingPurposes** - Funding purpose categories
- **Profitabilities** - Profitability status options
- **BusinessCategories** - Business category classifications
- **Modules** - Available modules
- **YouthOwnedOptions** - Youth ownership options
- **DisabilityOptions** - Disability status options
- **BusinessIndustries** - Business industry classifications

## Files Created

### 1. Types (`types/dropdown-options.ts`)
Defines TypeScript interfaces for all dropdown option types:

```typescript
export interface DropdownOption {
    Id: number;
    Name: string;
}

export interface BEELevel extends DropdownOption {}
export interface Gender extends DropdownOption {}
// ... other interfaces
```

### 2. API Functions (`api/options.ts`)
Contains all API endpoint functions:

```typescript
export const getBEELevels = async () => {
    const response = await apiClient.get('/api/dropdown/BEELevels');
    return response.data as BEELevels;
}
// ... other functions
```

### 3. Custom Hook (`hooks/useDropdownOptions.ts`)
Provides a React hook for managing dropdown options with loading states and error handling:

```typescript
const {
    options,
    loading,
    errors,
    fetchAllOptions,
    fetchBEELevels,
    // ... other functions
} = useDropdownOptions();
```

### 4. Reusable Component (`components/ui/dropdown-select.tsx`)
A reusable dropdown select component:

```typescript
<DropdownSelect
    label="BEE Level"
    options={options.beeLevels}
    value={selectedValue}
    onChange={handleChange}
    placeholder="Select BEE Level"
    required
/>
```

### 5. Example Component (`components/examples/dropdown-example.tsx`)
Demonstrates how to use the dropdown options in a real component.

## Usage Examples

### Basic API Usage

```typescript
import { getProvinces, getBEELevels } from '@/api/options';

// Fetch provinces
const provinces = await getProvinces();

// Fetch BEE levels
const beeLevels = await getBEELevels();
```

### Using the Custom Hook

```typescript
import { useDropdownOptions } from '@/hooks/useDropdownOptions';

const MyComponent = () => {
    const { options, loading, errors, fetchAllOptions } = useDropdownOptions();

    useEffect(() => {
        fetchAllOptions();
    }, [fetchAllOptions]);

    if (loading.provinces) {
        return <div>Loading provinces...</div>;
    }

    return (
        <select>
            {options.provinces.map(province => (
                <option key={province.Id} value={province.Id}>
                    {province.Name}
                </option>
            ))}
        </select>
    );
};
```

### Using the DropdownSelect Component

```typescript
import { DropdownSelect } from '@/ui/dropdown-select';
import { useDropdownOptions } from '@/hooks/useDropdownOptions';

const MyForm = () => {
    const { options, loading } = useDropdownOptions();
    const [selectedProvince, setSelectedProvince] = useState<number>(0);

    return (
        <DropdownSelect
            label="Province"
            options={options.provinces}
            value={selectedProvince}
            onChange={setSelectedProvince}
            placeholder="Select a province"
            required
            disabled={loading.provinces}
        />
    );
};
```

## Features

### Loading States
Each dropdown option type has its own loading state, allowing for granular loading indicators.

### Error Handling
Individual error states for each dropdown type, with descriptive error messages.

### Type Safety
Full TypeScript support with proper type definitions for all dropdown options.

### Reusable Components
The `DropdownSelect` component can be used throughout the application for consistent UI.

### Batch Loading
The `fetchAllOptions()` function loads all dropdown options simultaneously for better performance.

## Best Practices

1. **Lazy Loading**: Only fetch dropdown options when needed, not on every page load.
2. **Caching**: Consider caching dropdown options in your state management solution.
3. **Error Boundaries**: Wrap dropdown components in error boundaries for better UX.
4. **Loading States**: Always show loading indicators when fetching dropdown data.
5. **Validation**: Use the `required` prop for mandatory fields.

## Error Handling

The API functions and hook handle errors gracefully:

```typescript
const { errors } = useDropdownOptions();

if (errors.provinces) {
    console.error('Failed to load provinces:', errors.provinces);
    // Handle error appropriately
}
```

## Performance Considerations

- Use `fetchAllOptions()` when you need multiple dropdown types on the same page
- Use individual fetch functions when you only need specific dropdown types
- Consider implementing a caching mechanism for frequently used dropdown options
- The API responses are cached by the `apiClient` for better performance 