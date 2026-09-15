export interface CreateUserDTO {
  email: string;
  name?: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  created_at: Date;
}