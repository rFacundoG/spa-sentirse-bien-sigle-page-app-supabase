import { supabase } from "../core/supabase.js";

export async function loadUserProfile(authManager, userId) {
  try {
    console.log("Loading user profile for:", userId);

    const { data, error } = await supabase
      .from("users")
      .select(
        "id, dni, nombre, apellido, telefono, email, rol, is_active, created_at, updated_at"
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error loading user profile:", error);

      if (error.code === "PGRST116" || error.details?.includes("0 rows")) {
        console.log("User profile not found, creating new one...");
        await createUserProfile(userId);
        return await getBasicUserProfile(authManager, userId);
      }
      throw error;
    }

    if (!data) {
      console.log("No user profile data, creating...");
      await createUserProfile(userId);
      return await getBasicUserProfile(authManager, userId);
    }

    // Enriquecer con metadata de auth
    await enrichWithAuthMetadata(data);

    authManager.currentUser = data;
    window.currentUser = data;

    console.log("User profile loaded successfully:", data);
    return data;
  } catch (error) {
    console.error("Error in loadUserProfile:", error);
    return await getBasicUserProfile(authManager, userId);
  }
}

async function getBasicUserProfile(authManager, userId) {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userData = {
      id: userId,
      dni: "",
      nombre: "",
      apellido: "",
      telefono: "",
      email: authData.user?.email || "",
      rol: "user",
      is_active: true,
      display_name:
        authData.user?.user_metadata?.display_name ||
        authData.user?.user_metadata?.name ||
        "Usuario",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    authManager.currentUser = userData;
    window.currentUser = userData;

    return userData;
  } catch (error) {
    console.error("Error creating basic profile:", error);
    return null;
  }
}

async function enrichWithAuthMetadata(userData) {
  try {
    const { data: authData } = await supabase.auth.getUser();

    if (authData.user?.user_metadata?.display_name) {
      userData.display_name = authData.user.user_metadata.display_name;
    } else if (authData.user?.user_metadata?.name) {
      userData.display_name = authData.user.user_metadata.name;
    } else {
      userData.display_name = "Usuario";
    }
  } catch (error) {
    console.error("Error enriching with auth metadata:", error);
    userData.display_name = "Usuario";
  }
}

export async function createUserProfile(userId) {
  try {
    console.log("Creating user profile for:", userId);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      throw new Error("No authenticated user found");
    }

    const userData = {
      id: userId,
      dni: "",
      nombre: "",
      apellido: "",
      telefono: "",
      email: authData.user.email,
      rol: "user",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("Inserting user profile:", userData);

    const { error } = await supabase.from("users").insert([userData]);

    if (error) {
      console.warn("User profile creation failed (non-critical):", error);
      return null;
    }

    console.log("User profile created successfully");
    return userData;
  } catch (error) {
    console.error("Error in createUserProfile:", error);
    return null;
  }
}
