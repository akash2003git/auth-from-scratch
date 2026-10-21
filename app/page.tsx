import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center p-4 sm:p-6">
      <div className="flex flex-col gap-1 items-center">
        <span>
          Landing Page
        </span>
        <div className="flex gap-1">
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline" })}
          >
            Login
          </Link>
          <Link
            href="/signup"
            className={buttonVariants({ variant: "outline" })}
          >
            Signup
          </Link>
        </div>
      </div>
    </main >
  )
}
