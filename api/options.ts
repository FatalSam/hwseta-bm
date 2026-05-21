import apiClient from "@/ultis/apiClient";
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
} from "@/types/dropdown-options";

// BEE Levels
export const getBEELevels = async () => {
    const response = await apiClient.get('/api/dropdown/BEELevels');
    // Transform the response to match expected structure
    const beeLevels = response.data.map((item: any) => ({
        Id: item.id,
        Name: item.textValue
    }));
    return beeLevels as BEELevels;
}

// Genders
export const getGenders = async () => {
    const response = await apiClient.get('/api/dropdown/Genders');
    // Transform the response to match expected structure
    const genders = response.data.map((item: any) => ({
        Id: item.genderID,
        Name: item.genderName
    }));
    return genders as Genders;
}

// Education Levels
export const getEducationLevels = async () => {
    const response = await apiClient.get('/api/dropdown/EducationLevels');
    // Transform the response to match expected structure
    const educationLevels = response.data.map((item: any) => ({
        Id: item.educationLevelID,
        Name: item.educationLevelName
    }));
    return educationLevels as EducationLevels;
}

// Provinces
export const getProvinces = async () => {
    const response = await apiClient.get('/api/dropdown/Provinces');
    // Transform the response to match expected structure
    const provinces = response.data.map((item: any) => ({
        Id: item.provinceID,
        Name: item.provinceName
    }));
    return provinces as Provinces;
}

// Race Groups
export const getRaceGroups = async () => {
    const response = await apiClient.get('/api/dropdown/RaceGroups');
    // Transform the response to match expected structure
    const raceGroups = response.data.map((item: any) => ({
        Id: item.raceGroupID,
        Name: item.raceGroupName
    }));
    return raceGroups as RaceGroups;
}

// Yes/No Options
export const getYesNoOptions = async () => {
    const response = await apiClient.get('/api/dropdown/YesNoOptions');
    // Transform the response to match expected structure
    const yesNoOptions = response.data.map((item: any) => ({
        Id: item.id,
        Name: item.textValue
    }));
    return yesNoOptions as YesNoOptions;
}

// Funding Purposes
export const getFundingPurposes = async () => {
    const response = await apiClient.get('/api/dropdown/FundingPurposes');
    // Transform the response to match expected structure
    const fundingPurposes = response.data.map((item: any) => ({
        Id: item.id,
        Name: item.purpose
    }));
    return fundingPurposes as FundingPurposes;
}

// Profitabilities
export const getProfitabilities = async () => {
    const response = await apiClient.get('/api/dropdown/Profitabilities');
    // Transform the response to match expected structure and include description
    const profitabilities = response.data.map((item: any) => ({
        Id: item.id,
        Name: item.profitabilityName,
        Description: item.description
    }));
    return profitabilities as Profitabilities;
}

// Business Categories
export const getBusinessCategories = async () => {
    const response = await apiClient.get('/api/dropdown/BusinessCategories');
    // Transform the response to match expected structure
    const categories = response.data.map((item: any) => ({
        Id: item.id,
        Name: item.category
    }));
    return categories as BusinessCategories;
}

// Modules
export const getModules = async () => {
    const response = await apiClient.get('/api/dropdown/Modules');
    // Transform the response to match expected structure
    const modules = response.data.map((item: any) => ({
        Id: item.moduleID,
        Name: item.modules
    }));
    return modules as Modules;
}

// Youth Owned Options
export const getYouthOwnedOptions = async () => {
    const response = await apiClient.get('/api/dropdown/YouthOwnedOptions');
    // Transform the response to match expected structure
    const youthOwnedOptions = response.data.map((item: any) => ({
        Id: item.id,
        Name: item.textValue
    }));
    return youthOwnedOptions as YouthOwnedOptions;
}

// Disability Options
export const getDisabilityOptions = async () => {
    const response = await apiClient.get('/api/dropdown/DisabilityOptions');
    // Transform the response to match expected structure
    const disabilityOptions = response.data.map((item: any) => ({
        Id: item.id,
        Name: item.textValue
    }));
    return disabilityOptions as DisabilityOptions;
}

// Business Industries
export const getBusinessIndustries = async () => {
    const response = await apiClient.get('/api/dropdown/BusinessIndustries');
    // Transform the response to match expected structure
    const industries = response.data.map((item: any) => ({
        Id: item.industryID,
        Name: item.industryName,
        Description: item.description
    }));
    return industries as BusinessIndustries;
}
