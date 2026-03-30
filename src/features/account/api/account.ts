import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";

export class AccountApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AccountApiError";
    this.status = status;
  }
}

export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  hasPassword: boolean;
};

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
    },
  });

  if (!user) {
    throw new AccountApiError("User not found", 404);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    hasPassword: !!user.password,
  };
}

export async function updateProfile(
  userId: string,
  data: { name?: unknown; email?: unknown; currentPassword?: unknown },
  currentEmail?: string | null
) {
  const { name, email, currentPassword } = data;

  // Validate name
  if (!name || typeof name !== "string" || (name as string).trim().length === 0) {
    throw new AccountApiError("Name is required", 400);
  }

  // Validate email format
  if (!email || typeof email !== "string") {
    throw new AccountApiError("Invalid email format", 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email as string)) {
    throw new AccountApiError("Invalid email format", 400);
  }

  const trimmedName = (name as string).trim();
  const trimmedEmail = (email as string).toLowerCase().trim();

  // If email is being changed, verify current password
  const isEmailChanged = trimmedEmail !== currentEmail?.toLowerCase();

  if (isEmailChanged) {
    if (!currentPassword) {
      throw new AccountApiError("Current password is required to change email", 400);
    }

    const userWithPassword = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!userWithPassword?.password) {
      throw new AccountApiError("Cannot change email for OAuth accounts", 400);
    }

    const passwordValid = await bcrypt.compare(
      currentPassword as string,
      userWithPassword.password
    );
    if (!passwordValid) {
      throw new AccountApiError("Current password is incorrect", 401);
    }
  }

  // Check email uniqueness (if changed)
  if (isEmailChanged) {
    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new AccountApiError("Email already in use", 409);
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: trimmedName,
      email: trimmedEmail,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return updatedUser;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  if (!currentPassword || !newPassword) {
    throw new AccountApiError("Current password and new password are required", 400);
  }

  if (newPassword.length < 12) {
    throw new AccountApiError("Password must be at least 12 characters", 400);
  }

  if (newPassword.length > 72) {
    throw new AccountApiError("Password must not exceed 72 characters", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });

  if (!user) {
    throw new AccountApiError("User not found", 404);
  }

  if (!user.password) {
    throw new AccountApiError("Password change not available for OAuth accounts", 400);
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new AccountApiError("Current password is incorrect", 401);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}
