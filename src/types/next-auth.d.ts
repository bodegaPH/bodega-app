import { DefaultSession, DefaultUser } from "next-auth";
import { CompatibleSystemRole } from "@/lib/system-role";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: CompatibleSystemRole;
      activeOrgId: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: CompatibleSystemRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: CompatibleSystemRole;
    activeOrgId?: string | null;
  }
}
