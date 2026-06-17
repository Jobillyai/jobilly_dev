"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/server/db/supabase-server";
import { createAdminClient } from "@/server/db/supabase-admin";

const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function ensureAvatarsBucket() {
  const admin = createAdminClient();
  const { data: buckets, error: listError } = await admin.storage.listBuckets();

  if (listError) {
    return { error: listError.message };
  }

  if (buckets?.some((bucket) => bucket.name === "avatars")) {
    return {};
  }

  const { error: createError } = await admin.storage.createBucket("avatars", {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: AVATAR_MIME_TYPES,
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    return { error: createError.message };
  }

  return {};
}

const profileSchema = z.object({
  name: z.string().min(1, "Enter your name").max(200),
  education: z.string().max(500).optional(),
  careerGoals: z.string().max(1000).optional(),
  linkedinUrl: z
    .string()
    .max(300)
    .optional()
    .refine(
      (value) => !value || value === "" || /^https?:\/\/.+/i.test(value),
      "Enter a valid URL starting with http:// or https://",
    ),
  avatarUrl: z
    .string()
    .max(500)
    .optional()
    .refine(
      (value) => !value || value === "" || /^https?:\/\/.+/i.test(value),
      "Invalid photo URL.",
    ),
});

export type ProfileState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<"name" | "education" | "careerGoals" | "linkedinUrl", string>
  >;
};

export async function uploadAvatarAction(
  formData: FormData,
): Promise<{ avatarUrl?: string; error?: string }> {
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "Image must be 5 MB or smaller." };
  }

  const allowedTypes = AVATAR_MIME_TYPES;
  if (!allowedTypes.includes(file.type)) {
    return { error: "Use a JPG, PNG, WebP, or GIF image." };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { error: "You must be logged in to upload a photo." };
  }

  const bucketReady = await ensureAvatarsBucket();
  if (bucketReady.error) {
    return { error: bucketReady.error };
  }

  const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `${authData.user.id}/avatar.${extension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, fileBuffer, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: publicData } = admin.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${publicData.publicUrl}?t=${Date.now()}`;

  const { error: authError } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });

  if (authError) {
    return { error: authError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");

  return { avatarUrl };
}

export async function updateProfileAction(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    education: formData.get("education") || undefined,
    careerGoals: formData.get("careerGoals") || undefined,
    linkedinUrl: formData.get("linkedinUrl") || undefined,
    avatarUrl: formData.get("avatarUrl") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<ProfileState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        key === "name" ||
        key === "education" ||
        key === "careerGoals" ||
        key === "linkedinUrl"
      ) {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { error: "You must be logged in to update your profile." };
  }

  const userId = authData.user.id;
  const { name, education, careerGoals, linkedinUrl, avatarUrl } = parsed.data;

  const existingAvatar =
    typeof authData.user.user_metadata?.avatar_url === "string"
      ? authData.user.user_metadata.avatar_url
      : undefined;

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      name,
      avatar_url: avatarUrl || existingAvatar || null,
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  const { error: userError } = await supabase
    .from("users")
    .update({ name })
    .eq("id", userId);

  if (userError) {
    return { error: userError.message };
  }

  const { error: profileError } = await supabase.from("candidate_profiles").upsert(
    {
      user_id: userId,
      education: education || null,
      career_goals: careerGoals || null,
      linkedin_url: linkedinUrl || null,
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");

  return { success: true };
}
