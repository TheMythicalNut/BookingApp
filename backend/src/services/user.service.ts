import { getPool } from "../config/db.js";
import type { CreateUserDTO, User } from "../types/user.js";

export const getAllUsers = async (): Promise<User[]> => {
  const { rows } = await getPool().query<User>("SELECT * FROM users");
  return rows;
};

export const createUser = async (
  data: CreateUserDTO
): Promise<User> => {
  const { rows } = await getPool().query<User>(
    `INSERT INTO users (email, name)
     VALUES ($1, $2)
     RETURNING *`,
    [data.email, data.name ?? null]
  );

  const user = rows[0];

  if (!user) {
    throw new Error("User creation failed");
  }

  return user;
};