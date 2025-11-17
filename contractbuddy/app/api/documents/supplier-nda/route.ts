export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "docs", "supplier.docx");

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  });
}
