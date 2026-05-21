export interface DropdownOption {
    Id: number;
    Name: string;
}

export interface BEELevel extends DropdownOption {}
export interface Gender extends DropdownOption {}
export interface EducationLevel extends DropdownOption {}
export interface Province extends DropdownOption {}
export interface RaceGroup extends DropdownOption {}
export interface YesNoOption extends DropdownOption {}
export interface FundingPurpose extends DropdownOption {}
export interface Profitability extends DropdownOption {
    Description?: string;
}
export interface BusinessCategory extends DropdownOption {}
export interface Module extends DropdownOption {}
export interface YouthOwnedOption extends DropdownOption {}
export interface DisabilityOption extends DropdownOption {}
export interface BusinessIndustry extends DropdownOption {
    Description?: string;
}

// Array types for API responses
export type BEELevels = BEELevel[];
export type Genders = Gender[];
export type EducationLevels = EducationLevel[];
export type Provinces = Province[];
export type RaceGroups = RaceGroup[];
export type YesNoOptions = YesNoOption[];
export type FundingPurposes = FundingPurpose[];
export type Profitabilities = Profitability[];
export type BusinessCategories = BusinessCategory[];
export type Modules = Module[];
export type YouthOwnedOptions = YouthOwnedOption[];
export type DisabilityOptions = DisabilityOption[];
export type BusinessIndustries = BusinessIndustry[]; 