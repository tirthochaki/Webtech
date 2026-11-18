function publicProduct(product) {
  const business = byId(db.businesses, product.businessId);
  return !product.deleted && business && business.status === "Approved";
}

function productCard(product) {
  return '<article class="panel product-card">' + (imageTag(product.image, product.name) ||
    '<div class="product-placeholder">' + safe(product.category) + '</div>') + '<div class="product-copy"><h2>' +
    safe(product.name) + '</h2><p class="price">' + cash(product.price) + '</p><p class="muted">' +
    (product.available && product.stock ? product.stock + " in stock" : "Unavailable") +
    '</p><a href="product.html?id=' + product.id + '">View product</a></div></article>';
}

function fillCategories(field, names, blank) {
  fillSelect(field, [...new Set(names)].map(name => ({ id: name, name })), blank);
}

if (pageName === "shop") {
  const form = get("shop-filter");
  const output = get("products-list");
  fillCategories(get("category"), db.productCategories, "All categories");
  form.addEventListener("submit", function (event) { event.preventDefault(); showProducts(); });
  get("category").addEventListener("change", showProducts);
  get("in-stock").addEventListener("change", showProducts);
  showProducts();

  function showProducts() {
    const query = textValue(form, "q").toLowerCase();
    const category = get("category").value;
    const max = get("max").value;
    const products = db.products.filter(function (product) {
      return publicProduct(product) && (product.name + " " + product.description).toLowerCase().includes(query) &&
        (!category || product.category === category) && (max === "" || product.price <= Number(max)) &&
        (!get("in-stock").checked || (product.available && product.stock > 0));
    });
    output.innerHTML = products.map(productCard).join("");
    if (!products.length) showEmpty(output, "No products match these filters.");
  }
}

if (pageName === "product") {
  const product = byId(db.products, params.get("id"));
  const output = get("product-detail");
  if (!product || !publicProduct(product)) {
    showEmpty(output, "This product is unavailable.");
  } else {
    const business = byId(db.businesses, product.businessId);
    const form = get("add-form");
    const ready = product.available && product.stock > 0;
    document.querySelector("h1").textContent = product.name;
    get("product-photo").innerHTML = imageTag(product.image, product.name);
    output.innerHTML = '<p class="muted">' + safe(product.category) + '</p><p class="body-copy">' +
      safe(product.description) + '</p><p><a href="business.html?id=' + business.id + '">' + safe(business.name) +
      '</a></p><p class="price">' + cash(product.price) + '</p><p>' + (ready ? product.stock + " in stock" : "Unavailable") + '</p>';
    get("cart-signin").hidden = !ready || (user && user.role === "community");
    form.hidden = !ready || !user || user.role !== "community";
    get("quantity").max = product.stock;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!user || user.role !== "community" || !ready) return;
      const quantity = Number(get("quantity").value);
      const cart = db.carts[user.id] || [];
      const entry = cart.find(item => item.productId === product.id);
      const total = quantity + (entry ? entry.quantity : 0);
      if (!Number.isInteger(quantity) || quantity < 1 || total > product.stock) {
        return statusMessage(form, "Your cart quantity would exceed current stock.", true);
      }
      if (entry) entry.quantity = total;
      else cart.push({ productId: product.id, quantity });
      db.carts[user.id] = cart;
      if (saveData(form)) location.href = "cart.html";
    });
  }
}

if (pageName === "businesses") {
  const form = get("directory-filter");
  const output = get("business-list");
  fillCategories(get("category"), db.businesses.filter(b => b.status === "Approved").map(b => b.category), "All categories");
  form.addEventListener("submit", function (event) { event.preventDefault(); showBusinesses(); });
  get("category").addEventListener("change", showBusinesses);
  showBusinesses();

  function showBusinesses() {
    const query = textValue(form, "q").toLowerCase();
    const category = get("category").value;
    const businesses = db.businesses.filter(function (business) {
      return business.status === "Approved" && (!category || business.category === category) &&
        (business.name + " " + business.address).toLowerCase().includes(query);
    });
    output.innerHTML = businesses.map(function (business) {
      return '<article class="panel"><div class="business-heading">' + imageTag(business.logo, business.name + " logo", "business-logo") +
        '<h2><a href="business.html?id=' + business.id + '">' + safe(business.name) + '</a></h2></div><p>' +
        safe(business.description) + '</p><p class="muted">' + safe(business.category + " · " + business.address) + "</p></article>";
    }).join("");
    if (!businesses.length) showEmpty(output, "No businesses match these filters.");
  }
}

if (pageName === "business") {
  const business = byId(db.businesses, params.get("id"));
  const output = get("business-detail");
  if (!business || business.status !== "Approved") {
    showEmpty(output, "This business is unavailable.");
  } else {
    document.querySelector("h1").textContent = business.name;
    output.innerHTML = imageTag(business.logo, business.name + " logo", "business-logo") + '<p class="pill">' +
      safe(business.category) + '</p><p class="body-copy">' + safe(business.description) + '</p><p>' +
      safe(business.address) + '</p><p>' + safe(business.hours) + '</p><p>' + safe(business.phone) + '</p>';
    const products = db.products.filter(p => p.businessId === business.id && publicProduct(p));
    if (products.length) get("business-products").innerHTML = products.map(productCard).join("");
    else showEmpty(get("business-products"), "This business has no listed products.");
  }
}
