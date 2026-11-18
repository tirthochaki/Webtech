if (pageAllowed) {
  const cart = db.carts[user.id] || [];
  const output = get("cart-list");
  const checkout = get("checkout");
  const form = get("checkout-form");

  function canOrder(product, quantity) {
    const business = product && byId(db.businesses, product.businessId);
    return product && !product.deleted && product.available && product.stock >= quantity &&
      Number.isInteger(quantity) && quantity > 0 && business && business.status === "Approved";
  }

  function drawCart() {
    let total = 0;
    let valid = cart.length > 0;
    output.innerHTML = "";
    for (const item of cart) {
      const product = byId(db.products, item.productId);
      const okay = canOrder(product, item.quantity);
      if (!okay) valid = false;
      if (product) total += item.quantity * product.price;
      const article = document.createElement("article");
      article.className = "panel cart-row";
      article.innerHTML = '<div><h2>' + safe(product ? product.name : "Unavailable product") + '</h2><p class="muted">' +
        (okay ? cash(product.price) + " each" : "Unavailable or above current stock") + '</p></div><div class="actions">' +
        '<label>Quantity <input type="number" min="1" step="1" aria-label="Quantity" value="' + item.quantity +
        '"></label><button class="btn small danger" type="button">Remove</button></div>';
      article.querySelector("input").addEventListener("change", function () {
        const quantity = Number(this.value);
        if (!canOrder(product, quantity)) {
          this.value = item.quantity;
          return statusMessage(article, "Choose a quantity within available stock.", true);
        }
        item.quantity = quantity;
        if (saveData(article)) drawCart();
        else location.reload();
      });
      article.querySelector("button").addEventListener("click", function () {
        cart.splice(cart.indexOf(item), 1);
        if (saveData(article)) drawCart();
        else location.reload();
      });
      output.append(article);
    }
    if (!cart.length) showEmpty(output, "Your cart is empty.");
    checkout.hidden = !cart.length;
    get("cart-total").textContent = "Cart total " + cash(total);
    form.querySelector('[type="submit"]').disabled = !valid;
    statusMessage(form, cart.length && !valid ? "Update or remove unavailable items before placing the order." : "", !valid);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const address = textValue(form, "address");
    if (!address) return statusMessage(form, "Enter pickup or delivery instructions.", true);
    db = loadData();
    const savedCart = db.carts[user.id] || [];
    if (!savedCart.length || !savedCart.every(item => canOrder(byId(db.products, item.productId), item.quantity))) {
      return statusMessage(form, "Availability changed. Reopen the cart and check the quantities.", true);
    }
    const ordersByBusiness = {};
    for (const item of savedCart) {
      const product = byId(db.products, item.productId);
      if (!ordersByBusiness[product.businessId]) {
        const order = { id: nextId(db.orders), userId: user.id, businessId: product.businessId, items: [],
          status: "Pending", address, createdAt: new Date().toLocaleDateString("en-GB") };
        ordersByBusiness[product.businessId] = order;
        db.orders.unshift(order);
      }
      ordersByBusiness[product.businessId].items.push({ productId: product.id, name: product.name, price: product.price, quantity: item.quantity });
      product.stock -= item.quantity;
    }
    db.carts[user.id] = [];
    if (saveData(form)) location.href = "orders.html";
  });
  drawCart();
}
