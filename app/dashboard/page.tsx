export const instant = false

const Page = async (props: PageProps<"/dashboard">) => {
  const { userId } = await props.searchParams;

  return (
    <div className="flex items-center justify-center h-screen">
      Dashboard
      <span>{userId}</span>
    </div>
  )
}

export default Page
