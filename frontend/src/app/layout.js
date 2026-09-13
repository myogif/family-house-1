import "../index.css";
import "../App.css";
import Providers from "./providers";
import RouteShell from "./route-shell";

export const metadata = {
  title: "KeluargaKita",
  description: "Manajemen keluarga bersama",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <Providers>
          <RouteShell>{children}</RouteShell>
        </Providers>
      </body>
    </html>
  );
}
