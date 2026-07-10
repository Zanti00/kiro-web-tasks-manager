"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const title = (formData.get("title") as string)?.trim();

  if (!title) {
    return { error: "Title cannot be empty." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("tasks").insert({
    title,
    user_id: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateTask(id: string, title: string) {
  const supabase = await createClient();
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return { error: "Title cannot be empty." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ title: trimmedTitle })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteTask(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function toggleTask(id: string, isComplete: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ is_complete: isComplete })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
