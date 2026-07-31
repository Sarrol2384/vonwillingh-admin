export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "#f4f1ea",
        color: "#1e3a5f",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 28 }}>VonWillingh Admin</h1>
      <p style={{ margin: 0, color: "#64748b" }}>Invoices & quotes</p>
      <a
        href="/login"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          height: 40,
          padding: "0 18px",
          borderRadius: 8,
          background: "#1e3a5f",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Go to sign in
      </a>
    </main>
  );
}
