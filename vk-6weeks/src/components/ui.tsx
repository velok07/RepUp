export const cardStyle: React.CSSProperties = {
  border: "1px solid var(--border-color)",
  borderRadius: 20,
  padding: 18,
  background: "var(--card-bg)",
  boxShadow: "var(--card-shadow)",
};

export const buttonStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: 14,
  border: "none",
  background: "var(--primary-color)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 15,
  boxShadow: "0 8px 20px rgba(37, 99, 235, 0.25)",
  transition: "transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease",
};

export const secondaryButtonStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: 14,
  border: "1px solid var(--border-color)",
  background: "var(--card-bg)",
  color: "var(--text-color)",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 15,
  transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
};

export const inputStyle: React.CSSProperties = {
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid var(--border-color)",
  width: "100%",
  boxSizing: "border-box",
  fontSize: 15,
  background: "var(--card-bg)",
  color: "var(--text-color)",
  outline: "none",
  transition: "border-color 0.18s ease, box-shadow 0.18s ease",
};

export const pageTitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 8,
  fontSize: 24,
  lineHeight: 1.1,
};

export const mutedTextStyle: React.CSSProperties = {
  color: "var(--muted-text-color)",
  lineHeight: 1.5,
};
