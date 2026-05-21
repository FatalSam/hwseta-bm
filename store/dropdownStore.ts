import { create } from 'zustand';
import {
    BEELevels,
    Genders,
    EducationLevels,
    Provinces,
    RaceGroups,
    YesNoOptions,
    FundingPurposes,
    Profitabilities,
    BusinessCategories,
    Modules,
    YouthOwnedOptions,
    DisabilityOptions,
    BusinessIndustries
} from '@/types/dropdown-options';
import {
    getBEELevels,
    getGenders,
    getEducationLevels,
    getProvinces,
    getRaceGroups,
    getYesNoOptions,
    getFundingPurposes,
    getProfitabilities,
    getBusinessCategories,
    getModules,
    getYouthOwnedOptions,
    getDisabilityOptions,
    getBusinessIndustries
} from '@/api/options';

interface DropdownOptionsState {
    // Data
    beeLevels: BEELevels;
    genders: Genders;
    educationLevels: EducationLevels;
    provinces: Provinces;
    raceGroups: RaceGroups;
    yesNoOptions: YesNoOptions;
    fundingPurposes: FundingPurposes;
    profitabilities: Profitabilities;
    businessCategories: BusinessCategories;
    modules: Modules;
    youthOwnedOptions: YouthOwnedOptions;
    disabilityOptions: DisabilityOptions;
    businessIndustries: BusinessIndustries;

    // Loading states
    isLoading: boolean;
    isInitialized: boolean;

    // Error states
    error: string | null;

    // Actions
    fetchAllOptions: () => Promise<void>;
    clearOptions: () => void;
    initialize: () => void;
}

// Initialize state from localStorage if available (client-side only)
const getStoredOptions = () => {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem('dropdownOptions');
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Error reading dropdown options from localStorage:', error);
        return null;
    }
};

export const useDropdownStore = create<DropdownOptionsState>((set, get) => ({
    // Initialize with empty arrays to prevent hydration mismatch
    beeLevels: [],
    genders: [],
    educationLevels: [],
    provinces: [],
    raceGroups: [],
    yesNoOptions: [],
    fundingPurposes: [],
    profitabilities: [],
    businessCategories: [],
    modules: [],
    youthOwnedOptions: [],
    disabilityOptions: [],
    businessIndustries: [],

    // Loading states
    isLoading: false,
    isInitialized: false,

    // Error state
    error: null,

    // Initialize dropdown options from localStorage (client-side only)
    initialize: () => {
        const storedOptions = getStoredOptions();
        if (storedOptions) {
            set({
                beeLevels: storedOptions.beeLevels || [],
                genders: storedOptions.genders || [],
                educationLevels: storedOptions.educationLevels || [],
                provinces: storedOptions.provinces || [],
                raceGroups: storedOptions.raceGroups || [],
                yesNoOptions: storedOptions.yesNoOptions || [],
                fundingPurposes: storedOptions.fundingPurposes || [],
                profitabilities: storedOptions.profitabilities || [],
                businessCategories: storedOptions.businessCategories || [],
                modules: storedOptions.modules || [],
                youthOwnedOptions: storedOptions.youthOwnedOptions || [],
                disabilityOptions: storedOptions.disabilityOptions || [],
                businessIndustries: storedOptions.businessIndustries || [],
                isInitialized: true
            });
        }
    },

    // Fetch all dropdown options
    fetchAllOptions: async () => {
        const { isInitialized } = get();

        // If already initialized and we have data that includes the latest shape (e.g. profitabilities with Description),
        // we can skip refetching. Otherwise, fetch from the API to refresh the cache.
        const storedOptions = getStoredOptions();
        const hasUpToDateProfitabilities =
            storedOptions &&
            Array.isArray(storedOptions.profitabilities) &&
            storedOptions.profitabilities.length > 0 &&
            typeof storedOptions.profitabilities[0].Description === 'string';

        if (isInitialized && storedOptions && hasUpToDateProfitabilities) {
            return;
        }

        set({ isLoading: true, error: null });

        try {
            // Fetch all options in parallel
            const [
                beeLevels,
                genders,
                educationLevels,
                provinces,
                raceGroups,
                yesNoOptions,
                fundingPurposes,
                profitabilities,
                businessCategories,
                modules,
                youthOwnedOptions,
                disabilityOptions,
                businessIndustries
            ] = await Promise.all([
                getBEELevels(),
                getGenders(),
                getEducationLevels(),
                getProvinces(),
                getRaceGroups(),
                getYesNoOptions(),
                getFundingPurposes(),
                getProfitabilities(),
                getBusinessCategories(),
                getModules(),
                getYouthOwnedOptions(),
                getDisabilityOptions(),
                getBusinessIndustries()
            ]);

            const newState = {
                beeLevels,
                genders,
                educationLevels,
                provinces,
                raceGroups,
                yesNoOptions,
                fundingPurposes,
                profitabilities,
                businessCategories,
                modules,
                youthOwnedOptions,
                disabilityOptions,
                businessIndustries,
                isLoading: false,
                isInitialized: true,
                error: null
            };

            // Update state
            set(newState);

            // Persist to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('dropdownOptions', JSON.stringify({
                    beeLevels,
                    genders,
                    educationLevels,
                    provinces,
                    raceGroups,
                    yesNoOptions,
                    fundingPurposes,
                    profitabilities,
                    businessCategories,
                    modules,
                    youthOwnedOptions,
                    disabilityOptions,
                    businessIndustries
                }));
            }
        } catch (error) {
            set({ 
                isLoading: false, 
                error: error instanceof Error ? error.message : 'Failed to fetch dropdown options' 
            });
            console.error('Error fetching dropdown options:', error);
        }
    },

    // Clear all options (useful for logout)
    clearOptions: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('dropdownOptions');
        }
        set({
            beeLevels: [],
            genders: [],
            educationLevels: [],
            provinces: [],
            raceGroups: [],
            yesNoOptions: [],
            fundingPurposes: [],
            profitabilities: [],
            businessCategories: [],
            modules: [],
            youthOwnedOptions: [],
            disabilityOptions: [],
            businessIndustries: [],
            isLoading: false,
            isInitialized: false,
            error: null
        });
    }
})); 