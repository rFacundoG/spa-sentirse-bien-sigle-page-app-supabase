// public/js/modules/checkout/ui.js

/**
 * Renderiza los items del carrito de SERVICIOS en el contenedor.
 * @param {Array} cartItems - El array de 'carritoServicios'.
 * @returns {number} - El subtotal calculado.
 */
export function renderCartItems(cartItems) {
  // Apunta al nuevo ID dentro de la pestaña de servicios
  const containerId = "servicios-items-container";
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`Contenedor UI no encontrado: ${containerId}`);
    return 0;
  }

  container.innerHTML = ""; // Limpiar
  let subtotal = 0;

  if (!cartItems || cartItems.length === 0) {
    container.innerHTML = '<p class="text-muted">Tu carrito de reservas está vacío.</p>';
    document.getElementById("btn-confirmar-reserva").disabled = true;
    return 0;
  }

  cartItems.forEach(item => {
    const itemPrice = parseFloat(item.price);
    if (isNaN(itemPrice)) return;

    container.innerHTML += `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="text-truncate" style="max-width: 65%;">${item.title}</span>
        <div class="d-flex align-items-center">
          <span class="fw-bold me-3">${formatPrice(itemPrice)}</span>
          <button class="btn btn-sm btn-outline-danger btn-remove-item" data-item-id="${item.id}">
            <i class="bi bi-trash" style="pointer-events: none;"></i>
          </button>
        </div>
      </div>
    `;
    subtotal += itemPrice;
  });

  return subtotal;
}

/**
 * Actualiza los campos de Subtotal, Descuento y Total en el DOM.
 * @param {object} summary - Un objeto con { subtotal, discountAmount, newTotal }.
 */
export function updateTotalsUI(summary) {
  document.getElementById("resumen-subtotal").textContent = formatPrice(summary.subtotal);
  document.getElementById("resumen-descuento").textContent = `-${formatPrice(summary.discountAmount)}`;
  document.getElementById("resumen-total").textContent = formatPrice(summary.newTotal);
}

/**
 * Lee los valores actuales de los inputs del formulario (radios).
 * (Se asegura de leer los radios de la pestaña de servicios)
 * @returns {{delivery_method: string, payment_method: string}}
 */
export function getFormValues() {
  const delivery_method = document.querySelector('#servicios-pane input[name="delivery"]:checked')?.value;
  const payment_method = document.querySelector('#servicios-pane input[name="payment"]:checked')?.value;
  return { delivery_method, payment_method };
}

/**
 * Valida las reglas de negocio y actualiza la UI (alerta y botón).
 * @param {string} payment_method - El método de pago seleccionado.
 * @param {string} delivery_method - El método de entrega seleccionado.
 * @returns {boolean} - True si es válido, False si hay un error.
 */
export function validateBusinessRules(payment_method, delivery_method) {
  const alertBox = document.getElementById("reserva-reglas-alert");
  const confirmBtn = document.getElementById("btn-confirmar-reserva");


  // Regla 2: Se debe seleccionar un método de pago
  if (!payment_method) {
     alertBox.innerHTML = '<i class="bi bi-info-circle-fill me-2"></i>Por favor, selecciona un método de pago.';
     alertBox.classList.remove('alert-danger');
     alertBox.classList.add('alert-info');
     confirmBtn.disabled = true;
     return false; // Regla fallida
  }

  // Si todo está bien
  alertBox.innerHTML = '<i class="bi bi-info-circle-fill me-2"></i>Todo listo para confirmar tu reserva.';
  alertBox.classList.remove('alert-danger');
  alertBox.classList.add('alert-info');
  confirmBtn.disabled = false;
  return true; // Válido
}

// --- Función Helper ---
/**
 * Formatea un número al estilo de moneda COP.
 * @param {number} price - El precio a formatear.
 * @returns {string} - El precio formateado (ej. "$50.000").
 */
function formatPrice(price) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}