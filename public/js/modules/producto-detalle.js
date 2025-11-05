import { supabase } from '../core/supabase.js';

export async function initProductDetailPage() {
  const container = document.getElementById('product-detail-container');
  const loader = document.getElementById('product-detail-loader');

  // 1. Obtener el ID del producto desde localStorage
  const productId = localStorage.getItem('selectedProductId');

  if (!productId) {
    console.error("No se encontró ID de producto.");
    container.innerHTML = `<div class="alert alert-danger">No se pudo cargar el producto. Por favor, <a href="#productos" data-spa-link="productos">vuelve a la lista</a>.</div>`;
    return;
  }

  try {
    // 2. Buscar el producto en Supabase
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single(); // .single() espera un solo resultado

    if (error) throw error;
    if (!product) throw new Error("Producto no encontrado.");

    // 3. Ocultar loader y renderizar el producto
    loader.classList.add('d-none');
    container.innerHTML = renderProductDetails(product);

  } catch (error) {
    console.error("Error al cargar detalle de producto:", error);
    loader.classList.add('d-none');
    container.innerHTML = `<div class="alert alert-danger">Error: ${error.message}. Por favor, <a href="#productos" data-spa-link="productos">vuelve a la lista</a>.</div>`;
  }
}

/**
 * Genera el HTML para la vista de detalle
 */
function renderProductDetails(product) {
  const imageUrl = product.image_url || './assets/img/default-service.webp';

  return `
    <div class="col-md-6">
      <img src="${imageUrl}" class="img-fluid rounded" alt="${product.name}">
    </div>

    <div class="col-md-6">
      <h2>${product.name}</h2>
      
      <h4 class="text-success my-3">$${product.price}</h4>
      
      <p class="lead">${product.description || 'Sin descripción.'}</p>
      
      <hr>
      
      <h5>Detalles</h5>
      <p>${product.long_description || 'No hay detalles adicionales.'}</p>

      <ul class="list-group list-group-flush">
        <li class="list-group-item"><strong>Tipo:</strong> ${product.type || 'N/A'}</li>
        <li class="list-group-item"><strong>Categoría:</strong> ${product.category || 'N/A'}</li>
        <li class="list-group-item"><strong>Stock:</strong> ${product.stock} disponibles</li>
      </ul>

      <div class="d-grid gap-2 mt-4">
        <button class="btn btn-primary btn-lg btn-add-to-cart-detail" data-product-id="${product.id}">
          <i class="bi bi-cart-plus"></i> Agregar al Carrito
        </button>
      </div>
    </div>
  `;
}