import { NextRequest, NextResponse } from "next/server";
import { FileOperations } from "@/lib/file-operations";

// Force dynamic rendering for this API route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Path parameter is required" }, {
        status: 400,
      });
    }

    const fileOps = FileOperations.getInstance();
    const content = await fileOps.readFile(path);

    if (content === null) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new Response(content, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("Error reading file:", error);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
