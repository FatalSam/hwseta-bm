import { useEffect, useState } from 'react';
import { useDropdownStore } from '@/store/dropdownStore';

export const useDropdownStoreHook = () => {
    const {
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
        isLoading,
        isInitialized,
        error,
        fetchAllOptions,
        initialize
    } = useDropdownStore();

    const [isClient, setIsClient] = useState(false);

    // Ensure we're on the client side
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Initialize dropdown options on first use (client-side only)
    useEffect(() => {
        if (isClient && !isInitialized && !isLoading) {
            // First try to initialize from localStorage
            initialize();
            
            // If still not initialized, fetch from API
            if (!isInitialized) {
                fetchAllOptions();
            }
        }
    }, [isClient, isInitialized, isLoading, initialize, fetchAllOptions]);

    return {
        options: {
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
        },
        loading: {
            beeLevels: isLoading,
            genders: isLoading,
            educationLevels: isLoading,
            provinces: isLoading,
            raceGroups: isLoading,
            yesNoOptions: isLoading,
            fundingPurposes: isLoading,
            profitabilities: isLoading,
            businessCategories: isLoading,
            modules: isLoading,
            youthOwnedOptions: isLoading,
            disabilityOptions: isLoading,
            businessIndustries: isLoading
        },
        errors: {
            beeLevels: error,
            genders: error,
            educationLevels: error,
            provinces: error,
            raceGroups: error,
            yesNoOptions: error,
            fundingPurposes: error,
            profitabilities: error,
            businessCategories: error,
            modules: error,
            youthOwnedOptions: error,
            disabilityOptions: error,
            businessIndustries: error
        },
        isInitialized,
        fetchAllOptions
    };
}; 