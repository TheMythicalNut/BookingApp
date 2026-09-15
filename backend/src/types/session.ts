export interface Session {
    id: number;
    owner_id: number;
    token: string;
    expires_at: Date;
    created_at: Date;
}

export interface AdminSession {
    id: number;
    token: string;
    expires_at: Date;
    created_at: Date;
}