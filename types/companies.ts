export interface Company {
    companyID: string;
    businessName: string;
    registrationNumber: string;
    dateEstablished: string;
    businessTypeId: number;
    industryId: number;
    address1: string;
    address2: string;
    address3: string;
    addressCode: string;
    provinceId: number;
    contactNumber: string;
    email: string;
    staffCount: number;
    website: string;
    description: string;
    facebookLink: string;
    twitterLink: string;
    instagramLink: string;
    linkedInLink: string;
    createdDate: string;
    modifiedDate: string;
    totalCompletionScore: number;
    companyStatus: string;
}

export type Companies = Company[];

export interface BusinessType {
    Id: number;
    Name: string;
}

export interface Industry {
    Id: number;
    Name: string;
    Description?: string;
}

export interface Province {
    Id: number;
    Name: string;
}

export interface Owner {
    ownershipID: string;
    companyID: string;
    firstName: string;
    lastName: string;
    fullName: string;
    idNumber: string;
    contactNumber: string;
    emailAddress: string;
    gender: string;
    race: string;
    disabilityStatus: string;
    youthOwned: string;
    educationLevel: string;
    createdbyUserID: string;
    lastModifiedUserID: string;
    isActive: boolean;
}

export type Owners = Owner[];