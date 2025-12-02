export const metadata = {
  title: "Tap Fruits Game",
  description: "Catch the fruits by tapping!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
