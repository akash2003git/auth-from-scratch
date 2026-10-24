import { requireSession } from "@/lib/auth/session";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const Page = async () => {
  const { userId } = await requireSession();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <span>Dashboard</span>
      <span>{userId}</span>

      <form action={logout}>
        <Button type="submit" variant="outline">
          Log out
        </Button>
      </form>
    </div>
  );
};

export default Page;
