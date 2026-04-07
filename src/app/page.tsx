import { redirectToOrgScopedPath } from "@/lib/redirect-helper";

export default async function HomePage() {
  return redirectToOrgScopedPath("dashboard");
}
