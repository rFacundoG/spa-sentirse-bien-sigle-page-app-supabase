import { supabase } from "../core/supabase.js";

export class AdminStats {
  constructor(adminManager) {
    this.adminManager = adminManager;
  }

  async loadAdminStats() {
    try {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id", { count: "exact" });

      const { data: professionals, error: prosError } = await supabase
        .from("professionals")
        .select("id", { count: "exact" });

      if (!usersError && !prosError) {
        const statsElement = document.getElementById("admin-stats");
        if (statsElement) {
          statsElement.textContent = `${users.length} usuarios, ${professionals.length} profesionales`;
        }
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }
}
