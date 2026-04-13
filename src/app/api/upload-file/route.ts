import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY environment variable" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const buffer = await file.arrayBuffer();
    const uploadedFile = await openai.files.create({
      file: await toFile(Buffer.from(buffer), file.name, { type: file.type }),
      purpose: "assistants",
    });

    const isImage = file.type.startsWith("image/");

    if (isImage) {
      // For images, return a data URL so the ChatKit UI can show a preview
      const base64 = Buffer.from(buffer).toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;
      return NextResponse.json({
        id: uploadedFile.id,
        name: file.name,
        mime_type: file.type,
        preview_url: dataUrl,
      });
    }

    return NextResponse.json({
      type: "file",
      id: uploadedFile.id,
      name: file.name,
      mime_type: file.type,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
