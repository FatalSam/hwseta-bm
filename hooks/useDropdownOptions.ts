import { useState, useEffect } from 'react';
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

interface DropdownOptionsState {
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
}

interface LoadingState {
    beeLevels: boolean;
    genders: boolean;
    educationLevels: boolean;
    provinces: boolean;
    raceGroups: boolean;
    yesNoOptions: boolean;
    fundingPurposes: boolean;
    profitabilities: boolean;
    businessCategories: boolean;
    modules: boolean;
    youthOwnedOptions: boolean;
    disabilityOptions: boolean;
    businessIndustries: boolean;
}

interface ErrorState {
    beeLevels: string | null;
    genders: string | null;
    educationLevels: string | null;
    provinces: string | null;
    raceGroups: string | null;
    yesNoOptions: string | null;
    fundingPurposes: string | null;
    profitabilities: string | null;
    businessCategories: string | null;
    modules: string | null;
    youthOwnedOptions: string | null;
    disabilityOptions: string | null;
    businessIndustries: string | null;
}

export const useDropdownOptions = () => {
    const [options, setOptions] = useState<DropdownOptionsState>({
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
        businessIndustries: []
    });

    const [loading, setLoading] = useState<LoadingState>({
        beeLevels: false,
        genders: false,
        educationLevels: false,
        provinces: false,
        raceGroups: false,
        yesNoOptions: false,
        fundingPurposes: false,
        profitabilities: false,
        businessCategories: false,
        modules: false,
        youthOwnedOptions: false,
        disabilityOptions: false,
        businessIndustries: false
    });

    const [errors, setErrors] = useState<ErrorState>({
        beeLevels: null,
        genders: null,
        educationLevels: null,
        provinces: null,
        raceGroups: null,
        yesNoOptions: null,
        fundingPurposes: null,
        profitabilities: null,
        businessCategories: null,
        modules: null,
        youthOwnedOptions: null,
        disabilityOptions: null,
        businessIndustries: null
    });

    // Generic function to fetch dropdown data
    const fetchDropdownData = async <T>(
        fetchFunction: () => Promise<T>,
        key: keyof DropdownOptionsState,
        loadingKey: keyof LoadingState,
        errorKey: keyof ErrorState
    ) => {
        setLoading(prev => ({ ...prev, [loadingKey]: true }));
        setErrors(prev => ({ ...prev, [errorKey]: null }));

        try {
            const data = await fetchFunction();
            setOptions(prev => ({ ...prev, [key]: data }));
        } catch (error) {
            setErrors(prev => ({ 
                ...prev, 
                [errorKey]: error instanceof Error ? error.message : 'An error occurred' 
            }));
        } finally {
            setLoading(prev => ({ ...prev, [loadingKey]: false }));
        }
    };

    // Individual fetch functions
    const fetchBEELevels = () => fetchDropdownData(getBEELevels, 'beeLevels', 'beeLevels', 'beeLevels');
    const fetchGenders = () => fetchDropdownData(getGenders, 'genders', 'genders', 'genders');
    const fetchEducationLevels = () => fetchDropdownData(getEducationLevels, 'educationLevels', 'educationLevels', 'educationLevels');
    const fetchProvinces = () => fetchDropdownData(getProvinces, 'provinces', 'provinces', 'provinces');
    const fetchRaceGroups = () => fetchDropdownData(getRaceGroups, 'raceGroups', 'raceGroups', 'raceGroups');
    const fetchYesNoOptions = () => fetchDropdownData(getYesNoOptions, 'yesNoOptions', 'yesNoOptions', 'yesNoOptions');
    const fetchFundingPurposes = () => fetchDropdownData(getFundingPurposes, 'fundingPurposes', 'fundingPurposes', 'fundingPurposes');
    const fetchProfitabilities = () => fetchDropdownData(getProfitabilities, 'profitabilities', 'profitabilities', 'profitabilities');
    const fetchBusinessCategories = () => fetchDropdownData(getBusinessCategories, 'businessCategories', 'businessCategories', 'businessCategories');
    const fetchModules = () => fetchDropdownData(getModules, 'modules', 'modules', 'modules');
    const fetchYouthOwnedOptions = () => fetchDropdownData(getYouthOwnedOptions, 'youthOwnedOptions', 'youthOwnedOptions', 'youthOwnedOptions');
    const fetchDisabilityOptions = () => fetchDropdownData(getDisabilityOptions, 'disabilityOptions', 'disabilityOptions', 'disabilityOptions');
    const fetchBusinessIndustries = () => fetchDropdownData(getBusinessIndustries, 'businessIndustries', 'businessIndustries', 'businessIndustries');

    // Fetch all dropdown options
    const fetchAllOptions = async () => {
        await Promise.all([
            fetchBEELevels(),
            fetchGenders(),
            fetchEducationLevels(),
            fetchProvinces(),
            fetchRaceGroups(),
            fetchYesNoOptions(),
            fetchFundingPurposes(),
            fetchProfitabilities(),
            fetchBusinessCategories(),
            fetchModules(),
            fetchYouthOwnedOptions(),
            fetchDisabilityOptions(),
            fetchBusinessIndustries()
        ]);
    };

    return {
        options,
        loading,
        errors,
        fetchAllOptions,
        fetchBEELevels,
        fetchGenders,
        fetchEducationLevels,
        fetchProvinces,
        fetchRaceGroups,
        fetchYesNoOptions,
        fetchFundingPurposes,
        fetchProfitabilities,
        fetchBusinessCategories,
        fetchModules,
        fetchYouthOwnedOptions,
        fetchDisabilityOptions,
        fetchBusinessIndustries
    };
}; 