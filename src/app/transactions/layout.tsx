export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="container p-4 mx-auto space-y-4 max-w-3xl">{children}</div>;
}
