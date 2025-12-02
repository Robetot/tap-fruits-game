export const metadata = {
  title: "Tap Fruits — Farcaster Mini Game",
  description: "Tap falling fruits to score. Farcaster frame ready."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto" }}>
        {children}
      </body>
    </html>
  );
}
