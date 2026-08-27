import { ImageResponse } from "next/og";

export const size = { height: 180, width: 180 };

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="104"
        viewBox="0 0 24 24"
        width="104"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 12.5 9 17.5 20 6.5"
          stroke="#ffffff"
          strokeDasharray="3.2 3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.2"
        />
      </svg>
    </div>,
    { ...size },
  );
}
