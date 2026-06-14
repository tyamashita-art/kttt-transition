import { createClient } from "@/lib/supabase/client";

function safeFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "jpg";
  return `${Date.now()}-${crypto.randomUUID()}.${extension}`;
}

export async function uploadPublicImage({
  bucket,
  userId,
  file
}: {
  bucket: "avatars" | "item-images";
  userId: string;
  file: File;
}) {
  const supabase = createClient();
  const path = `${userId}/${safeFileName(file.name)}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    cacheControl: "3600"
  });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
}
