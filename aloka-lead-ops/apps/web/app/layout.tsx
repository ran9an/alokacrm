import "./globals.css";
export const metadata = {
  title: "Aloka CRM | Sales workspace",
  description: "Private lead and sales operations workspace for Aloka Developers",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
