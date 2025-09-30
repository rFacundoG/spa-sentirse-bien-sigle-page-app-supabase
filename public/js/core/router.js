import { serviciosManager } from "../modules/servicios.js";

export class Router {
  constructor() {
    this.routes = {
      home: "./pages/home.html",
      servicios: "./pages/servicios.html",
      contacto: "./pages/contacto.html",
      productos: "./pages/productos.html",
    };
    this.currentPage = "home";
  }

  init() {
    // Cargar página inicial basada en la URL
    const path = window.location.hash.replace("#", "") || "home";
    this.navigateTo(path, false);
  }

  async navigateTo(page, pushState = true) {
    if (!this.routes[page]) {
      console.error("Página no encontrada:", page);
      return;
    }

    try {
      // Mostrar loader
      this.showLoader();

      // Cargar contenido de la página
      const response = await fetch(this.routes[page]);
      const html = await response.text();

      // Actualizar el contenido principal
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
      this.hideLoader();
    }
  }

  handlePopState(event) {
    const page = window.location.hash.replace("#", "") || "home";
    this.navigateTo(page, false);
  }

  updateActiveNavLink(page) {
    // Remover active de todos los links
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });

    // Agregar active al link actual
    const currentLink = document.querySelector(`[data-spa-link="${page}"]`);
    if (currentLink) {
      currentLink.classList.add("active");
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
      // Agregar más casos según sea necesario
    }
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

  handleReservaClick(event) {
    // Verificar si el usuario está autenticado
    if (!window.currentUser) {
      // Mostrar modal de login si no está autenticado
      const loginModal = new bootstrap.Modal(
        document.getElementById("loginModal")
      );
      loginModal.show();
      return;
    }

    // Lógica para reservas
    const button = event.target.closest("button");
    const servicioData = button.getAttribute("data-servicio");

    if (servicioData) {
      const servicio = JSON.parse(servicioData);
      console.log("Reservando:", servicio);
      // Aquí puedes redirigir a una página de reserva o mostrar un modal
    }
  }
}
