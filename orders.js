if (pageAllowed) {
  const sellerView = pageName === "sales";
  const output = get("order-list");
  const orders = db.orders.filter(function (order) {
    const business = byId(db.businesses, order.businessId);
    return sellerView ? business && business.ownerId === user.id : order.userId === user.id;
  });
  const statusFilter = get("status");
  if (sellerView) {
    const completed = orders.filter(order => order.status === "Completed");
    const sales = completed.reduce((total, order) => total + orderTotal(order), 0);
    get("sales-summary").textContent = completed.length + " completed orders · " + cash(sales) + " in demo sales";
    statusFilter.addEventListener("change", showOrders);
  }

  function orderTotal(order) {
    return order.items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  function showOrders() {
    output.innerHTML = "";
    for (const order of orders) {
      if (sellerView && statusFilter.value !== "All statuses" && order.status !== statusFilter.value) continue;
      const business = byId(db.businesses, order.businessId);
      const card = document.createElement("article");
      card.className = "panel";
      card.innerHTML = "<h2>Order #" + order.id + '</h2><p class="muted">' +
        safe(sellerView ? person(order.userId) : business ? business.name : "Former business") + " · " + safe(order.createdAt) +
        '</p><p class="pill">' + safe(order.status) + '</p><p>' + safe(order.address) + '</p>' +
        order.items.map(item => '<div class="line-item"><span>' + safe(item.name) + " × " + item.quantity + "</span><strong>" +
          cash(item.price * item.quantity) + "</strong></div>").join("") + '<p class="price">' + cash(orderTotal(order)) + "</p>";
      if (sellerView) addStatusButtons(card, order);
      output.append(card);
    }
    if (!output.children.length) showEmpty(output, "No orders to show.");
  }

  function addStatusButtons(card, order) {
    const next = { Pending: ["Confirmed", "Cancelled"], Confirmed: ["Completed", "Cancelled"] };
    for (const status of next[order.status] || []) {
      const button = document.createElement("button");
      button.className = "btn secondary small order-status";
      button.textContent = { Confirmed: "Confirm order", Completed: "Mark completed", Cancelled: "Cancel order" }[status];
      button.addEventListener("click", function () {
        if (status === "Cancelled" && !confirm("Cancel this demo order and return its stock?")) return;
        db = loadData();
        const saved = byId(db.orders, order.id);
        if (!saved || !(next[saved.status] || []).includes(status)) {
          return statusMessage(card, "The order status changed. Refresh to view it.", true);
        }
        saved.status = status;
        if (status === "Cancelled") {
          for (const item of saved.items) {
            const product = byId(db.products, item.productId);
            if (product) product.stock += item.quantity;
          }
        }
        if (saveData(card)) location.reload();
      });
      card.append(button, " ");
    }
  }
  showOrders();
}
