import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "eslint-plugin-hollow-tests";

export const size = { height: 630, width: 1200 };

export const contentType = "image/png";

const TITLE = "hollow tests";
const DESCRIPTION = "Tests that pass without checking anything.";

export default async function Image() {
  /* The same Sora the site uses for headings, cut down to the characters this
     card shows. Change the copy and rebuild it per assets/README.md. */
  const font = await readFile(
    join(process.cwd(), "assets/Sora-700-subset.ttf"),
  );

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#0b0b0f",
        color: "#ffffff",
        display: "flex",
        height: "100%",
        padding: "0 80px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: 560,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: -1,
          }}
        >
          {TITLE}
        </div>
        <div
          style={{
            color: "#a1a1aa",
            display: "flex",
            fontSize: 30,
            lineHeight: 1.4,
            marginTop: 28,
          }}
        >
          {DESCRIPTION}
        </div>
        <div
          style={{
            color: "#71717a",
            display: "flex",
            fontSize: 26,
            marginTop: 48,
          }}
        >
          kkweb.io
        </div>
      </div>

      {/* Show the thing itself: a test body that passes while checking nothing.
          A name and a line of copy alone would make every card look the same. */}
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flex: 1,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#15151c",
            border: "1px solid #26262f",
            borderRadius: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "30px 32px",
          }}
        >
          {[
            { color: "#d4d4d8", text: 'it("saves", () => {' },
            { color: "#71717a", text: "  save(record);" },
            { color: "#d4d4d8", text: "});" },
          ].map((line) => (
            <div
              key={line.text}
              style={{
                color: line.color,
                display: "flex",
                fontSize: 24,
                whiteSpace: "pre",
              }}
            >
              {line.text}
            </div>
          ))}
          <div
            style={{
              alignItems: "center",
              background: "#2a1f05",
              borderRadius: 999,
              color: "#fbbf24",
              display: "flex",
              fontSize: 20,
              marginTop: 14,
              padding: "10px 18px",
            }}
          >
            no assertion
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ data: font, name: "Sora", style: "normal", weight: 700 }],
    },
  );
}
