import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/features/account/server";
import { AccountSettingsForm, PasswordChangeForm } from "@/features/account";

export const metadata = {
  title: "Account Settings - Bodega",
  description: "Manage your personal account settings",
};

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const userId = session.user.id;
  const profile = await getUserProfile(userId);

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-white/10 pb-6">
          <h1 className="text-2xl font-mono uppercase tracking-[0.2em] font-bold text-white">
            Account_Settings
          </h1>
          <p className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 mt-2">
            Manage your personal profile and security settings
          </p>
        </div>

        {/* Profile Section */}
        <div className="bg-black border border-white/10 rounded-none p-8">
          <h2 className="text-sm font-mono tracking-[0.2em] uppercase font-semibold text-white mb-6">Profile</h2>
          <AccountSettingsForm
            user={{
              name: profile.name || "",
              email: profile.email || "",
            }}
          />
        </div>

        {/* Password Section */}
        {profile.hasPassword && (
          <div className="bg-black border border-white/10 rounded-none p-8">
            <h2 className="text-sm font-mono tracking-[0.2em] uppercase font-semibold text-white mb-6">Password</h2>
            <PasswordChangeForm />
          </div>
        )}

        {/* OAuth Notice */}
        {!profile.hasPassword && (
          <div className="bg-black border border-white/10 rounded-none p-8">
            <h2 className="text-sm font-mono tracking-[0.2em] uppercase font-semibold text-white mb-4">Password</h2>
            <div className="bg-zinc-950 border border-white/10 rounded-none p-4 mt-4">
              <p className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 leading-relaxed">
                You signed in with an OAuth provider. Password management is not
                available for OAuth accounts.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
