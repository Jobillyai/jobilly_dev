"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { combineFirstLastName } from "@/lib/format-person-name";
import { parseExperienceYears } from "@/lib/format-experience-years";
import {
  CANDIDATE_GENDER_OPTIONS,
  parseGraduationYear,
} from "@/lib/candidate-profile-options";
import {
  CANDIDATE_LOCATION_OPTIONS,
  getTimezoneForLocation,
  isValidIanaTimezone,
} from "@/lib/candidate-location-options";
import { createClient } from "@/server/db/supabase-server";
import { createAdminClient } from "@/server/db/supabase-admin";
import { saveCandidateResumeFile } from "@/server/services/resume-storage";
import { RESUME_MIME_TYPES } from "@/lib/resume-mime";

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

const genderValues = CANDIDATE_GENDER_OPTIONS.map((option) => option.value);

function buildEducationSummary(input: {
  specialization?: string;
  graduationCollege?: string;
  graduationYear?: number | null;
}): string | null {
  const parts = [
    input.specialization?.trim(),
    input.graduationCollege?.trim(),
    input.graduationYear ? `Class of ${input.graduationYear}` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" · ") : null;
}

const profileSchema = z.object({
  firstName: z.string().min(1, "Enter your first name").max(100),
  lastName: z.string().min(1, "Enter your last name").max(100),
  careerGoals: z.string().max(1000).optional(),
  experienceYears: z
    .string()
    .optional()
    .transform((value) => parseExperienceYears(value ?? "")),
  gender: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? "")
    .refine((value) => (genderValues as string[]).includes(value), "Select a valid gender option"),
  graduationCollege: z.string().max(200).optional(),
  graduationYear: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? "")
    .refine(
      (value) => !value || parseGraduationYear(value) !== null,
      `Enter a valid year between 1950 and ${new Date().getFullYear() + 1}`,
    )
    .transform((value) => (value ? parseGraduationYear(value) : null)),
  specialization: z.string().max(200).optional(),
  workExperience: z.string().max(2000).optional(),
  location: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? "")
    .refine(
      (value) =>
        !value ||
        CANDIDATE_LOCATION_OPTIONS.some((option) => option.value === value),
      "Select a valid location",
    ),
  timezone: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? "")
    .refine(
      (value) => !value || isValidIanaTimezone(value),
      "Timezone could not be determined for this location",
    ),
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
    Record<
      | "firstName"
      | "lastName"
      | "careerGoals"
      | "experienceYears"
      | "gender"
      | "graduationCollege"
      | "graduationYear"
      | "specialization"
      | "workExperience"
      | "location"
      | "timezone"
      | "linkedinUrl",
      string
    >
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
  revalidatePath("/admin");
  revalidatePath("/admin/profile");

  return { avatarUrl };
}

export async function uploadProfileResumeAction(
  formData: FormData,
): Promise<{ resumeUrl?: string; fileName?: string; error?: string }> {
  const file = formData.get("resume");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF or Word resume to upload." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "Resume must be 5 MB or smaller." };
  }

  if (!(RESUME_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { error: "Use a PDF or Word document (.pdf, .doc, .docx)." };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { error: "You must be logged in to upload a resume." };
  }

  try {
    const saved = await saveCandidateResumeFile({
      userId: authData.user.id,
      fileName: file.name,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/career-advisory");
    revalidatePath("/admin/candidates");

    return { resumeUrl: saved.resumeUrl, fileName: file.name };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not upload resume.",
    };
  }
}

export async function updateProfileAction(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    careerGoals: formData.get("careerGoals") || undefined,
    experienceYears: formData.get("experienceYears")?.toString() || undefined,
    gender: formData.get("gender")?.toString() ?? "",
    graduationCollege: formData.get("graduationCollege") || undefined,
    graduationYear: formData.get("graduationYear")?.toString() || undefined,
    specialization: formData.get("specialization") || undefined,
    workExperience: formData.get("workExperience") || undefined,
    location: formData.get("location")?.toString() ?? "",
    timezone: formData.get("timezone")?.toString() ?? "",
    linkedinUrl: formData.get("linkedinUrl") || undefined,
    avatarUrl: formData.get("avatarUrl") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<ProfileState["fieldErrors"]> = {};
    const allowedKeys = new Set([
      "firstName",
      "lastName",
      "careerGoals",
      "experienceYears",
      "gender",
      "graduationCollege",
      "graduationYear",
      "specialization",
      "workExperience",
      "location",
      "timezone",
      "linkedinUrl",
    ] as const);

    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && allowedKeys.has(key as keyof typeof fieldErrors)) {
        fieldErrors[key as keyof typeof fieldErrors] = issue.message;
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
  const {
    firstName,
    lastName,
    careerGoals,
    experienceYears,
    gender,
    graduationCollege,
    graduationYear,
    specialization,
    workExperience,
    location,
    timezone: submittedTimezone,
    linkedinUrl,
    avatarUrl,
  } = parsed.data;
  const education = buildEducationSummary({
    specialization,
    graduationCollege,
    graduationYear,
  });
  const name = combineFirstLastName(firstName, lastName);
  const mappedTimezone = location ? getTimezoneForLocation(location) : null;
  const derivedTimezone = location
    ? mappedTimezone ||
      (submittedTimezone && isValidIanaTimezone(submittedTimezone)
        ? submittedTimezone
        : null)
    : null;

  if (location && !derivedTimezone) {
    return {
      fieldErrors: {
        location: "Could not determine timezone for this location.",
      },
    };
  }

  const existingAvatar =
    typeof authData.user.user_metadata?.avatar_url === "string"
      ? authData.user.user_metadata.avatar_url
      : undefined;

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      name,
      avatar_url: avatarUrl || existingAvatar || null,
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  const { error: userError } = await supabase
    .from("users")
    .update({
      name,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    })
    .eq("id", userId);

  if (userError) {
    return { error: userError.message };
  }

  const { error: profileError } = await supabase.from("candidate_profiles").upsert(
    {
      user_id: userId,
      education: education || null,
      career_goals: careerGoals || null,
      experience_years: experienceYears,
      gender: gender || null,
      graduation_college: graduationCollege || null,
      graduation_year: graduationYear,
      specialization: specialization || null,
      work_experience: workExperience || null,
      location: location || null,
      timezone: derivedTimezone,
      linkedin_url: linkedinUrl || null,
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/admin");
  revalidatePath("/admin/profile");
  revalidatePath("/admin/candidates");

  return { success: true };
}
