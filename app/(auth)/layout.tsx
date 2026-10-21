export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-4 sm:p-6">
      {children}
    </div>
  );
}
