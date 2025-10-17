// pages/perfil.js
import { supabase } from "../core/supabase.js";
import { showToast } from "../auth/auth-utils.js";

export class ProfileManager {
  constructor() {
    this.init();
  }

  async init() {
    // Verificación inmediata
    if (!this.checkAuth()) {
      this.redirectToHome();
      return;
    }

    // Si está autenticado, cargar datos
    await this.loadUserData();
    this.setupEventListeners();
    this.setupTabNavigation();
  }

  checkAuth() {
    if (!window.currentUser) {
      console.log("No hay usuario autenticado - redirigiendo al home");
      return false;
    }

    return true;
  }

  redirectToHome() {
    // Mostrar toast
    showToast("Debes iniciar sesión para acceder al perfil", "warning");

    // Redirigir inmediatamente
    setTimeout(() => {
      window.history.replaceState(null, "", "#home");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, 100);
  }

  async loadUserData() {
    try {
      const user = window.currentUser;

      if (user.id && (!user.nombre || !user.apellido)) {
        await this.loadUserFromSupabase(user.id);
      } else {
        this.updateUI(user);
      }
    } catch (error) {
      console.error("Error cargando datos del usuario:", error);
      showToast("Error al cargar los datos del perfil", "error");
    }
  }

  async loadUserFromSupabase(userId) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data) {
        Object.assign(window.currentUser, data);
        this.updateUI(window.currentUser);
      }
    } catch (error) {
      console.error("Error cargando usuario desde Supabase:", error);
      this.updateUI(window.currentUser);
    }
  }

  updateUI(user) {
    this.updateSidebar(user);
    this.populateForm(user);
  }

  updateSidebar(user) {
    const avatar = document.getElementById("profile-avatar");
    const name = document.getElementById("profile-name");
    const email = document.getElementById("profile-email");
    const badge = document.getElementById("profile-badge");

    if (avatar) {
      const initials = this.generateInitials(user);
      avatar.src = this.createAvatarPlaceholder(initials);
      avatar.alt = `${user.nombre || user.display_name || "Usuario"} Avatar`;
    }

    if (name) {
      name.textContent =
        user.display_name ||
        `${user.nombre || ""} ${user.apellido || ""}`.trim() ||
        "Usuario";
    }

    if (email) {
      email.textContent = user.email || "usuario@ejemplo.com";
    }

    if (badge) {
      badge.textContent = user.rol === "admin" ? "Administrador" : "Usuario";
      badge.className = `badge px-3 py-2 fw-bold ${
        user.rol === "admin" ? "bg-warning" : "bg-secondary"
      }`;
    }
  }

  generateInitials(user) {
    if (user.nombre && user.apellido) {
      return (user.nombre.charAt(0) + user.apellido.charAt(0)).toUpperCase();
    } else if (user.display_name) {
      return user.display_name
        .split(" ")
        .map((n) => n.charAt(0))
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    return "US";
  }

  createAvatarPlaceholder(initials) {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");

    const colors = [
      "#007bff",
      "#28a745",
      "#dc3545",
      "#6f42c1",
      "#e83e8c",
      "#fd7e14",
    ];
    const colorIndex = initials.charCodeAt(0) % colors.length;

    ctx.fillStyle = colors[colorIndex];
    ctx.fillRect(0, 0, 100, 100);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, 50, 50);

    return canvas.toDataURL();
  }

  populateForm(user) {
    document.getElementById("nombre").value = user.nombre || "";
    document.getElementById("apellido").value = user.apellido || "";
    document.getElementById("email").value = user.email || "";
    document.getElementById("telefono").value = user.telefono || "";
    document.getElementById("dni").value = user.dni || "";
  }

  setupEventListeners() {
    const profileForm = document.getElementById("profile-form");
    if (profileForm) {
      profileForm.addEventListener("submit", (e) =>
        this.handleProfileUpdate(e)
      );
    }

    const passwordForm = document.getElementById("change-password-form");
    if (passwordForm) {
      passwordForm.addEventListener("submit", (e) => {
        e.preventDefault();
        showToast(
          "La funcionalidad de cambio de contraseña estará disponible pronto",
          "info"
        );
      });
    }

    const deleteModal = document.getElementById("deleteAccountModal");
    if (deleteModal) {
      deleteModal.addEventListener("show.bs.modal", () => {
        this.setupDeleteModal();
      });
    }
  }

  setupTabNavigation() {
    const tabLinks = document.querySelectorAll("[data-profile-tab]");

    tabLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();

        tabLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");

        const tabName = link.getAttribute("data-profile-tab");
        this.showTab(tabName);
      });
    });
  }

  showTab(tabName) {
    document.getElementById("datos-personales-panel").classList.add("d-none");
    document.getElementById("seguridad-panel").classList.add("d-none");

    const selectedPanel = document.getElementById(`${tabName}-panel`);
    if (selectedPanel) {
      selectedPanel.classList.remove("d-none");
    }
  }

  async handleProfileUpdate(e) {
    e.preventDefault();

    const saveButton = document.getElementById("save-profile-btn");
    const buttonText = saveButton.querySelector(".btn-text");
    const buttonLoader = saveButton.querySelector(".btn-loader");

    try {
      buttonText.textContent = "Guardando...";
      buttonLoader.classList.remove("d-none");
      saveButton.disabled = true;

      const user = window.currentUser;
      if (!user) {
        throw new Error("No hay usuario autenticado");
      }

      const profileData = {
        nombre: document.getElementById("nombre").value.trim(),
        apellido: document.getElementById("apellido").value.trim(),
        telefono: document.getElementById("telefono").value.trim(),
        dni: document.getElementById("dni").value.trim(),
        updated_at: new Date().toISOString(),
      };

      if (!profileData.nombre) {
        throw new Error("El nombre es requerido");
      }

      if (!profileData.apellido) {
        throw new Error("El apellido es requerido");
      }

      const { data, error } = await supabase
        .from("users")
        .update(profileData)
        .eq("id", user.id)
        .select();

      if (error) throw error;

      Object.assign(user, profileData);
      window.currentUser = user;

      this.updateSidebar(user);
      showToast("Perfil actualizado correctamente", "success");
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      showToast(error.message || "Error al actualizar el perfil", "error");
    } finally {
      buttonText.textContent = "Guardar cambios";
      buttonLoader.classList.add("d-none");
      saveButton.disabled = false;
    }
  }

  setupDeleteModal() {
    const confirmCheckbox = document.getElementById("confirmDelete");
    const deletePassword = document.getElementById("deletePassword");
    const confirmButton = document.getElementById("confirmDeleteAccount");

    confirmCheckbox.checked = false;
    deletePassword.value = "";
    confirmButton.disabled = true;

    const validateDeleteButton = () => {
      confirmButton.disabled = !(
        confirmCheckbox.checked && deletePassword.value.length >= 6
      );
    };

    confirmCheckbox.addEventListener("change", validateDeleteButton);
    deletePassword.addEventListener("input", validateDeleteButton);

    confirmButton.addEventListener("click", () => {
      showToast(
        "La funcionalidad de eliminar cuenta estará disponible pronto",
        "info"
      );

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("deleteAccountModal")
      );
      modal.hide();
    });
  }
}

export function initProfilePage() {
  new ProfileManager();
}
