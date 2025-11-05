import { serviciosManager } from "../modules/services/index.js";

export class Router {
  constructor() {
    this.routes = {
      home: "./pages/home.html",
      servicios: "./pages/servicios.html",
      contacto: "./pages/contacto.html",
      productos: "./pages/productos.html",
      perfil: "./pages/perfil.html",
      reservas: "./pages/reservas.html",
      admin: "./pages/admin.html",
      "producto-detalle": "./pages/producto-detalle.html",
    };
    this.currentPage = "home";
    this.isNavigating = false;
  }

  init() {
    // Cargar página inicial basada en la URL
    const path = window.location.hash.replace("#", "") || "home";
    this.navigateTo(path, false);
  }

  async waitForAuth() {
    // Si ya hay usuario, continuar
    if (window.currentUser) return true;

    // Si authManager existe, esperar a que se inicialice
    if (window.App?.authManager) {
      return new Promise((resolve) => {
        // Timeout de seguridad (5 segundos máximo)
        const timeout = setTimeout(() => {
          console.warn("Timeout esperando por autenticación");
          resolve(false);
        }, 5000);

        window.App.authManager.onAuthInitialized((user) => {
          clearTimeout(timeout);
          resolve(!!user);
        });
      });
    }

    return false;
  }

  async navigateTo(page, pushState = true) {
    if (!this.routes[page]) {
      console.error("Página no encontrada:", page);
      return;
    }

    if (this.isNavigating) {
      console.log("Navegación en progreso, esperando...");
      return;
    }

    this.isNavigating = true;

    try {
      // Verfificacion para páginas protegidas
      if (this.requiresAuth(page)) {
        console.log("Página protegida detectada:", page);

        // Mostrar Skeleton
        this.showSkeletonLoader(page);

        // Esperar a que AuthManager este inicializado
        if (window.App?.authManager && !window.App.authManager.isInitialized) {
          console.log("⏳ Esperando inicialización de AuthManager...");
          await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              console.warn("Timeout esperando AuthManager");
              resolve();
            }, 5000);

            window.App.authManager.onAuthInitialized((user) => {
              clearTimeout(timeout);
              resolve();
            });
          });
        }

        // Verificar si hay usuario DESPUÉS de la inicialización
        if (!window.currentUser) {
          console.log("Usuario no autenticado");
          this.redirectToHome();
          return;
        }

        // Verificación adicional para admin
        if (page === "admin" && window.currentUser.rol !== "admin") {
          console.log("Sin permisos de admin");
          this.redirectToHome();
          return;
        }

        console.log("Usuario autenticado, cargando contenido real...");
        // Continuar con la carga del contenido real
      } else {
        // Para páginas públicas, mostrar loader normal
        this.showLoader();
      }

      // Cargar contenido real que reemplazara al Skeleton
      const response = await fetch(this.routes[page]);
      const html = await response.text();

      // Actualizar el contenido Principal (Reemplaza el Skeleton)
      document.getElementById("main-content").innerHTML = html;

      // Actualizar estado actual
      this.currentPage = page;

      // Actualizar URL si es necesario
      if (pushState) {
        window.history.pushState({ page }, "", `#${page}`);
      }

      // Actualizar navbar activo
      this.updateActiveNavLink(page);

      // Inicializar componentes específicos de la página
      this.initPageSpecificComponents(page);

      console.log(`Navegado a: ${page}`);
    } catch (error) {
      console.error("Error navegando:", error);
      document.getElementById("main-content").innerHTML = `
        <div class="container py-5">
          <div class="alert alert-danger">
            Error cargando la página. Por favor, intenta nuevamente.
          </div>
        </div>
      `;
    } finally {
      this.isNavigating = false;
    }
  }

  requiresAuth(page) {
    const protectedPages = ["perfil", "reservas", "admin"];
    return protectedPages.includes(page);
  }

  redirectToHome() {
    // Mostrar toast
    if (typeof showToast === "function") {
      showToast("Debes iniciar sesión para acceder a esta página", "warning");
    }

    // Redirigir inmediatamente al home
    setTimeout(() => {
      window.history.replaceState({ page: "home" }, "", "#home");
      this.navigateTo("home", false);
    }, 100);
  }

  handlePopState(event) {
    const page = window.location.hash.replace("#", "") || "home";
    this.navigateTo(page, false);
  }

  updateActiveNavLink(page) {
    // Remover active de todos los links que no estén en dropdown
    document.querySelectorAll("[data-spa-link]").forEach((link) => {
      // Solo remover active de links que no estén dentro de un dropdown-menu
      if (!link.closest(".dropdown-menu")) {
        link.classList.remove("active");
      }
    });

    // Agregar active solo a links que no estén en dropdown
    const currentLink = document.querySelector(
      `[data-spa-link="${page}"]:not(.dropdown-menu [data-spa-link])`
    );
    if (currentLink) {
      currentLink.classList.remove("active");
      currentLink.classList.add("active");
    }
  }

  showSkeletonLoader(page) {
    // Usar el skeleton manager global
    if (
      window.skeletonManager &&
      typeof window.skeletonManager.showSkeleton === "function"
    ) {
      window.skeletonManager.showSkeleton(page);
    } else {
      // Fallback si el skeleton manager no está disponible
      console.warn("SkeletonManager no disponible, usando loader por defecto");
      this.showLoader();
    }
  }

  showLoader() {
    document.getElementById("main-content").innerHTML = `
            <div class="container py-5">
                <div class="text-center">
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-2">Cargando...</p>
                </div>
            </div>
        `;
  }

  hideLoader() {
    // El loader se reemplaza automáticamente con el contenido
  }

  initPageSpecificComponents(page) {
    switch (page) {
      case "servicios":
        this.initServiciosPage();
        break;
      case "home":
        this.initHomePage();
        break;
      case "perfil":
        this.initProfilePage();
        break;
      case "admin":
        this.initAdminPage();
      case "reservas":
        this.initReservasPage();
        break;
      case "productos":
        this.initProductsPage();
        break;
      case "producto-detalle":
        this.initProductDetailPage();
        break;

      // Agregar más casos según sea necesario
    }
  }

  initAdminPage() {
    import("../modules/admin.js")
      .then((module) => {
        const adminManager = module.initAdmin();
        adminManager.loadAdminData();
      })
      .catch((error) => {
        console.error("Error inicializando página de admin:", error);
      });
  }

  initProfilePage() {
    import("../modules/perfil/perfil.js")
      .then((module) => {
        module.initProfilePage();
      })
      .catch((error) => {
        console.error("Error inicializando página de perfil:", error);
      });
  }

  initProductsPage() {
    import("../modules/productos.js")
      .then((module) => {
        module.initProductsPage();
      })
      .catch((error) => {
        console.error("Error inicializando página de productos:", error);
      });
  }

  initProductDetailPage() {
    import("../modules/producto-detalle.js")
      .then((module) => {
        module.initProductDetailPage();
      })
      .catch((error) => {
        console.error("Error inicializando página de detalle de producto:", error);
      });
  }

  initServiciosPage() {
    // Inicializar filtros de servicios
    this.initServiceFilters();

    // Cargar y renderizar servicios desde Supabase
    serviciosManager.renderServicios();

    // Inicializar botones de reserva
    this.initReservaButtons();
  }

  initHomePage() {
    // Inicializar carousel si es necesario
    const carousel = document.getElementById("carouselServicios");
    if (carousel) {
      new bootstrap.Carousel(carousel);
    }
  }

  initServiceFilters() {
    const filterButtons = document.querySelectorAll(".filter-btn");

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const category = button.getAttribute("data-category");

        // Actualizar botón activo
        filterButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        // Filtrar servicios (ahora funciona con carga dinámica)
        const serviceCards = document.querySelectorAll(".service-card");
        serviceCards.forEach((card) => {
          if (
            category === "Todos" ||
            card.getAttribute("data-category") === category
          ) {
            card.parentElement.style.display = "block";
          } else {
            card.parentElement.style.display = "none";
          }
        });
      });
    });
  }

  initReservasPage() {
    import("../modules/reservas.js")
      .then((module) => {
        module.initReservasPage(); // Llama a la función exportada
      })
      .catch((error) => {
        console.error("Error inicializando página de reservas:", error);
      });
  }

  initReservaButtons() {
    // Aquí puedes agregar la lógica para los botones de reserva
    document.addEventListener("click", (e) => {
      if (
        e.target.classList.contains("btn-reservar") ||
        e.target.classList.contains("btn-reservar-grupal")
      ) {
        this.handleReservaClick(e);
      }
    });
  }

  async handleReservaClick(event) {
    const button = event.target.closest("button");
    if (!button) return;

    // --- 1. Verificar autenticación (Tu lógica actual) ---
    if (!window.currentUser) {
      // Mostrar modal de login si no está autenticado
      try {
        const loginModal = new bootstrap.Modal(
          document.getElementById("loginModal")
        );
        loginModal.show();
      } catch (error) {
        console.error("Error al mostrar el modal de login:", error);
      }
      return;
    }

    // --- 2. Obtener datos del servicio (Lógica unificada) ---
    const servicioDataJSON = button.getAttribute("data-servicio");
    const servicioId = button.getAttribute("data-servicio-id");

    let servicioInfo;

    try {
      if (servicioDataJSON) {
        // Caso 1: Botón ESTÁTICO (Yoga, Hidromasaje)
        const data = JSON.parse(servicioDataJSON);
        servicioInfo = {
          id: data.id || `static-${data.title.toLowerCase().replace(" ", "-")}`,
          title: data.title,
          price: parseFloat(data.price),
          duration: data.duration || null,
          isGrupal: true,
        };
      } else if (servicioId) {
        // Caso 2: Botón DINÁMICO (desde Supabase)
        // Usamos el manager para obtener los datos (convirtiendo a NÚMERO)
        const servicioCompleto = serviciosManager.getServicioById(
          Number(servicioId)
        );

        if (!servicioCompleto) {
          console.error("No se encontró el servicio con ID:", servicioId);
          if (typeof showToast === "function") {
            showToast("Error al seleccionar el servicio.", "danger");
          }
          return;
        }

        servicioInfo = {
          id: servicioCompleto.id,
          title: servicioCompleto.title,
          price: parseFloat(servicioCompleto.price),
          duration: servicioCompleto.duration,
          isGrupal: false,
        };
      } else {
        console.error(
          "El botón de reserva no tiene datos (data-servicio o data-servicio-id).",
          button
        );
        return;
      }

      // --- 3. Guardar en localStorage para la página de reserva ---
      localStorage.setItem(
        "servicioParaReservar",
        JSON.stringify(servicioInfo)
      );

      console.log("Servicio guardado para reservar:", servicioInfo);

      // --- 4. Redirigir a la página de reservas ---
      this.navigateTo("reservas");
    } catch (error) {
      console.error("Error en handleReservaClick:", error);
      if (typeof showToast === "function") {
        showToast("Hubo un problema al procesar la reserva.", "danger");
      }
    }
  }
}
