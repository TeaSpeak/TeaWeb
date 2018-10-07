export interface UserData {
    session_id: string;
    username: string;
    application_data: string;
    application_data_sign: string;
}
export declare function open_login(enforce?: boolean): Promise<UserData>;
export declare function current_data(): UserData | undefined;
export declare function logout(): void;
