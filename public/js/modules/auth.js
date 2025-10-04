// modules/auth.js
import { supabase } from "../core/supabase.js";

export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.initAuthListeners();
  }

  // Inicializar listeners de autenticación
  initAuthListeners() {
    // Escuchar cambios en el estado de autenticación
    supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      this.handleAuthChange(event, session);
    });
  }

  // Manejar cambios en la autenticación
  async handleAuthChange(event, session) {
    switch (event) {
      case "SIGNED_IN":
        await this.handleSignedIn(session);
        break;
      case "SIGNED_OUT":
        this.handleSignedOut();
        break;
      case "TOKEN_REFRESHED":
        await this.handleTokenRefreshed(session);
        break;
      case "USER_UPDATED":
        await this.handleUserUpdated(session);
        break;
    }
  }

  // Manejar inicio de sesión
  async handleSignedIn(session) {
    if (session?.user) {
      await this.loadUserProfile(session.user.id);
      this.updateUI();
    }
  }

  // Manejar cierre de sesión
  handleSignedOut() {
    this.currentUser = null;
    window.currentUser = null;
    this.updateUI();
  }

  // Manejar token refrescado
  async handleTokenRefreshed(session) {
    if (session?.user) {
      await this.loadUserProfile(session.user.id);
    }
  }

  // Manejar usuario actualizado
  async handleUserUpdated(session) {
    if (session?.user) {
      await this.loadUserProfile(session.user.id);
      this.updateUI();
    }
  }

  // Verificar estado de autenticación al cargar la app
  async checkAuthState() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Error checking auth state:", error);
        return;
      }

      if (session?.user) {
        await this.handleSignedIn(session);
      } else {
        this.handleSignedOut();
      }
    } catch (error) {
      console.error("Error in checkAuthState:", error);
    }
  }

  // Cargar perfil del usuario desde la tabla users
  async loadUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error loading user profile:", error);

        // Si el usuario no existe en la tabla users, crearlo
        if (error.code === "PGRST116") {
          const { data: authUser } = await supabase.auth.getUser();
          if (authUser.user) {
            await this.createUserProfile(userId, authUser.user.email);
            return await this.loadUserProfile(userId);
          }
        }
        return;
      }

      // Obtener display name del metadata de auth
      const { data: authData } = await supabase.auth.getUser();
      let displayName = "Usuario";

      if (authData.user?.user_metadata?.display_name) {
        displayName = authData.user.user_metadata.display_name;
      } else if (authData.user?.user_metadata?.name) {
        displayName = authData.user.user_metadata.name;
      }

      // Agregar display name al objeto currentUser
      data.display_name = displayName;

      this.currentUser = data;
      window.currentUser = data;
      console.log("User profile loaded with display name:", data);
    } catch (error) {
      console.error("Error in loadUserProfile:", error);
    }
  }

  // Crear perfil de usuario en la tabla users (campos vacíos)
  async createUserProfile(userId, userEmail) {
    try {
      const userData = {
        id: userId,
        dni: "",
        nombre: "",
        apellido: "",
        telefono: "",
        email: userEmail,
        rol: "user",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Creating user profile with empty fields:", userData);

      const { error } = await supabase.from("users").insert([userData]);

      if (error) {
        console.error("Error creating user profile:", error);
        return;
      }

      console.log("User profile created successfully with empty fields");
    } catch (error) {
      console.error("Error in createUserProfile:", error);
    }
  }

  // Iniciar sesión con email y contraseña
  async login(email, password) {
    try {
      // Mostrar loader
      this.showLoginLoader(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      console.log("Login successful:", data);
      return { success: true, data };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    } finally {
      this.showLoginLoader(false);
    }
  }

  // Registrar nuevo usuario
  async register(displayName, email, password) {
    try {
      // Mostrar loader
      this.showRegisterLoader(true);

      // Registrar en Auth de Supabase con display name en metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            display_name: displayName.trim(),
            name: displayName.trim(),
          },
        },
      });

      if (authError) {
        throw authError;
      }

      console.log("Registration successful:", authData);

      // Crear perfil en tabla users con campos vacíos
      if (authData.user) {
        await this.createUserProfile(authData.user.id, authData.user.email);
      }

      return {
        success: true,
        data: authData,
        message: "Usuario registrado exitosamente.",
      };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    } finally {
      this.showRegisterLoader(false);
    }
  }

  // Cerrar sesión
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      this.currentUser = null;
      window.currentUser = null;
      this.updateUI();

      console.log("Logout successful");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  // Actualizar UI basado en el estado de autenticación
  updateUI() {
    const authSkeleton = document.getElementById("authSkeleton");
    const authButtons = document.getElementById("authButtons");
    const authUser = document.getElementById("authUser");

    if (authSkeleton && authButtons && authUser) {
      // Ocultar skeleton
      authSkeleton.style.display = "none";

      if (this.currentUser) {
        // Usuario autenticado - mostrar dropdown y ocultar botones
        authButtons.style.display = "none";
        authUser.style.display = "block";
        this.loadUserDropdown();
      } else {
        // Usuario no autenticado - mostrar botones y ocultar dropdown
        authButtons.style.display = "flex";
        authUser.style.display = "none";
      }
    }
  }

  // Cargar dropdown del usuario
  async loadUserDropdown() {
    const authUser = document.getElementById("authUser");
    if (!authUser) return;

    try {
      const response = await fetch("./components/user-dropdown.html");
      const dropdownHTML = await response.text();
      authUser.innerHTML = dropdownHTML;

      // Actualizar información del usuario
      this.updateUserDropdownInfo();

      // Agregar event listener para logout
      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", () => this.logout());
      }
    } catch (error) {
      console.error("Error loading user dropdown:", error);
    }
  }

  // Actualizar información en el dropdown del usuario
  updateUserDropdownInfo() {
    if (!this.currentUser) return;

    // Actualizar avatar en el botón (usar display name)
    const userAvatar = document.querySelector(".user-avatar");
    if (userAvatar) {
      const initials = this.getUserInitials();
      userAvatar.textContent = initials;
    }

    // Actualizar nombre en el dropdown (usar display name)
    const userName = document.querySelector(".user-name");
    if (userName) {
      // Usar display_name si existe, sino usar primera letra del email
      if (this.currentUser.display_name) {
        userName.textContent = this.currentUser.display_name;
      } else {
        userName.textContent = this.currentUser.email.split("@")[0];
      }
    }

    // Actualizar email
    const userEmail = document.querySelector(".user-email");
    if (userEmail) {
      userEmail.textContent = this.currentUser.email;
    }
  }

  // Obtener iniciales del usuario (usar display name)
  getUserInitials() {
    // Prioridad 1: Display name del metadata
    if (this.currentUser?.display_name) {
      const names = this.currentUser.display_name.split(" ");
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return this.currentUser.display_name[0].toUpperCase();
    }

    // Prioridad 2: Nombre real de la tabla (si lo completó)
    if (this.currentUser?.nombre && this.currentUser?.apellido) {
      return (
        this.currentUser.nombre[0] + this.currentUser.apellido[0]
      ).toUpperCase();
    } else if (this.currentUser?.nombre) {
      return this.currentUser.nombre[0].toUpperCase();
    }

    // Prioridad 3: Email
    if (this.currentUser?.email) {
      return this.currentUser.email[0].toUpperCase();
    }

    return "U";
  }

  // Mostrar/ocultar loader del login
  showLoginLoader(show) {
    const loginButton = document.getElementById("loginButton");
    const loginLoader = document.getElementById("loginLoader");

    if (loginButton && loginLoader) {
      if (show) {
        loginButton.disabled = true;
        loginButton.classList.add("btn-loading");
        loginLoader.style.display = "block";
      } else {
        loginButton.disabled = false;
        loginButton.classList.remove("btn-loading");
        loginLoader.style.display = "none";
      }
    }
  }

  // Mostrar/ocultar loader del registro
  showRegisterLoader(show) {
    const registerButton = document.querySelector(
      '#formRegister button[type="submit"]'
    );

    if (registerButton) {
      if (show) {
        registerButton.disabled = true;
        registerButton.classList.add("btn-loading");
        registerButton.innerHTML =
          '<div class="spinner-border spinner-border-sm me-2" role="status"></div>';
      } else {
        registerButton.disabled = false;
        registerButton.classList.remove("btn-loading");
        registerButton.innerHTML =
          '<i class="bi bi-person-plus me-2"></i> Crear cuenta';
      }
    }
  }

  // Obtener mensaje de error amigable
  getErrorMessage(error) {
    switch (error.message) {
      case "Invalid login credentials":
        return "Email o contraseña incorrectos.";
      case "Email not confirmed":
        return "Por favor verifica tu email antes de iniciar sesión.";
      case "User already registered":
        return "Este email ya está registrado.";
      case "Password should be at least 6 characters":
        return "La contraseña debe tener al menos 6 caracteres.";
      case "To signup, please provide your email":
        return "Por favor proporciona un email válido.";
      default:
        return (
          error.message || "Ha ocurrido un error. Por favor intenta nuevamente."
        );
    }
  }

  // Verificar si el usuario está autenticado
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Obtener usuario actual
  getCurrentUser() {
    return this.currentUser;
  }
}

// Inicializar event listeners para los formularios de auth
export function initAuthForms(authManager) {
  console.log("Initializing auth forms...");

  // Inicializar floating labels
  initFloatingLabels();

  // Formulario de login
  const formLogin = document.getElementById("formLogin");
  if (formLogin) {
    // Remover event listener anterior si existe
    formLogin.removeEventListener("submit", formLogin._submitHandler);

    formLogin._submitHandler = async (e) => {
      e.preventDefault();
      console.log("Login form submitted");

      const displayName = document.getElementById("registerName").value; 
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      console.log("Register attempt:", { displayName, email, password });

      const result = await authManager.register(displayName, email, password);

      if (result.success) {
        // Cerrar modal
        const loginModal = bootstrap.Modal.getInstance(
          document.getElementById("loginModal")
        );
        if (loginModal) {
          loginModal.hide();
        }

        // Limpiar formulario
        formLogin.reset();

        // Mostrar mensaje de éxito
        showToast("¡Bienvenido! Has iniciado sesión correctamente.", "success");
      } else {
        // Mostrar error
        showToast(result.error, "error");
      }
    };

    formLogin.addEventListener("submit", formLogin._submitHandler);
    console.log("Login form initialized");
  } else {
    console.log("Login form not found");
  }

  // Formulario de registro
  const formRegister = document.getElementById("formRegister");
  if (formRegister) {
    // Remover event listener anterior si existe
    formRegister.removeEventListener("submit", formRegister._submitHandler);

    formRegister._submitHandler = async (e) => {
      e.preventDefault();
      console.log("Register form submitted");

      const name = document.getElementById("registerName").value;
      const email = document.getElementById("registerEmail").value;
      const password = document.getElementById("registerPassword").value;

      console.log("Register attempt:", { name, email, password });

      const result = await authManager.register(name, email, password);

      if (result.success) {
        // Cerrar modal
        const registerModal = bootstrap.Modal.getInstance(
          document.getElementById("registerModal")
        );
        if (registerModal) {
          registerModal.hide();
        }

        // Limpiar formulario
        formRegister.reset();

        // Mostrar mensaje de éxito
        showToast(result.message, "success");
      } else {
        // Mostrar error
        showToast(result.error, "error");
      }
    };

    formRegister.addEventListener("submit", formRegister._submitHandler);
    console.log("Register form initialized");
  } else {
    console.log("Register form not found");
  }

  // Inicializar toggles de contraseña
  initPasswordToggles();
}

// Inicializar toggles de contraseña
function initPasswordToggles() {
  // Usar delegación de eventos para manejar los toggles dinámicamente
  document.addEventListener("click", (e) => {
    if (e.target.closest(".toggle-password")) {
      const button = e.target.closest(".toggle-password");
      const input = button.parentElement.querySelector("input");
      const icon = button.querySelector("i");

      if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("bi-eye-slash");
        icon.classList.add("bi-eye");
      } else {
        input.type = "password";
        icon.classList.remove("bi-eye");
        icon.classList.add("bi-eye-slash");
      }
    }
  });

  // También inicializar los que ya existen
  document.querySelectorAll(".toggle-password").forEach((button) => {
    const input = button.parentElement.querySelector("input");
    const icon = button.querySelector("i");

    if (input && icon) {
      button.addEventListener("click", () => {
        if (input.type === "password") {
          input.type = "text";
          icon.classList.remove("bi-eye-slash");
          icon.classList.add("bi-eye");
        } else {
          input.type = "password";
          icon.classList.remove("bi-eye");
          icon.classList.add("bi-eye-slash");
        }
      });
    }
  });
}

function initFloatingLabels() {
  // Inicializar labels flotantes
  document.querySelectorAll(".custom-input").forEach((input) => {
    // Verificar si ya tiene valor al cargar
    if (input.value) {
      input.classList.add("has-value");
    }

    // Manejar eventos
    input.addEventListener("input", function () {
      if (this.value) {
        this.classList.add("has-value");
      } else {
        this.classList.remove("has-value");
      }
    });

    input.addEventListener("focus", function () {
      this.classList.add("has-value");
    });

    input.addEventListener("blur", function () {
      if (!this.value) {
        this.classList.remove("has-value");
      }
    });
  });
}

// Función para mostrar toasts (notificaciones)
function showToast(message, type = "info") {
  // Crear toast container si no existe
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className = "toast-container position-fixed top-0 end-0 p-3";
    document.body.appendChild(toastContainer);
  }

  const toastId = "toast-" + Date.now();
  const bgColor =
    type === "success"
      ? "bg-success"
      : type === "error"
      ? "bg-danger"
      : "bg-info";

  const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgColor} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

  toastContainer.insertAdjacentHTML("beforeend", toastHTML);

  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement);
  toast.show();

  // Remover el toast del DOM cuando se oculte
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}
