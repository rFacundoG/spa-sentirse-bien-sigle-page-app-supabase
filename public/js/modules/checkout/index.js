// public/js/modules/checkout/index.js

// 1. IMPORTAR TODOS LOS MÓDULOS
import * as ui from "./ui.js";
import * as api from "./api.js";
import { ReservationContext } from "./context.js";
import {
  DebitCardStrategy,
  CashStrategy,
  NoDiscountStrategy,
} from "../payment/strategies.js";

// 2. DEFINIR EL ESTADO DE LA PÁGINA
let cartItems = []; // Solo para el carrito de servicios
let reservationContext; // El "contexto" que maneja el Patrón Strategy

/**
 * FUNCIÓN PRINCIPAL (Llamada por el Router)
 * Orquesta la inicialización de la página de checkout.
 */
export function initCheckoutPage() {
  // 1. Cargar el carrito de SERVICIOS
  const carritoJSON = localStorage.getItem("carritoServicios");
  cartItems = carritoJSON ? JSON.parse(carritoJSON) : [];

  // 2. Renderizar el carrito en la UI y obtener el subtotal
  // (ui.renderCartItems ahora apunta a '#servicios-items-container')
  const subtotal = ui.renderCartItems(cartItems);

  // 3. Crear el Contexto de Descuento con el subtotal
  reservationContext = new ReservationContext(subtotal);

  // 4. Calcular y mostrar los totales iniciales (con 'NoDiscountStrategy')
  updateTotals();

  // 5. Configurar los event listeners
  setupListeners();

  // 6. Validar el estado inicial
  const { delivery_method, payment_method } = ui.getFormValues();
  ui.validateBusinessRules(payment_method, delivery_method);
}

/**
 * Configura los listeners para los inputs y el botón de confirmar.
 */
function setupListeners() {
  // Escuchar cambios en CUALQUIER radio de pago (ya no escucha 'delivery')
  const radioInputs = document.querySelectorAll(
    '#servicios-pane input[name="payment"]'
  );
  radioInputs.forEach((input) => {
    input.addEventListener("change", handleFormChange);
  });

  // Escuchar el clic en el botón de confirmar
  const confirmButton = document.getElementById("btn-confirmar-reserva");
  confirmButton.addEventListener("click", handleConfirmBooking);
}

/**
 * Se dispara CADA VEZ que el usuario cambia una opción de PAGO.
 */
function handleFormChange() {
  const { delivery_method, payment_method } = ui.getFormValues();

  // 1. Validar reglas de negocio
  // (ui.js sabe que 'delivery_method' siempre es 'in_spa')
  ui.validateBusinessRules(payment_method, delivery_method);

  // 2. Actualizar la Estrategia de Descuento
  if (payment_method === "debit_card") {
    reservationContext.setStrategy(new DebitCardStrategy());
  } else if (payment_method === "cash") {
    reservationContext.setStrategy(new CashStrategy());
  } else {
    reservationContext.setStrategy(new NoDiscountStrategy());
  }

  // 3. Recalcular y mostrar el total
  updateTotals();
}

/**
 * Recalcula y actualiza la UI con los totales (Subtotal, Descuento, Total).
 */
function updateTotals() {
  const subtotal = reservationContext.subtotal;
  const { discountAmount, newTotal } = reservationContext.calculateTotal();

  ui.updateTotalsUI({
    subtotal: subtotal,
    discountAmount: discountAmount,
    newTotal: newTotal,
  });
}

/**
 * Maneja el clic final en "Confirmar Reserva".
 */
async function handleConfirmBooking() {
  const { delivery_method, payment_method } = ui.getFormValues();

  // 1. Validar por última vez
  if (!ui.validateBusinessRules(payment_method, delivery_method)) {
    showSafeToast("Por favor, corrige los errores en tu pedido.", "danger");
    return;
  }

  // 2. Verificar autenticación
  if (!window.currentUser) {
    showSafeToast("Debes iniciar sesión para reservar.", "warning");
    return;
  }

  const { discountAmount, newTotal } = reservationContext.calculateTotal();

  // 3. Preparar el objeto para la API
  const bookingData = {
    user_id: window.currentUser.id,
    subtotal: reservationContext.subtotal,
    discount_applied: discountAmount,
    total_price: newTotal,
    payment_method: payment_method,
    delivery_method: delivery_method, // ui.getFormValues() leerá 'in_spa' del input oculto
  };

  try {
    const confirmBtn = document.getElementById("btn-confirmar-reserva");
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = "Procesando..."; // Feedback visual

    // 4. Llamar a la API (solo pasamos el carrito de SERVICIOS)
    const result = await api.saveBooking(bookingData, cartItems);

    if (result.success) {
      showSafeToast("¡Reserva creada con éxito!", "success");
      // 5. Limpiar el carrito de SERVICIOS y redirigir
      localStorage.removeItem("carritoServicios");
      window.location.hash = "#home"; // Usamos hash para el router
    } else {
      throw new Error("La API de guardado no tuvo éxito.");
    }
  } catch (error) {
    console.error("Error al confirmar la reserva:", error);
    showSafeToast("Error al procesar tu reserva. Intenta de nuevo.", "danger");

    const confirmBtn = document.getElementById("btn-confirmar-reserva");
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = "Confirmar Reserva";
  }
}

/**
 * Función helper para mostrar notificaciones (toast) de forma segura.
 */
function showSafeToast(message, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    // Fallback si la función global no existe
    alert(message);
  }
}
