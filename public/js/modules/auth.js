import { supabase, checkAuth, getUserProfile } from "../core/supabase.js";

export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.setupAuthListeners();
  }

  setupAuthListeners() {
    // Escuchar cambios de autenticación
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Cambio de estado de auth:", event, session);

      if (event === "SIGNED_IN" && session) {
        await this.handleSignIn(session.user);
      } else if (event === "SIGNED_OUT") {
        this.handleSignOut();
      }
    });
  }

  async checkAuthState() {
    try {
      const { session, error } = await checkAuth();

      if (error) {
        console.error("Error verificando auth:", error);
        this.showAuthButtons();
        return;
      }

      if (session?.user) {
        await this.handleSignIn(session.user);
      } else {
        this.showAuthButtons();
      }
    } catch (error) {
      console.error("Error en checkAuthState:", error);
      this.showAuthButtons();
    }
  }

  async handleSignIn(user) {
    try {
      this.currentUser = user;
      const { data: profile, error } = await getUserProfile(user.id);

      if (error) {
        console.error("Error obteniendo perfil:", error);
      }

      this.showUserDropdown(user, profile);
      this.updateUIForAuth(user, profile);
    } catch (error) {
      console.error("Error en handleSignIn:", error);
    }
  }

  handleSignOut() {
    this.currentUser = null;
    this.showAuthButtons();
    this.updateUIForUnauth();
  }

  showAuthButtons() {
    document.getElementById("authSkeleton").style.display = "none";
    document.getElementById("authButtons").style.display = "block";
    document.getElementById("authUser").style.display = "none";
  }

  showUserDropdown(user, profile) {
    document.getElementById("authSkeleton").style.display = "none";
    document.getElementById("authButtons").style.display = "none";
    document.getElementById("authUser").style.display = "block";

    // Cargar template del dropdown del usuario
    this.loadUserDropdown(user, profile);
  }

  async loadUserDropdown(user, profile) {
    try {
      const response = await fetch("./components/user-dropdown.html");
      const dropdownHTML = await response.text();
      document.getElementById("authUser").innerHTML = dropdownHTML;

      // Actualizar información del usuario en el dropdown
      this.updateUserDropdownInfo(user, profile);
    } catch (error) {
      console.error("Error cargando user dropdown:", error);
    }
  }

  updateUserDropdownInfo(user, profile) {
    const userAvatar = document.querySelector(".user-avatar");
    const userName = document.querySelector(".user-name");
    const userEmail = document.querySelector(".user-email");

    if (userAvatar) {
      userAvatar.textContent = user.email?.charAt(0).toUpperCase() || "U";
    }

    if (userName) {
      userName.textContent = profile?.full_name || user.email;
    }

    if (userEmail) {
      userEmail.textContent = user.email;
    }

    // Configurar evento de logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.signOut());
    }
  }

  updateUIForAuth(user, profile) {
    // Actualizar cualquier parte de la UI que dependa de la autenticación
    console.log("Usuario autenticado:", user);
  }

  updateUIForUnauth() {
    // Restablecer UI para usuario no autenticado
    console.log("Usuario no autenticado");
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      console.log("Sesión cerrada correctamente");
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  }
}

// Hacer disponible globalmente para los modales
window.AuthManager = AuthManager;
