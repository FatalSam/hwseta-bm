import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Company } from '@/types/companies';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate company profile completion score based on filled fields
 * @param company - Company data
 * @returns Completion percentage (0-100)
 */
export function calculateCompanyProfileCompletion(company: Partial<Company> | null | undefined): number {
    if (!company) return 0;
    
    const requiredFields = [
        'businessName',
        'registrationNumber', 
        'dateEstablished',
        'businessTypeId',
        'industryId',
        'address1',
        'addressCode',
        'provinceId',
        'contactNumber',
        'email'
    ];
    
    const optionalFields = [
        'address2',
        'address3', 
        'staffCount',
        'website',
        'description',
        'facebookLink',
        'twitterLink',
        'instagramLink',
        'linkedInLink'
    ];
    
    let completedFields = 0;
    const totalFields = requiredFields.length + (optionalFields.length * 0.5); // Optional fields count as half
    
    // Check required fields
    requiredFields.forEach(field => {
        const value = (company as Record<string, unknown>)[field];
        if (value && value !== '' && value !== 0) {
            completedFields++;
        }
    });
    
    // Check optional fields (count as half a point each)
    optionalFields.forEach(field => {
        const value = (company as Record<string, unknown>)[field];
        if (value && value !== '' && value !== 0) {
            completedFields += 0.5;
        }
    });
    
    const percentage = Math.round((completedFields / totalFields) * 100);
    return Math.min(percentage, 100); // Ensure it doesn't exceed 100%
} 