// public/js/modules/checkout/index.js

import * as ui from "./ui.js";
import * as api from "./api.js";
import { ReservationContext } from "./context.js";
import {
  DebitCardStrategy,
  CashStrategy,
  NoDiscountStrategy,
} from "../payment/strategies.js";

let cartItems = [];
let reservationContext;

/**
 * FUNCIÓN PRINCIPAL (Llamada por el Router)
 */
export function initCheckoutPage() {
  const carritoJSON = localStorage.getItem("carritoServicios");
  cartItems = carritoJSON ? JSON.parse(carritoJSON) : [];

  // 1. Crear el Contexto (se crea una sola vez)
  reservationContext = new ReservationContext(0); // Inicia en 0

  // 2. Configurar listeners (incluyendo el de eliminar)
  setupListeners();

  // 3. Renderizar y validar el estado inicial
  refreshCheckoutState();
}

/**
 * NUEVA: Configura todos los listeners de la página.
 */
function setupListeners() {
  // Listener para radios de pago
  const radioInputs = document.querySelectorAll(
    '#servicios-pane input[name="payment"]'
  );
  radioInputs.forEach((input) => {
    input.addEventListener("change", handleFormChange);
  });

  // Listener para el botón de confirmar
  const confirmButton = document.getElementById("btn-confirmar-reserva");
  confirmButton.addEventListener("click", handleConfirmBooking);

  // NUEVO: Listener para los botones de eliminar (usando delegación)
  const itemsContainer = document.getElementById("servicios-items-container");
  if (itemsContainer) {
    itemsContainer.addEventListener("click", handleRemoveItemClick);
  }
}

/**
 * NUEVA: Se dispara al hacer clic en el contenedor de items.
 */
function handleRemoveItemClick(event) {
  const deleteButton = event.target.closest(".btn-remove-item");
  if (!deleteButton) return; // No se hizo clic en un botón de borrar

  const itemId = deleteButton.getAttribute("data-item-id");

  // 1. Filtrar el array local (convertir a string para comparación segura)
  cartItems = cartItems.filter(
    (item) => item.id.toString() !== itemId.toString()
  );

  // 2. Actualizar localStorage
  localStorage.setItem("carritoServicios", JSON.stringify(cartItems));

  // 3. Refrescar toda la UI de la página
  refreshCheckoutState();
  showSafeToast("Servicio eliminado del carrito", "info");
}

/**
 * NUEVA: Función central que actualiza toda la UI.
 */
function refreshCheckoutState() {
  // 1. Renderizar carrito y obtener nuevo subtotal
  const subtotal = ui.renderCartItems(cartItems);

  // 2. Actualizar el subtotal en el contexto
  reservationContext.subtotal = subtotal;

  // 3. Recalcular y mostrar totales
  updateTotals();

  // 4. Re-validar las reglas (habilita/deshabilita confirmar)
  const { delivery_method, payment_method } = ui.getFormValues();
  ui.validateBusinessRules(payment_method, delivery_method);
}

/**
 * (Simplificada) Se dispara al cambiar el método de pago.
 */
function handleFormChange() {
  const { delivery_method, payment_method } = ui.getFormValues();
  ui.validateBusinessRules(payment_method, delivery_method);

  // Actualizar la Estrategia de Descuento
  if (payment_method === "debit_card") {
    reservationContext.setStrategy(new DebitCardStrategy());
  } else if (payment_method === "cash") {
    reservationContext.setStrategy(new CashStrategy());
  } else {
    reservationContext.setStrategy(new NoDiscountStrategy());
  }

  updateTotals();
}

/**
 * (Sin cambios) Recalcula y actualiza la UI con los totales.
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
 * (Sin cambios) Maneja el clic final en "Confirmar Reserva".
 */
async function handleConfirmBooking() {
  
  if (cartItems.length === 0) {
    showSafeToast(
      "Tu carrito está vacío. Añade un servicio para reservar.",
      "warning"
    );
    return; // Detiene la ejecución
  }

  const { delivery_method, payment_method } = ui.getFormValues();

  if (!ui.validateBusinessRules(payment_method, delivery_method)) {
    showSafeToast("Por favor, corrige los errores en tu pedido.", "danger");
    return;
  }

  if (!window.currentUser) {
    showSafeToast("Debes iniciar sesión para reservar.", "warning");
    return;
  }

  const { discountAmount, newTotal } = reservationContext.calculateTotal();

  const bookingData = {
    user_id: window.currentUser.id,
    subtotal: reservationContext.subtotal,
    discount_applied: discountAmount,
    total_price: newTotal,
    payment_method: payment_method,
    delivery_method: delivery_method,
  };

  try {
    const confirmBtn = document.getElementById("btn-confirmar-reserva");
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = "Procesando...";

    const result = await api.saveBooking(bookingData, cartItems);

    if (result.success) {
      showSafeToast("¡Reserva creada con éxito!", "success");
      localStorage.removeItem("carritoServicios");
      window.location.hash = "#home";
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
 * (Sin cambios) Función helper para mostrar notificaciones (toast) de forma segura.
 */
function showSafeToast(message, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}
