// app.js
import { supabase, checkAuth } from "./core/supabase.js";
import { AuthManager, initAuthForms } from "./auth/auth-export.js";
import { Router } from "./core/router.js";

// Inicializar la aplicación
class App {
  constructor() {
    this.router = new Router();
    this.authManager = new AuthManager();
    this.init();
  }

  async init() {
    // Cargar componentes estáticos
    await this.loadStaticComponents();

    // Inicializar router
    this.router.init();

    // Inicializar formularios de autenticación DESPUÉS de cargar los componentes
    initAuthForms(this.authManager);

    // Verificar autenticación al cargar
    await this.authManager.checkAuthState();

    // Configurar event listeners globales
    this.setupGlobalListeners();
  }

  async loadStaticComponents() {
    try {
      // Cargar navbar
      const navbarResponse = await fetch("./components/nav.html");
      const navbarHTML = await navbarResponse.text();
      document.getElementById("navbar").innerHTML = navbarHTML;

      // Cargar footer
      const footerResponse = await fetch("./components/footer.html");
      const footerHTML = await footerResponse.text();
      document.getElementById("footer").innerHTML = footerHTML;

      // Cargar modales de auth
      const authModalsResponse = await fetch("./components/auth-modals.html");
      const authModalsHTML = await authModalsResponse.text();
      document.getElementById("auth-modals").innerHTML = authModalsHTML;

      console.log("Componentes estáticos cargados correctamente");
    } catch (error) {
      console.error("Error cargando componentes:", error);
    }
  }

  setupGlobalListeners() {
    // Delegación de eventos para links SPA
    document.addEventListener("click", (e) => {
      if (e.target.matches("[data-spa-link]")) {
        e.preventDefault();
        const page = e.target.getAttribute("data-spa-link");
        this.router.navigateTo(page);
      }
    });

    // Manejar navegación del browser
    window.addEventListener("popstate", (e) => {
      this.router.handlePopState(e);
    });
  }
}

// Inicializar la app cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  new App();
});

// Exportar para uso global si es necesario
window.App = App;
