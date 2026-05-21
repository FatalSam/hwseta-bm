export interface Login {
    userName: string;
    password: string;
}

export interface User {
    userID: string;
    firstName: string;
    lastName: string;
    email: string;
    userName: string;
    companyID: string;
    companyName: string;
    role: string;
}

export interface LoginResponse {
    user: User;
    token: string;
    refreshToken?: string | null;
}

/** HWSETA Beneficiary API — POST /api/Auth/Register */
export interface RegisterBeneficiary {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
}
