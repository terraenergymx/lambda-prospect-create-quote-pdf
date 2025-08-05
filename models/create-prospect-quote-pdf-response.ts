export interface CreateProspectQuotePdfResponse {
    message: string;
    data: {
        bucket: string;
        key: string;
    };
}