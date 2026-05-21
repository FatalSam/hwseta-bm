import Header from "@/components/header";
import Footer from "@/components/footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="pt-[calc(0.25rem+8.625rem+2px)] sm:pt-[calc(0.25rem+10.125rem+2px)] md:pt-[calc(0.25rem+7.25rem+2px)] lg:pt-[calc(0.25rem+8rem+2px)]">
        {children}
      </main>
      <Footer />
    </>
  );
}
