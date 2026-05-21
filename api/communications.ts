import apiClient from "@/ultis/apiClient";

export interface NewsletterSubscriberResponse {
    newsletterSubscriberID?: string;
    newsletterSubscriberId?: string;
    subscriberID?: string;
    subscriberId?: string;
    id?: string;
    email?: string;
    emailAddress?: string;
    createdDate?: string;
    dateCreated?: string;
    subscribedDate?: string;
    isActive?: boolean;
    status?: string;
}

export interface ContactSubmissionResponse {
    contactSubmissionID?: string;
    contactSubmissionId?: string;
    contactFormID?: string;
    contactFormId?: string;
    submissionID?: string;
    submissionId?: string;
    id?: string;
    name?: string;
    fullName?: string;
    email?: string;
    emailAddress?: string;
    subject?: string;
    message?: string;
    createdDate?: string;
    dateCreated?: string;
    submittedDate?: string;
}

export interface ContactFormPayload {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export const subscribeToNewsletter = async (email: string) => {
    const response = await apiClient.put('/api/NewsletterSubscribers/Subscribe', { email });
    return response.data;
};

export const getAllNewsletterSubscribers = async () => {
    const response = await apiClient.get('/api/NewsletterSubscribers/GetAllSubscribers');
    return response.data as NewsletterSubscriberResponse[];
};

export const deleteNewsletterSubscriber = async (subscriberId: string) => {
    const response = await apiClient.delete(`/api/NewsletterSubscribers/DeleteSubscriber/${subscriberId}`);
    return response.data;
};

export const submitContactForm = async (payload: ContactFormPayload) => {
    const response = await apiClient.put('/api/ContactForm/Submit', payload);
    return response.data;
};

export const getAllContactSubmissions = async () => {
    const response = await apiClient.get('/api/ContactForm/GetAllSubmissions');
    return response.data as ContactSubmissionResponse[];
};

export const deleteContactSubmission = async (contactSubmissionId: string) => {
    const response = await apiClient.delete(`/api/ContactForm/DeleteSubmission/${contactSubmissionId}`);
    return response.data;
};
