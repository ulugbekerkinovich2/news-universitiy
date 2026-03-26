import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="layout-shell min-h-screen bg-background">
      <Header />
      <main className="container relative py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
